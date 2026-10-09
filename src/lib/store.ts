import { useEffect, useState, useSyncExternalStore } from "react";
import type { SplitId } from "./fitness";
import { readDurable, writeDurable } from "./platform";
import type { ChatMessage, CustomMeal, DayStats, Food, LogEntry, PeriodEntry, Profile, Reminders, WeightEntry, WorkoutSession } from "./types";

export interface AppState {
  profile: Profile;
  log: LogEntry[];
  customFoods: Food[];
  customMeals: CustomMeal[];
  sessions: WorkoutSession[];
  activeSessionId: string | null;
  split: SplitId;
  recentFoodIds: string[];
  /** The guided tour has been shown (or skipped) once. */
  tourDone: boolean;
  /** The first-launch intro guide has been finished or skipped. */
  introDone: boolean;
  /** Appearance: follow the phone, or always light / dark. */
  theme: "system" | "light" | "dark";
  /** App language. */
  language: "en" | "ms" | "zh";
  /** Weigh-ins, oldest first. */
  weights: WeightEntry[];
  /** First days of logged periods (cycle tracking). */
  periods: PeriodEntry[];
  /** Water and steps per day. */
  days: DayStats[];
  reminders: Reminders;
  /** Conversation with the AI coach. */
  coach: ChatMessage[];
  /** IDs of deleted entries, so a delete on one device isn't undone by another during sync. */
  deleted: string[];
  /** When each field last changed on this device; sync keeps the newer side field by field. */
  stamps: Partial<Record<keyof AppState, number>>;
  /** When "Delete all data" was last used; synced copies from before it are dropped. */
  resetAt?: number;
  /** Who is using the app now. Everything above except the shared settings belongs to this person. */
  personId: string;
  /** Other people on this phone (family members), with their own data. */
  people: PersonSnapshot[];
  /** People removed from the household, so sync doesn't bring them back. */
  removedPeople: string[];
  /** While a new person is being set up: who to go back to on Cancel. */
  returnTo?: string;
}

/** Settings shared by everyone on the phone; everything else is per person. */
export const SHARED_KEYS = ["theme", "language", "introDone", "tourDone"] as const;
const HOUSEHOLD_KEYS = ["personId", "people", "removedPeople", "returnTo"] as const;
type SharedKey = (typeof SHARED_KEYS)[number] | (typeof HOUSEHOLD_KEYS)[number];
export type PersonData = Omit<AppState, SharedKey>;
export interface PersonSnapshot {
  id: string;
  data: PersonData;
}

/** When the household-wide settings last changed. */
const sharedStamps = () => Object.fromEntries(SHARED_KEYS.filter((k) => state.stamps[k]).map((k) => [k, state.stamps[k]]));

/** One person's part of the state. */
export function personData(s: AppState): PersonData {
  const out = { ...s } as Partial<AppState>;
  for (const k of [...SHARED_KEYS, ...HOUSEHOLD_KEYS]) delete out[k];
  return out as PersonData;
}

/** Everyone's data as full states (shared settings from `s`), keyed by person. */
export function everyone(s: AppState): Map<string, AppState> {
  const map = new Map<string, AppState>([[s.personId, s]]);
  for (const p of s.people ?? []) if (!map.has(p.id)) map.set(p.id, { ...s, ...fill(p.data), personId: p.id });
  return map;
}

/** Fill in fields added in later versions. */
const fill = (d: Partial<PersonData>): PersonData => ({
  ...personData(initial),
  ...d,
  // Optional, so set explicitly: one person's reset date must never carry over to another.
  resetAt: d.resetAt,
  profile: { ...DEFAULT_PROFILE, ...d.profile },
  reminders: { ...DEFAULT_REMINDERS, ...d.reminders },
});

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
  allergies: [],
  fasting: "off",
  fastTimes: { sahur: "05:45", iftar: "19:20", windowStart: "12:00" },
  stepGoal: 8000,
  cycle: { on: false, length: 28, periodDays: 5, remind: true },
  onboarded: false,
};

