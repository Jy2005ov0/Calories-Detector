import { registerPlugin } from "@capacitor/core";
import type { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";
import { useSyncExternalStore } from "react";
import { t } from "../i18n";
import { notificationsReady } from "./native";
import { isNative } from "./platform";
import { acceptFix, haversine, type Fix } from "./run";

// A run or walk being tracked. It lives here, not in a screen, so it keeps going whichever tab is
// showing, with the sheet closed, and (on a phone) with the screen locked: Android keeps location
// running behind a "Run in progress" notification, and iOS keeps it running in the background.

const BG = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");

export type RunMode = "run" | "walk";
export type RunStatus = "idle" | "running" | "paused";
/** A point on the route: latitude, longitude and when (ms). */
export type Pt = [number, number, number];

export interface RunSnapshot {
  status: RunStatus;
  mode: RunMode;
  /** Stretches of route; a pause starts a new one, so the gap isn't counted. */
  segments: Pt[][];
  startedAt: number;
  /** Seconds counted before the current stretch of moving time. */
  elapsed: number;
  /** When the clock last started (null while paused or auto-paused). */
  since: number | null;
  /** Stopped for a while (at a crossing, say): the clock waits until you move again. */
  autoPaused: boolean;
  autoPause: boolean;
  /** Where the phone is now and how sure the GPS is (metres), even before starting. */
  here: { lat: number; lng: number; acc: number; at: number } | null;
  error: string;
}

const KEY = "w:run-in-progress";
const IDLE: RunSnapshot = { status: "idle", mode: "run", segments: [], startedAt: 0, elapsed: 0, since: null, autoPaused: false, autoPause: true, here: null, error: "" };
/** Stopped this long while running: auto-pause. */
const STILL_MS = 12_000;
/** Pace now: over the last stretch of this many seconds. */
const PACE_WINDOW_S = 30;

let snap: RunSnapshot = restore();
const listeners = new Set<() => void>();
let watcher: string | number | null = null;
let watchingInBackground = false;
let kalman: Kalman | null = null;
let lastAccepted: Fix | null = null;
let lastMoveAt = 0;
let ticker: ReturnType<typeof setInterval> | undefined;

function restore(): RunSnapshot {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as RunSnapshot | null;
    if (s && s.status !== "idle" && Array.isArray(s.segments)) return { ...IDLE, ...s, here: null, error: "" };
  } catch {
    /* nothing saved */
  }
  return IDLE;
}

function set(next: Partial<RunSnapshot>) {
  snap = { ...snap, ...next };
  try {
    if (snap.status === "idle") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify({ ...snap, here: null }));
  } catch {
    /* storage full or blocked: the run still works, it just can't survive the app closing */
  }
  listeners.forEach((l) => l());
}

export function useRun(): RunSnapshot {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snap,
    () => snap,
  );
}
export const getRun = () => snap;

// ── Smoothing ────────────────────────────────────────────

/**
 * A simple Kalman filter on position: each reading is trusted by how accurate the phone says it is,
 * so a wobbly reading moves the line a little and a sharp one a lot. Straightens the zig-zag GPS
 * draws along a straight road, which otherwise adds distance.
 */
class Kalman {
  lat: number;
  lng: number;
  variance: number;
  t: number;
  constructor(f: Fix, private speed: number) {
    this.lat = f.lat;
    this.lng = f.lng;
    this.variance = f.acc * f.acc;
    this.t = f.t;
  }
  update(f: Fix): Fix {
    const acc = Math.max(1, f.acc);
    const dt = Math.max(0, (f.t - this.t) / 1000);
    this.variance += dt * this.speed * this.speed;
    this.t = f.t;
    const k = this.variance / (this.variance + acc * acc);
    this.lat += k * (f.lat - this.lat);
    this.lng += k * (f.lng - this.lng);
    this.variance *= 1 - k;
    return { lat: this.lat, lng: this.lng, acc: Math.sqrt(this.variance), t: f.t };
  }
}

// ── Readings ─────────────────────────────────────────────

function onFix(raw: Fix) {
  const now = Date.now();
  set({ here: { lat: raw.lat, lng: raw.lng, acc: raw.acc, at: now }, error: "" });
  if (snap.status !== "running") return;
  if (raw.acc > 35) return;
  if (!kalman) kalman = new Kalman(raw, snap.mode === "walk" ? 2 : 4);
  const f = kalman.update(raw);
  if (!acceptFix(lastAccepted, f)) return;
  lastAccepted = f;
  lastMoveAt = now;
  const segments = snap.segments.length ? snap.segments.slice() : [[]];
  segments[segments.length - 1] = [...segments[segments.length - 1], [f.lat, f.lng, f.t]];
  // Moving again after an auto-pause: the clock carries on.
  set(snap.autoPaused ? { segments, autoPaused: false, since: now } : { segments });
}

/** Called every second while running: auto-pause after standing still for a while. */
function tick() {
  if (snap.status !== "running" || !snap.autoPause || snap.autoPaused || !snap.since) return;
  const now = Date.now();
  const lastMove = Math.max(lastMoveAt, snap.since);
  if (now - lastMove < STILL_MS) return;
  // The clock stops from when you stopped moving, not from when it noticed.
  set({ autoPaused: true, elapsed: snap.elapsed + Math.max(0, Math.round((lastMove - snap.since) / 1000)), since: null });
}

const noGps = () => t("Can't get your location. Allow location access for W and go outside for a clear GPS signal.");

