import { useSyncExternalStore } from "react";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { t } from "../i18n";
import { mergeStates } from "./merge";
import { apiUrl, isNative, platform, readDurable, writeDurable } from "./platform";
import { getState, parseState, replaceState, subscribe } from "./store";

export type Provider = "password" | "google" | "apple";

export interface AccountUser {
  id: string;
  email: string | null;
  name: string | null;
  providers: Provider[];
  hasPassword: boolean;
}

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";

interface AccountState {
  token: string | null;
  user: AccountUser | null;
  /** Chose "Continue without an account" on the welcome screen. */
  guest: boolean;
  /** Last server version this device has merged. */
  version: number;
  lastSyncedAt: number | null;
  status: SyncStatus;
}

const KEY = "calories-detector:account";
let account: AccountState = load();
const listeners = new Set<() => void>();

function load(): AccountState {
  const blank: AccountState = { token: null, user: null, guest: false, version: 0, lastSyncedAt: null, status: "idle" };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...blank, ...JSON.parse(raw), status: "idle" } : blank;
  } catch {
    return blank;
  }
}

function set(patch: Partial<AccountState>) {
  account = { ...account, ...patch };
  const { status: _status, ...persisted } = account;
  const json = JSON.stringify(persisted);
  try {
    localStorage.setItem(KEY, json);
  } catch {
    /* ignore */
  }
  writeDurable(KEY, json);
  listeners.forEach((l) => l());
}

export function useAccount() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => account,
  );
}

export const getAccount = () => account;

export async function hydrateAccount() {
  const durable = await readDurable(KEY).catch(() => null);
  if (durable) {
    try {
      account = { ...account, ...JSON.parse(durable), status: "idle" };
    } catch {
      /* ignore */
    }
  }
}

