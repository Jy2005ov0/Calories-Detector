import { useEffect, useState, useSyncExternalStore } from "react";
import type { SplitId } from "./fitness";
import { readDurable, writeDurable } from "./platform";
import type { Challenge, CustomMeal, DayStats, Food, LogEntry, MealPrefs, Measurement, PeriodEntry, PlannedMeal, Profile, ProgressPhoto, Reminders, Routine, Supplement, WeightEntry, WorkoutSession } from "./types";

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
  /** Water, steps, check-in and supplements per day. */
  days: DayStats[];
  reminders: Reminders;
  /** Foods starred for one-tap logging. */
  favorites: Food[];
  /** Products found by barcode, kept so they work offline next time. */
  savedProducts: Food[];
  supplements: Supplement[];
  measurements: Measurement[];
  photos: ProgressPhoto[];
  routines: Routine[];
  /** The weekly meal planner, and grocery items ticked off ("<week start>|<food id>"). */
  mealPlan: PlannedMeal[];
  groceryDone: string[];
  challenges: Challenge[];
  /** Exercises swapped in the training plan: "<day>#<position>" → exercise name. */
  planSwaps: Record<string, string>;
  /** "My own split": the muscle groups for each training day. */
  customSplit: string[][];
  /** Preferences for the daily meal ideas. */
  mealPrefs: MealPrefs;
  /** Text size for easier reading (shared by everyone on the phone). */
  textSize: "normal" | "large" | "xlarge";
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
export const SHARED_KEYS = ["theme", "language", "introDone", "tourDone", "textSize"] as const;
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
  mealPrefs: { ...DEFAULT_MEAL_PREFS, ...d.mealPrefs },
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

export const DEFAULT_MEAL_PREFS: MealPrefs = { on: true, cuisines: [], style: "balanced", variety: "mix", liked: [], hidden: [], skipped: [] };

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
  favorites: [],
  savedProducts: [],
  supplements: [],
  measurements: [],
  photos: [],
  routines: [],
  mealPlan: [],
  groceryDone: [],
  challenges: [],
  mealPrefs: DEFAULT_MEAL_PREFS,
  planSwaps: {},
  customSplit: [],
  textSize: "normal",
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
    const { coach: _coach, ...parsed } = JSON.parse(raw) as Partial<AppState> & { coach?: unknown };
    return {
      ...initial,
      ...parsed,
      profile: { ...DEFAULT_PROFILE, ...parsed.profile },
      reminders: { ...DEFAULT_REMINDERS, ...parsed.reminders },
      mealPrefs: { ...DEFAULT_MEAL_PREFS, ...parsed.mealPrefs },
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

// Saving means turning the whole state (food log, workouts, photos…) into JSON, which takes a
// few milliseconds on a phone. Doing that on every tap and keystroke made the app feel sluggish,
// so changes are saved together a moment later, and straight away when the app is hidden or closed.
let saveTimer: ReturnType<typeof setTimeout> | undefined;

export function flushSave() {
  if (saveTimer === undefined) return;
  clearTimeout(saveTimer);
  saveTimer = undefined;
  const json = JSON.stringify(state);
  try {
    localStorage.setItem(KEY, json);
  } catch {
    // Storage full or blocked (private mode) — keep working in memory.
  }
  writeDurable(KEY, json);
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushSave);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flushSave());
}