export const DEFAULT_REMINDERS: Reminders = {
  meals: false,
  water: false,
  gym: false,
  breakfast: "08:00",
  lunch: "12:30",
  dinner: "19:00",
  gymTime: "18:00",
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
  tourDone: false,
  introDone: false,
  theme: "system",
  language: "en",
  weights: [],
  periods: [],
  days: [],
  reminders: DEFAULT_REMINDERS,
  coach: [],
  deleted: [],
  stamps: {},
  personId: "me",
  people: [],
  removedPeople: [],
};

export const INITIAL_STATE = initial;

export function parseState(raw: string | null): AppState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...initial,
      ...parsed,
      profile: { ...DEFAULT_PROFILE, ...parsed.profile },
      reminders: { ...DEFAULT_REMINDERS, ...parsed.reminders },
      people: (parsed.people ?? []).map((p) => ({ id: p.id, data: fill(p.data) })),
    };
  } catch {
    return null;
  }
}

function load(): AppState {
  try {
    return parseState(localStorage.getItem(KEY)) ?? initial;
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
  const now = Date.now();
  const stamps = { ...state.stamps };
  for (const k of Object.keys(patch) as (keyof AppState)[]) if (k !== "stamps" && k !== "deleted") stamps[k] = now;
  commit({ ...state, ...patch, stamps });
}

/** Replace the whole state as-is (used when sync brings in merged data). */
export function replaceState(next: AppState) {
  commit(next);
}

function commit(next: AppState) {
  state = next;
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
  const durable = parseState(await readDurable(KEY).catch(() => null));
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

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
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
    setState((s) => ({ log: s.log.filter((e) => e.id !== id), deleted: tombstone(s.deleted, id) }));
  },
  restoreLog(entry: LogEntry) {
    // A new id: the old one may already be synced as deleted, and sync never un-deletes.
    setState((s) => ({ log: [...s.log, { ...entry, id: uid() }] }));
  },
  touchRecent(foodId: string) {
    setState((s) => ({ recentFoodIds: [foodId, ...s.recentFoodIds.filter((x) => x !== foodId)].slice(0, 20) }));
  },
  addCustomFood(f: Food) {
    setState((s) => ({ customFoods: [f, ...s.customFoods] }));
  },
  saveCustomMeal(m: CustomMeal) {
    setState((s) => {
      // Undo of a delete comes back under a new id (sync never un-deletes an id).
      const meal = { ...m, id: s.deleted.includes(m.id) ? uid() : m.id, updatedAt: Date.now() };
      return { customMeals: [meal, ...s.customMeals.filter((x) => x.id !== m.id)] };
    });
  },
  deleteCustomMeal(id: string) {
    setState((s) => ({ customMeals: s.customMeals.filter((x) => x.id !== id), deleted: tombstone(s.deleted, id) }));
  },
  clockIn(title: string, exercises: WorkoutSession["exercises"] = []) {
    const s: WorkoutSession = { id: uid(), date: todayKey(), title, startedAt: Date.now(), exercises, kcal: 0 };
    setState((st) => ({ sessions: [s, ...st.sessions], activeSessionId: s.id }));
    return s.id;
  },
  updateSession(id: string, fn: (s: WorkoutSession) => WorkoutSession) {
    setState((st) => ({ sessions: st.sessions.map((s) => (s.id === id ? { ...fn(s), updatedAt: Date.now() } : s)) }));
  },
  clockOut(id: string, kcal: number) {
    setState((st) => ({
      sessions: st.sessions.map((s) => (s.id === id ? { ...s, endedAt: Date.now(), updatedAt: Date.now(), kcal: Math.round(kcal) } : s)),
      activeSessionId: null,
    }));
  },
  addSession(session: WorkoutSession) {
    setState((st) => ({
      sessions: [...st.sessions, { ...session, id: st.deleted.includes(session.id) ? uid() : session.id, updatedAt: Date.now() }].sort((a, b) => b.startedAt - a.startedAt),
    }));
  },
  discardSession(id: string) {
    setState((st) => ({
      sessions: st.sessions.filter((s) => s.id !== id),
      activeSessionId: st.activeSessionId === id ? null : st.activeSessionId,
      deleted: tombstone(st.deleted, id),
    }));
  },
  /** Record today's weight (one entry per day) and update the profile so targets follow. */
  logWeight(kg: number, date = todayKey()) {
    setState((s) => {
      const existing = s.weights.find((w) => w.date === date);
      const entry: WeightEntry = { id: existing?.id ?? uid(), date, kg, createdAt: Date.now() };
      const weights = [...s.weights.filter((w) => w.date !== date), entry].sort((a, b) => a.date.localeCompare(b.date));
      const latest = weights[weights.length - 1];
      return { weights, profile: latest.id === entry.id ? { ...s.profile, weightKg: kg } : s.profile };
    });
  },
  /** Log the first day of a period (one per date). */
  logPeriod(date = todayKey()) {
    setState((s) => (s.periods.some((p) => p.date === date) ? {} : { periods: [...s.periods, { id: uid(), date, createdAt: Date.now() }].sort((a, b) => a.date.localeCompare(b.date)) }));
  },
  removePeriod(id: string) {
    setState((s) => ({ periods: s.periods.filter((p) => p.id !== id), deleted: tombstone(s.deleted, id) }));
  },
  removeWeight(id: string) {
    setState((s) => ({ weights: s.weights.filter((w) => w.id !== id), deleted: tombstone(s.deleted, id) }));
  },
  updateDay(date: string, fn: (d: DayStats) => DayStats) {
    setState((s) => {
      const current = s.days.find((d) => d.id === date) ?? { id: date, waterMl: 0, steps: 0 };
      // Keep about a year of daily stats.
      return { days: [...s.days.filter((d) => d.id !== date), { ...fn(current), updatedAt: Date.now() }].sort((a, b) => a.id.localeCompare(b.id)).slice(-400) };
    });
  },
  setReminders(r: Partial<Reminders>) {
    setState((s) => ({ reminders: { ...s.reminders, ...r } }));
  },
  setLanguage(language: AppState["language"]) {
    setState({ language });
  },
  setCoach(coach: ChatMessage[]) {
    setState({ coach: coach.slice(-60) });
  },
  setTheme(theme: AppState["theme"]) {
    setState({ theme });
  },
  finishIntro() {
    setState({ introDone: true });
  },
  finishTour() {
    setState({ tourDone: true });
  },
  setSplit(split: SplitId) {
    setState({ split });
  },
  resetAll() {
    // Every field is stamped as changed now, and resetAt tells sync to drop anything older.
    // Everyone else in the household is removed too.
    setState((s) => ({
      ...initial,
      // Starting over goes straight to setting up a profile, not the first-launch guide.
      introDone: true,
      stamps: {},
      resetAt: Date.now(),
      personId: s.personId,
      removedPeople: [...new Set([...s.removedPeople, ...s.people.map((p) => p.id)])],
    }));
  },

  // ── People ──
  /** Start a new person (they go through onboarding); the current person is kept as they are. */
  addPerson() {
    commit({
      ...initial,
      theme: state.theme,
      language: state.language,
      introDone: true,
      tourDone: true,
      stamps: sharedStamps(),
      personId: uid(),
      people: [...state.people, { id: state.personId, data: personData(state) }],
      removedPeople: state.removedPeople,
      returnTo: state.personId,
    });
  },
  /** Switch who is using the app. Nothing is changed, so nothing looks newer to sync. */
  switchPerson(id: string) {
    const target = state.people.find((p) => p.id === id);
    if (!target) return;
    const data = fill(target.data);
    commit({
      ...state,
      ...data,
      // Theme and language belong to the household: keep when they last changed.
      stamps: { ...data.stamps, ...sharedStamps() },
      returnTo: undefined,
      personId: id,
      people: [...state.people.filter((p) => p.id !== id), { id: state.personId, data: personData(state) }],
    });
  },
  /** Remove someone else in the household and their data. */
  removePerson(id: string) {
    if (id === state.personId) return;
    commit({ ...state, people: state.people.filter((p) => p.id !== id), removedPeople: [...state.removedPeople, id].slice(-200) });
  },
  /** Back out of adding a person: go back to whoever was using the app before. */
  cancelNewPerson() {
    const back = state.people.find((p) => p.id === state.returnTo) ?? state.people[state.people.length - 1];
    if (!back || state.profile.onboarded) return;
    const leaving = state.personId;
    actions.switchPerson(back.id);
    actions.removePerson(leaving);
  },
};

function tombstone(list: string[], id: string) {
  return [...list.filter((d) => d !== id), id].slice(-2000);
}