// ── API ──────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method,
      headers: { "Content-Type": "application/json", ...(account.token ? { Authorization: `Bearer ${account.token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, t("You're offline. Check your connection and try again."));
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(res.status, (data.error as string) ?? t("Something went wrong ({status}).", { status: res.status }), data);
  return data as T;
}

interface AuthConfig {
  google: boolean;
  apple: boolean;
  googleWebClientId?: string;
  googleIosClientId?: string;
  appleServiceId?: string;
  appleRedirectUrl?: string;
}
let configPromise: Promise<AuthConfig> | null = null;
export function authConfig() {
  configPromise ??= api<AuthConfig>("GET", "/api/auth/config").catch((e) => {
    configPromise = null;
    throw e;
  });
  return configPromise;
}

// ── Sign in / out ────────────────────────────────────────

async function completeSignIn(res: { token: string; user: AccountUser }) {
  set({ token: res.token, user: res.user, guest: false, version: 0, lastSyncedAt: null });
  // Bring this phone's data and the account's data together, then keep them in step.
  await pull();
  startSync();
}

export async function register(email: string, password: string, name: string) {
  await completeSignIn(await api("POST", "/api/auth/register", { email, password, name }));
}

export async function logIn(email: string, password: string) {
  await completeSignIn(await api("POST", "/api/auth/login", { email, password }));
}

let socialReady: Promise<void> | null = null;

/** Native Google/Apple sheet on iOS and Android, popup on the web. Returns false if the user cancels. */
export async function signInWith(provider: "google" | "apple"): Promise<boolean> {
  const cfg = await authConfig();
  const label = provider === "google" ? "Google" : "Apple";
  const appleAvailable = cfg.apple && (platform === "ios" || !!cfg.appleRedirectUrl);
  if ((provider === "google" && !cfg.google) || (provider === "apple" && !appleAvailable)) {
    throw new Error(t("{provider} sign-in isn't set up on this server yet. Use email for now.", { provider: label }));
  }
  socialReady ??= SocialLogin.initialize({
    google: cfg.google ? { webClientId: cfg.googleWebClientId, iOSClientId: cfg.googleIosClientId, mode: "online" } : undefined,
    apple: cfg.apple ? { clientId: cfg.appleServiceId, redirectUrl: platform === "ios" ? "" : cfg.appleRedirectUrl } : undefined,
  }).catch((e) => {
    socialReady = null;
    throw e;
  });
  await socialReady;

  let idToken: string | null = null;
  let name: string | undefined;
  try {
    if (provider === "google") {
      const r = await SocialLogin.login({ provider: "google", options: { scopes: ["email", "profile"] } });
      if (r.result.responseType === "online") idToken = r.result.idToken;
    } else {
      const r = await SocialLogin.login({ provider: "apple", options: { scopes: ["email", "name"] } });
      idToken = r.result.idToken;
      name = [r.result.profile.givenName, r.result.profile.familyName].filter(Boolean).join(" ") || undefined;
    }
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "USER_CANCELLED" || /cancel/i.test(err.message ?? "")) return false;
    throw new Error(t("Couldn't sign in with {provider}. Please try again.", { provider: label }));
  }
  if (!idToken) throw new Error(t("{provider} didn't return a sign-in token. Please try again.", { provider: label }));
  await completeSignIn(await api("POST", `/api/auth/${provider}`, { idToken, name }));
  return true;
}

export function continueAsGuest() {
  set({ guest: true });
}

/** Signs out on this device. The data stays here and in the account. */
export async function signOut() {
  stopSync();
  await api("POST", "/api/auth/logout").catch(() => {});
  if (isNative) SocialLogin.logout({ provider: "google" }).catch(() => {});
  set({ token: null, user: null, version: 0, lastSyncedAt: null, status: "idle" });
}

/** Deletes the account and everything stored on the server. Data on this phone is kept. */
export async function deleteAccount() {
  await api("DELETE", "/api/auth/me");
  stopSync();
  set({ token: null, user: null, version: 0, lastSyncedAt: null, status: "idle", guest: true });
}

// ── Sync ─────────────────────────────────────────────────

interface Remote {
  version: number;
  data: unknown;
}

let unsubscribe: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let lastSent = "";
let busy = false;
let again = false;

function adopt(remote: Remote) {
  const parsed = remote.data ? parseState(JSON.stringify(remote.data)) : null;
  if (parsed) {
    const merged = mergeStates(getState(), parsed);
    if (JSON.stringify(merged) !== JSON.stringify(getState())) replaceState(merged);
    lastSent = JSON.stringify(parsed);
  }
  set({ version: remote.version });
}

async function pull() {
  if (!account.token) return;
  set({ status: "syncing" });
  try {
    adopt(await api<Remote>("GET", "/api/data"));
    await push();
  } catch (e) {
    handleError(e);
  }
}

async function push() {
  if (!account.token) return;
  if (busy) {
    again = true;
    return;
  }
  busy = true;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const json = JSON.stringify(getState());
      if (json === lastSent) break;
      set({ status: "syncing" });
      try {
        const saved = await api<Remote>("PUT", "/api/data", { baseVersion: account.version, data: getState() });
        lastSent = json;
        set({ version: saved.version });
        break;
      } catch (e) {
        // Another device synced first: merge its copy into ours and try again.
        if (e instanceof ApiError && e.status === 409) adopt(e.body as unknown as Remote);
        else throw e;
      }
    }
    set({ status: "synced", lastSyncedAt: Date.now() });
  } catch (e) {
    handleError(e);
  } finally {
    busy = false;
    if (again) {
      again = false;
      schedulePush(500);
    }
  }
}

function handleError(e: unknown) {
  if (e instanceof ApiError && e.status === 401) {
    // Session expired or revoked elsewhere: keep the data, ask to sign in again.
    stopSync();
    set({ token: null, user: null, version: 0, status: "idle" });
    return;
  }
  set({ status: e instanceof ApiError && e.status === 0 ? "offline" : "error" });
}

function schedulePush(delay = 1500) {
  clearTimeout(timer);
  timer = setTimeout(() => void push(), delay);
}

const onForeground = () => {
  if (document.visibilityState === "visible") void pull();
};
const onOnline = () => void pull();

export function startSync() {
  if (!account.token || unsubscribe) return;
  unsubscribe = subscribe(() => schedulePush());
  document.addEventListener("visibilitychange", onForeground);
  window.addEventListener("online", onOnline);
}

function stopSync() {
  unsubscribe?.();
  unsubscribe = null;
  clearTimeout(timer);
  lastSent = "";
  document.removeEventListener("visibilitychange", onForeground);
  window.removeEventListener("online", onOnline);
}

/** Called once at startup for a signed-in user. */
export function resumeSync() {
  if (!account.token) return;
  startSync();
  void pull();
}

/** Push a reset (Delete all data) straight to the cloud so other phones see it too. */
export function syncNow() {
  void push();
}