async function startWatch(background: boolean) {
  if (watcher !== null && watchingInBackground === background) return;
  await stopWatch();
  watchingInBackground = background;
  if (isNative) {
    // Android 13+ needs notification permission to show "Run in progress".
    if (background) await notificationsReady().catch(() => false);
    watcher = await BG.addWatcher(
      {
        requestPermissions: true,
        stale: false,
        distanceFilter: 0,
        ...(background ? { backgroundTitle: t("Run in progress"), backgroundMessage: t("W is tracking your route. Tap to open.") } : {}),
      },
      (loc, err) => {
        if (err) {
          set({ error: err.code === "NOT_AUTHORIZED" ? t("W needs location access to track your route. Turn it on in Settings → W → Location.") : noGps() });
          return;
        }
        if (loc) onFix({ lat: loc.latitude, lng: loc.longitude, acc: loc.accuracy, t: loc.time ?? Date.now() });
      },
    );
  } else {
    if (!navigator.geolocation) {
      set({ error: noGps() });
      throw new Error("no-gps");
    }
    watcher = navigator.geolocation.watchPosition(
      (p) => onFix({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, t: p.timestamp }),
      () => set({ error: noGps() }),
      { enableHighAccuracy: true, maximumAge: 0 },
    );
  }
}

async function stopWatch() {
  const id = watcher;
  watcher = null;
  if (id === null) return;
  if (isNative) await BG.removeWatcher({ id: String(id) }).catch(() => {});
  else navigator.geolocation.clearWatch(id as number);
}

// ── Controls ─────────────────────────────────────────────

/** Show where you are on the map (and how good the GPS is) before starting. */
export async function preview() {
  if (snap.status === "idle") await startWatch(false).catch(() => {});
}
/** The sheet closed without starting: stop asking for location. */
export async function endPreview() {
  if (snap.status === "idle") {
    await stopWatch();
    set({ here: null });
  }
}

export function setMode(mode: RunMode) {
  if (snap.status === "idle") set({ mode });
}
export function setAutoPause(autoPause: boolean) {
  // Turning it off mid-pause starts the clock again.
  set(snap.autoPaused && !autoPause ? { autoPause, autoPaused: false, since: Date.now() } : { autoPause });
}

export async function start() {
  try {
    await startWatch(true);
  } catch {
    return false;
  }
  const now = Date.now();
  kalman = null;
  lastAccepted = null;
  lastMoveAt = now;
  set({
    status: "running",
    startedAt: snap.status === "idle" ? now : snap.startedAt,
    since: now,
    autoPaused: false,
    // A new stretch after a pause.
    segments: snap.status === "idle" ? [[]] : [...snap.segments, []],
  });
  clearInterval(ticker);
  ticker = setInterval(tick, 1000);
  return true;
}

export async function pause() {
  clearInterval(ticker);
  await stopWatch();
  const since = snap.since;
  set({ status: "paused", autoPaused: false, since: null, elapsed: snap.elapsed + (since ? Math.max(0, Math.round((Date.now() - since) / 1000)) : 0) });
  // Keep showing where you are while paused, without the background notification.
  void startWatch(false).catch(() => {});
}

export async function discard() {
  clearInterval(ticker);
  await stopWatch();
  kalman = null;
  lastAccepted = null;
  set({ ...IDLE, mode: snap.mode, autoPause: snap.autoPause });
}

/** Stop tracking and hand back what was recorded (the caller saves it). */
export async function finish() {
  clearInterval(ticker);
  await stopWatch();
  const result = { segments: snap.segments.filter((s) => s.length), seconds: seconds(snap), startedAt: snap.startedAt, mode: snap.mode };
  kalman = null;
  lastAccepted = null;
  set({ ...IDLE, mode: snap.mode, autoPause: snap.autoPause });
  return result;
}

// ── Figures ──────────────────────────────────────────────

export const seconds = (s: RunSnapshot, now = Date.now()) => s.elapsed + (s.since ? Math.max(0, Math.round((now - s.since) / 1000)) : 0);

export function distance(segments: Pt[][]) {
  let d = 0;
  for (const s of segments) for (let i = 1; i < s.length; i++) d += haversine([s[i - 1][0], s[i - 1][1]], [s[i][0], s[i][1]]);
  return d;
}

/** Minutes per km over the last half minute of moving; null when standing still or just started. */
export function paceNow(s: RunSnapshot, now = Date.now()): number | null {
  if (s.status !== "running" || s.autoPaused) return null;
  const seg = s.segments[s.segments.length - 1] ?? [];
  if (seg.length < 2) return null;
  const last = seg[seg.length - 1];
  // Nothing new for a while: you've slowed right down.
  if (now - last[2] > 15_000) return null;
  let i = seg.length - 1;
  while (i > 0 && last[2] - seg[i - 1][2] <= PACE_WINDOW_S * 1000) i--;
  const part = seg.slice(i);
  const d = distance([part]);
  const secs = (last[2] - part[0][2]) / 1000;
  if (d < 20 || secs < 5) return null;
  return secs / 60 / (d / 1000);
}

/** How good the GPS signal is now. */
export function signal(s: RunSnapshot, now = Date.now()): "none" | "weak" | "ok" | "good" {
  if (!s.here || now - s.here.at > 15_000) return "none";
  if (s.here.acc <= 12) return "good";
  if (s.here.acc <= 35) return "ok";
  return "weak";
}

// A run left going when the app was closed carries on when it opens again.
if (snap.status === "running") {
  void startWatch(true).catch(() => {});
  lastMoveAt = Date.now();
  ticker = setInterval(tick, 1000);
}
