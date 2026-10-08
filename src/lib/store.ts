import { useEffect, useState, useSyncExternalStore } from "react";
import type { SplitId } from "./fitness";
import { readDurable, writeDurable } from "./platform";
import type { CustomMeal, Food, LogEntry, Profile, WorkoutSession } from "./types";

export interface AppState {
  profile: Profile;
  log: LogEntry[];
  customFoods: Food[];
  customMeals: CustomMeal[];
  sessions: WorkoutSession[];
  activeSessionId: string | null;
  split: SplitId;
  recentFoodIds: string[];
}

const KEY = "calories-detector:v1";

export const DEFAULT_PROFILE: Profile = {
  name: "",
  sex: "male",
  age: 25,
  heightCm: 172,
  weightKg: 70,
  activity: 1.55,
  goal: "maintain",
  experience: "beginner",
  trainingDays: 4,
  diet: "anything",
  onboarded: false,
};

const initial: AppState = {
  profile: DEFAULT_PROFILE,
  log: [],
  customFoods: [],
  customMeals: [],
  sessions: [],
  activeSessionId: null,
  split: "auto",
  recentFoodIds: [],
};

function parse(raw: string | null): AppState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return { ...initial, ...parsed, profile: { ...DEFAULT_PROFILE, ...parsed.profile } };
  } catch {
    return null;
  }
}

function load(): AppState {
  try {
    return parse(localStorage.getItem(KEY)) ?? initial;
  } catch {
    return initial;
  }
}

let state: AppState = load();
const listeners = new Set<() => void>();

export function getState() {
  return state;
}

export function setState(update: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const patch = typeof update === "function" ? update(state) : update;
  state = { ...state, ...patch };
  const json = JSON.stringify(state);
  try {
    localStorage.setItem(KEY, json);
  } catch {
    // Storage full or blocked (private mode) — keep working in memory.
  }
  writeDurable(KEY, json);
  listeners.forEach((l) => l());
}

/** In the native apps, restore from OS-backed storage in case the WebView's storage was evicted. */
export async function hydrate() {
  const durable = parse(await readDurable(KEY).catch(() => null));
  if (durable) {
    state = durable;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  } else if (state !== initial) {
    // First launch after this update: copy existing data into durable storage.
    writeDurable(KEY, JSON.stringify(state));
  }
}

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selector(state),
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Today's date key, kept current while the app stays open: rechecked every minute and
 * whenever the app returns to the foreground (e.g. opened the next morning).
 */
export function useTodayKey() {
  const [key, setKey] = useState(todayKey);
  useEffect(() => {
    const check = () => setKey(todayKey());
    const timer = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);
  return key;
}

/** Monday = 0 … Sunday = 6, for a YYYY-MM-DD key. */
export function weekdayOf(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

// ── Actions ──────────────────────────────────────────────

export const actions = {
  updateProfile(p: Partial<Profile>) {
    setState((s) => ({ profile: { ...s.profile, ...p } }));
  },
  addLog(entries: Omit<LogEntry, "id" | "createdAt">[]) {
    const now = Date.now();
    setState((s) => ({ log: [...s.log, ...entries.map((e, i) => ({ ...e, id: uid(), createdAt: now + i }))] }));
  },
  removeLog(id: string) {
    setState((s) => ({ log: s.log.filter((e) => e.id !== id) }));
  },
  restoreLog(entry: LogEntry) {
    setState((s) => ({ log: [...s.log, entry] }));
  },
  touchRecent(foodId: string) {
    setState((s) => ({ recentFoodIds: [foodId, ...s.recentFoodIds.filter((x) => x !== foodId)].slice(0, 20) }));
  },
  addCustomFood(f: Food) {
    setState((s) => ({ customFoods: [f, ...s.customFoods] }));
  },
  saveCustomMeal(m: CustomMeal) {
    setState((s) => ({ customMeals: [m, ...s.customMeals.filter((x) => x.id !== m.id)] }));
  },
  deleteCustomMeal(id: string) {
    setState((s) => ({ customMeals: s.customMeals.filter((x) => x.id !== id) }));
  },
  clockIn(title: string, exercises: WorkoutSession["exercises"] = []) {
    const s: WorkoutSession = { id: uid(), date: todayKey(), title, startedAt: Date.now(), exercises, kcal: 0 };
    setState((st) => ({ sessions: [s, ...st.sessions], activeSessionId: s.id }));
    return s.id;
  },
  updateSession(id: string, fn: (s: WorkoutSession) => WorkoutSession) {
    setState((st) => ({ sessions: st.sessions.map((s) => (s.id === id ? fn(s) : s)) }));
  },
  clockOut(id: string, kcal: number) {
    setState((st) => ({
      sessions: st.sessions.map((s) => (s.id === id ? { ...s, endedAt: Date.now(), kcal: Math.round(kcal) } : s)),
      activeSessionId: null,
    }));
  },
  addSession(session: WorkoutSession) {
    setState((st) => ({ sessions: [...st.sessions, session].sort((a, b) => b.startedAt - a.startedAt) }));
  },
  discardSession(id: string) {
    setState((st) => ({
      sessions: st.sessions.filter((s) => s.id !== id),
      activeSessionId: st.activeSessionId === id ? null : st.activeSessionId,
    }));
  },
  setSplit(split: SplitId) {
    setState({ split });
  },
  resetAll() {
    setState({ ...initial });
  },
};