function commit(next: AppState) {
  state = next;
  if (saveTimer === undefined) saveTimer = setTimeout(flushSave, 400);
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
  /** Add foods to the log; returns the new entries' ids (for Undo). */
  addLog(entries: Omit<LogEntry, "id" | "createdAt">[]) {
    const now = Date.now();
    const added = entries.map((e, i) => ({ ...e, id: uid(), createdAt: now + i }));
    setState((s) => ({ log: [...s.log, ...added] }));
    return added.map((e) => e.id);
  },
  /** Take back several just-added entries (Undo after copying a meal). */
  removeLogs(ids: string[]) {
    setState((s) => ({ log: s.log.filter((e) => !ids.includes(e.id)), deleted: ids.reduce(tombstone, s.deleted) }));
  },
  removeLog(id: string) {
    setState((s) => ({ log: s.log.filter((e) => e.id !== id), deleted: tombstone(s.deleted, id) }));
  },
  /** Fix a logged food: a different amount (its nutrients scale with it) or another meal. */
  updateLog(id: string, patch: { grams?: number; meal?: LogEntry["meal"] }) {
    setState((s) => ({
      log: s.log.map((e) => {
        if (e.id !== id) return e;
        const grams = patch.grams && patch.grams > 0 ? patch.grams : e.grams;
        const k = grams / e.grams;
        const nutrients = k === 1 ? e.nutrients : (Object.fromEntries(Object.entries(e.nutrients).map(([n, v]) => [n, v * k])) as unknown as LogEntry["nutrients"]);
        return { ...e, grams, nutrients, meal: patch.meal ?? e.meal };
      }),
    }));
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
  /** Replace the logged periods (the calendar edits them as a whole). */
  setPeriods(periods: PeriodEntry[]) {
    setState({ periods: [...periods].sort((a, b) => a.date.localeCompare(b.date)) });
  },
  removePeriod(id: string) {
    setState((s) => ({ periods: s.periods.filter((p) => p.id !== id), deleted: tombstone(s.deleted, id) }));
  },
  removeWeight(id: string) {
    setState((s) => ({ weights: s.weights.filter((w) => w.id !== id), deleted: tombstone(s.deleted, id) }));
  },
  updateDay(date: string, fn: (d: DayStats) => DayStats) {
    setState((s) => {
      const current = s.days.find((d) => d.id === date) ?? { id: date, waterMl: 0 };
      // Keep about a year of daily stats.
      return { days: [...s.days.filter((d) => d.id !== date), { ...fn(current), updatedAt: Date.now() }].sort((a, b) => a.id.localeCompare(b.id)).slice(-400) };
    });
  },
  // ── Faster logging ──
  /** Star or un-star a food for one-tap logging. */
  toggleFavorite(food: Food) {
    setState((s) =>
      s.favorites.some((f) => f.id === food.id)
        ? { favorites: s.favorites.filter((f) => f.id !== food.id) }
        : { favorites: [{ ...food, recipe: food.recipe }, ...s.favorites].slice(0, 100) },
    );
  },
  /** Keep a product found by barcode, so scanning it again works offline. */
  saveProduct(food: Food) {
    setState((s) => ({ savedProducts: [food, ...s.savedProducts.filter((f) => f.id !== food.id)].slice(0, 300) }));
  },
  /** Copy one meal's foods from another day (e.g. yesterday's breakfast) into today. Returns how many were copied. */
  copyMeal(from: string, to: string, meal: LogEntry["meal"]): string[] {
    const items = state.log.filter((e) => e.date === from && e.meal === meal);
    return items.length ? actions.addLog(items.map(({ id: _id, createdAt: _c, ...e }) => ({ ...e, date: to }))) : [];
  },

  // ── Daily check-in, steps and supplements ──
  setCheckIn(date: string, c: Pick<DayStats, "sleepH" | "mood" | "energy">) {
    actions.updateDay(date, (d) => ({ ...d, ...c }));
  },
  setSteps(date: string, steps: number) {
    if ((state.days.find((d) => d.id === date)?.steps ?? -1) === steps) return;
    actions.updateDay(date, (d) => ({ ...d, steps }));
  },
  saveSupplement(x: Supplement) {
    setState((s) => ({ supplements: [...s.supplements.filter((y) => y.id !== x.id), x].sort((a, b) => a.createdAt - b.createdAt) }));
  },
  deleteSupplement(id: string) {
    setState((s) => ({ supplements: s.supplements.filter((y) => y.id !== id), deleted: tombstone(s.deleted, id) }));
  },
  /** Tick (or untick) a dose as taken today. */
  toggleTaken(date: string, key: string) {
    actions.updateDay(date, (d) => {
      const taken = d.taken ?? [];
      return { ...d, taken: taken.includes(key) ? taken.filter((k) => k !== key) : [...taken, key] };
    });
  },

  // ── Body ──
  logMeasurement(m: Omit<Measurement, "id" | "createdAt">) {
    setState((s) => {
      const existing = s.measurements.find((x) => x.date === m.date);
      const entry: Measurement = { ...existing, ...m, id: existing?.id ?? uid(), createdAt: Date.now() };
      return { measurements: [...s.measurements.filter((x) => x.date !== m.date), entry].sort((a, b) => a.date.localeCompare(b.date)) };
    });
  },
  removeMeasurement(id: string) {
    setState((s) => ({ measurements: s.measurements.filter((x) => x.id !== id), deleted: tombstone(s.deleted, id) }));
  },
  addPhoto(p: ProgressPhoto) {
    setState((s) => ({ photos: [...s.photos, p].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt) }));
  },
  removePhoto(id: string) {
    setState((s) => ({ photos: s.photos.filter((x) => x.id !== id), deleted: tombstone(s.deleted, id) }));
  },

  // ── Training ──
  saveRoutine(r: Routine) {
    setState((s) => {
      const routine = { ...r, id: s.deleted.includes(r.id) ? uid() : r.id, updatedAt: Date.now() };
      return { routines: [routine, ...s.routines.filter((x) => x.id !== r.id)] };
    });
  },
  deleteRoutine(id: string) {
    setState((s) => ({ routines: s.routines.filter((x) => x.id !== id), deleted: tombstone(s.deleted, id) }));
  },

  // ── Meal planner ──
  addPlanned(date: string, meal: LogEntry["meal"], item: PlannedMeal["items"][number]) {
    setState((s) => {
      const existing = s.mealPlan.find((p) => p.date === date && p.meal === meal);
      const next: PlannedMeal = existing ? { ...existing, items: [...existing.items, item] } : { id: uid(), date, meal, items: [item] };
      // Keep about two months of plans.
      return { mealPlan: [...s.mealPlan.filter((p) => p.id !== next.id), next].sort((a, b) => a.date.localeCompare(b.date)).slice(-240) };
    });
  },
  removePlanned(planId: string, index: number) {
    setState((s) => ({
      mealPlan: s.mealPlan
        .map((p) => (p.id === planId ? { ...p, items: p.items.filter((_, i) => i !== index) } : p))
        .filter((p) => p.items.length > 0),
    }));
  },
  setPlannedGrams(planId: string, index: number, grams: number) {
    setState((s) => ({ mealPlan: s.mealPlan.map((p) => (p.id === planId ? { ...p, items: p.items.map((it, i) => (i === index ? { ...it, grams } : it)) } : p)) }));
  },
  toggleGrocery(key: string) {
    setState((s) => ({ groceryDone: s.groceryDone.includes(key) ? s.groceryDone.filter((k) => k !== key) : [...s.groceryDone, key].slice(-500) }));
  },

  // ── Challenges ──
  joinChallenge(id: Challenge["id"], start = todayKey()) {
    setState((s) => ({ challenges: [...s.challenges.filter((c) => c.id !== id), { id, start }] }));
  },
  leaveChallenge(id: Challenge["id"]) {
    setState((s) => ({ challenges: s.challenges.filter((c) => c.id !== id) }));
  },

  // ── Training plan ──
  swapExercise(key: string, name: string | null) {
    setState((s) => {
      const planSwaps = { ...s.planSwaps };
      if (name) planSwaps[key] = name;
      else delete planSwaps[key];
      return { planSwaps };
    });
  },
  setCustomSplit(customSplit: string[][]) {
    setState({ customSplit });
  },
  // ── Daily meal ideas ──
  setMealPrefs(p: Partial<MealPrefs>) {
    setState((s) => ({ mealPrefs: { ...s.mealPrefs, ...p } }));
  },
  /** Like a suggested dish (again to undo). */
  toggleLikedIdea(name: string) {
    setState((s) => {
      const liked = s.mealPrefs.liked.includes(name) ? s.mealPrefs.liked.filter((n) => n !== name) : [name, ...s.mealPrefs.liked].slice(0, 100);
      return { mealPrefs: { ...s.mealPrefs, liked, hidden: s.mealPrefs.hidden.filter((n) => n !== name) } };
    });
  },
  /** Never suggest this dish again (until it's restored in the settings). */
  hideIdea(name: string) {
    setState((s) => ({
      mealPrefs: { ...s.mealPrefs, hidden: [name, ...s.mealPrefs.hidden.filter((n) => n !== name)].slice(0, 200), liked: s.mealPrefs.liked.filter((n) => n !== name) },
    }));
  },
  unhideIdea(name: string) {
    setState((s) => ({ mealPrefs: { ...s.mealPrefs, hidden: s.mealPrefs.hidden.filter((n) => n !== name) } }));
  },
  /** Swapped away: suggested a little less for a while. */
  skipIdea(name: string) {
    setState((s) => ({ mealPrefs: { ...s.mealPrefs, skipped: [name, ...s.mealPrefs.skipped].slice(0, 60) } }));
  },
  setTextSize(textSize: AppState["textSize"]) {
    setState({ textSize });
  },

  setReminders(r: Partial<Reminders>) {
    setState((s) => ({ reminders: { ...s.reminders, ...r } }));
  },
  setLanguage(language: AppState["language"]) {
    setState({ language });
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
      textSize: state.textSize,
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
