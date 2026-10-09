import { useSyncExternalStore } from "react";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { t } from "../i18n";
import { mergeStates } from "./merge";
import { apiConfigured, apiUrl, isNative, platform, readDurable, writeDurable } from "./platform";
import { getState, INITIAL_STATE, parseState, replaceState, subscribe } from "./store";

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
  /** The account this phone's data last belonged to. */
  lastUserId?: string;
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

/** Sends the session with AI requests so limits are per account rather than per network. */
export const authHeaders = (): Record<string, string> => (account.token ? { Authorization: `Bearer ${account.token}` } : {});

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

/** Shown when this copy of the app was built without the address of a W server. */
export const NO_SERVER = () => t("Accounts need the W server, and this copy of the app isn't connected to one yet. You can use W without an account.");

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!apiConfigured) throw new ApiError(503, NO_SERVER());
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
  // Anything but JSON (e.g. the app's own page) means the server address is wrong.
  if (!(res.headers.get("content-type") ?? "").includes("json")) throw new ApiError(503, t("Couldn't reach the W server. Check the server address the app was built with."));
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(res.status, (data.error as string) ?? t("Something went wrong ({status}).", { status: res.status }), data);
  return data as T;
}

interface AuthConfig {
  google: boolean;
  apple: boolean;
  appleWeb?: boolean;
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
  // A different person signing in on a shared phone mustn't get the previous account's data
  // merged into theirs. (Data used without any account is still brought along.)
  if (account.lastUserId && account.lastUserId !== res.user.id) replaceState({ ...INITIAL_STATE, stamps: {} });
  set({ token: res.token, user: res.user, guest: false, version: 0, lastSyncedAt: null, lastUserId: res.user.id });
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
/**
 * The iPhone file on GitHub is installed with Sideloadly/AltStore and signed with a free Apple ID,
 * which Apple doesn't allow to use Sign in with Apple. CI marks that build so the button is hidden.
 */
export const SIDELOADED = import.meta.env.VITE_SIDELOAD === "1";

/** Whether this sign-in method can work here (server set up, and allowed for this kind of install). */
export function providerAvailable(cfg: AuthConfig, provider: "google" | "apple") {
  if (provider === "google") return cfg.google;
  if (platform === "ios") return cfg.apple && !SIDELOADED;
  return !!cfg.appleWeb;
}

export async function signInWith(provider: "google" | "apple"): Promise<boolean> {
  const cfg = await authConfig();
  const label = provider === "google" ? "Google" : "Apple";
  if (provider === "apple" && platform === "ios" && SIDELOADED) {
    throw new Error(t("Sign in with Apple only works in the App Store or TestFlight version. Use email or Google instead."));
  }
  if (!providerAvailable(cfg, provider)) {
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
  set({ token: null, user: null, version: 0, lastSyncedAt: null, status: "idle", lastUserId: account.user?.id ?? account.lastUserId });
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
    let saved = false;
    for (let attempt = 0; attempt < 3 && !saved; attempt++) {
      const json = JSON.stringify(getState());
      if (json === lastSent) {
        saved = true;
        break;
      }
      set({ status: "syncing" });
      try {
        const result = await api<Remote>("PUT", "/api/data", { baseVersion: account.version, data: getState() });
        lastSent = json;
        set({ version: result.version });
        saved = true;
      } catch (e) {
        // Another device synced first: merge its copy into ours and try again.
        if (e instanceof ApiError && e.status === 409) adopt(e.body as unknown as Remote);
        else throw e;
      }
    }
    // Other phones kept winning the race: stay "syncing" and try again shortly.
    if (saved) set({ status: "synced", lastSyncedAt: Date.now() });
    else again = true;
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
    set({ token: null, user: null, version: 0, status: "idle", lastUserId: account.user?.id ?? account.lastUserId });
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
