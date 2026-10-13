import { registerPlugin } from "@capacitor/core";
import { t } from "../i18n";
import { exName } from "../i18n/exercises";
import { sessionKcal } from "./fitness";
import { platform } from "./platform";
import type { AppState } from "./store";
import type { WorkoutSession } from "./types";

// The running workout on the iPhone Lock Screen and in the Dynamic Island (iOS 16.2+; the Dynamic
// Island itself is on iPhone 14 Pro and newer). The timers count by themselves on the phone, so W
// only sends an update when something changes: a set done, a rest started or ended, a new exercise.

export interface LiveState {
  kcal: number;
  exercise: string;
  setsDone: number;
  restStartedAt?: number;
  restEndsAt?: number;
}

interface WorkoutLivePlugin {
  isSupported(): Promise<{ supported: boolean }>;
  start(o: LiveState & { title: string; startedAt: number; kcalLabel: string; restLabel: string; setsLabel: string }): Promise<void>;
  update(o: LiveState): Promise<void>;
  end(): Promise<void>;
}

const WorkoutLive = registerPlugin<WorkoutLivePlugin>("WorkoutLive");

/** What the Live Activity shows for a session: the exercise in progress, sets done and calories. */
export function liveState(s: WorkoutSession, weightKg: number, rest: { startedAt: number; endsAt: number } | null, now = Date.now()): LiveState {
  const strength = s.exercises.filter((e) => e.kind === "strength");
  const current = strength.find((e) => (e.sets ?? []).some((x) => !x.done)) ?? s.exercises[s.exercises.length - 1];
  const setsDone = s.exercises.reduce((a, e) => a + (e.sets ?? []).filter((x) => x.done).length, 0);
  return {
    kcal: Math.round(sessionKcal(s, weightKg, now)),
    exercise: current ? exName(current.name) : "",
    setsDone,
    ...(rest && rest.endsAt > now ? { restStartedAt: rest.startedAt, restEndsAt: rest.endsAt } : {}),
  };
}

let running: string | null = null;
let lastSent = "";
let rest: { startedAt: number; endsAt: number } | null = null;
let lastState: AppState | null = null;
let ticker: ReturnType<typeof setInterval> | undefined;

/** The rest timer started (or was skipped with null). */
export function setLiveRest(endsAt: number | null) {
  rest = endsAt ? { startedAt: Date.now(), endsAt } : null;
  if (lastState) syncLiveActivity(lastState);
}

/** Start, update or end the Live Activity to match the app's workout. iPhone only. */
export function syncLiveActivity(s: AppState) {
  if (platform !== "ios") return;
  lastState = s;
  const active = s.sessions.find((x) => x.id === s.activeSessionId && !x.endedAt);
  if (!active) {
    if (running) {
      running = null;
      lastSent = "";
      rest = null;
      clearInterval(ticker);
      WorkoutLive.end().catch(() => {});
    }
    return;
  }
  const state = liveState(active, s.profile.weightKg, rest);
  const key = JSON.stringify(state);
  if (running !== active.id) {
    running = active.id;
    lastSent = key;
    WorkoutLive.start({
      ...state,
      title: active.title,
      startedAt: active.startedAt,
      kcalLabel: t("kcal"),
      restLabel: t("Rest"),
      setsLabel: t("sets"),
    }).catch(() => {
      running = null;
    });
    // Calories keep rising between sets; refresh them once a minute while the app is open.
    clearInterval(ticker);
    ticker = setInterval(() => lastState && syncLiveActivity(lastState), 60_000);
    return;
  }
  if (key === lastSent) return;
  lastSent = key;
  WorkoutLive.update(state).catch(() => {});
}
