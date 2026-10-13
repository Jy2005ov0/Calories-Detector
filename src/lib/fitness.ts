import { EXERCISE_BY_NAME } from "../data/exercises";
import { MUSCLE_GROUPS, allowed, exerciseByName, poolFor, type Equipment, type MuscleGroup } from "../data/exercisePools";
import { t } from "../i18n";
import { inOrder } from "./order";
import { getState } from "./store";
import type { Experience, Goal, Profile, SessionExercise, WorkoutSession } from "./types";

/** Minutes of gym time one strength set represents, including the rest after it. */
export const MINUTES_PER_SET = 2;
/** MET used when someone is clocked in but hasn't logged specific exercises. */
export const GENERAL_GYM_MET = 3.5;

export function kcalFor(met: number, weightKg: number, minutes: number) {
  return (met * weightKg * minutes) / 60;
}

export function exerciseMinutes(ex: SessionExercise) {
  if (ex.kind === "cardio") return ex.minutes ?? 0;
  return (ex.sets ?? []).filter((s) => s.done).length * MINUTES_PER_SET;
}

export function exerciseKcal(ex: SessionExercise, weightKg: number) {
  return kcalFor(ex.met, weightKg, exerciseMinutes(ex));
}

export function sessionMinutes(s: Pick<WorkoutSession, "startedAt" | "endedAt">, now = Date.now()) {
  return Math.max(0, ((s.endedAt ?? now) - s.startedAt) / 60000);
}

/**
 * Calories for a session. Logged exercises are counted by their MET values; any clocked-in
 * time not covered by them is counted at a light general-gym rate so time spent warming up,
 * stretching or moving between stations still shows up.
 */
export function sessionKcal(s: WorkoutSession, weightKg: number, now = Date.now()) {
  const logged = s.exercises.reduce((a, e) => a + exerciseKcal(e, weightKg), 0);
  const loggedMin = s.exercises.reduce((a, e) => a + exerciseMinutes(e), 0);
  const uncovered = Math.max(0, sessionMinutes(s, now) - loggedMin);
  const fillMet = s.exercises.length ? 2.0 : GENERAL_GYM_MET;
  return logged + kcalFor(fillMet, weightKg, uncovered);
}

export function sessionVolume(s: WorkoutSession) {
  return s.exercises.reduce(
    (a, e) => a + (e.sets ?? []).filter((x) => x.done).reduce((b, x) => b + x.reps * x.weightKg, 0),
    0,
  );
}

export function formatDuration(minutes: number) {
  const total = Math.floor(minutes * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// ── Training plans ───────────────────────────────────────

export type SplitId = "auto" | "fullbody" | "upperlower" | "ppl" | "bodypart" | "pairs" | "arnold" | "glutes" | "custom";

export const SPLITS: { id: SplitId; name: string; blurb: string }[] = [
  { id: "auto", name: "Recommended", blurb: "Picked from your days per week and experience." },
  { id: "bodypart", name: "Body-part split", blurb: "Chest · Back · Legs · Shoulders · Arms — one muscle group per day." },
  { id: "pairs", name: "Chest & Tri · Back & Bi · Legs", blurb: "Chest with triceps, back with biceps, then legs with shoulders." },
  { id: "ppl", name: "Push / Pull / Legs", blurb: "Pushing muscles, pulling muscles, then legs." },
  { id: "arnold", name: "Arnold split", blurb: "Chest & back, shoulders & arms, then legs — each twice a week with 6 days." },
  { id: "upperlower", name: "Upper / Lower", blurb: "Alternate upper body and lower body days." },
  { id: "glutes", name: "Glutes & legs focus", blurb: "Extra glute, hamstring and leg days, with upper body in between." },
  { id: "fullbody", name: "Full body", blurb: "Every session trains the whole body. Best for 2–3 days." },
  { id: "custom", name: "My own split", blurb: "Choose the muscle groups for each training day." },
];

interface Slot {
  name: string;
  compound: boolean;
  group: MuscleGroup;
}
interface DayTemplate {
  title: string;
  focus: string;
  /** A fixed list of exercises… */
  slots?: Slot[];
  /** …or muscle groups and how many exercises for each, picked from the exercise lists. */
  groups?: [MuscleGroup, number][];
}

const c = (name: string, group: MuscleGroup): Slot => ({ name, compound: true, group });
const i = (name: string, group: MuscleGroup): Slot => ({ name, compound: false, group });

const DAYS: Record<string, DayTemplate> = {
  chest: {
    title: "Chest Day",
    focus: "Chest · Triceps",
    slots: [c("Barbell bench press", "chest"), c("Incline dumbbell press", "chest"), i("Cable crossover", "chest"), c("Chest dip", "chest"), i("Pec deck / machine fly", "chest"), i("Triceps pushdown (rope)", "triceps")],
  },
  back: {
    title: "Back Day",
    focus: "Back · Rear delts",
    slots: [c("Deadlift", "hamstrings"), c("Pull-up", "back"), c("Barbell row", "back"), i("Seated cable row", "back"), i("Straight-arm pulldown", "back"), i("Face pull", "shoulders")],
  },
  legs: {
    title: "Leg Day",
    focus: "Quads · Hamstrings · Glutes · Calves",
    slots: [c("Back squat", "quads"), c("Romanian deadlift", "hamstrings"), c("Leg press", "quads"), i("Lying leg curl", "hamstrings"), i("Leg extension", "quads"), i("Standing calf raise", "calves")],
  },
  shoulders: {
    title: "Shoulder Day",
    focus: "Delts · Traps · Core",
    slots: [c("Overhead press (barbell)", "shoulders"), i("Dumbbell lateral raise", "shoulders"), i("Rear delt fly", "shoulders"), c("Arnold press", "shoulders"), i("Dumbbell shrug", "shoulders"), i("Hanging leg raise", "core")],
  },
  shoulderArms: {
    title: "Shoulders & Arms",
    focus: "Delts · Biceps · Triceps",
    slots: [c("Overhead press (barbell)", "shoulders"), i("Dumbbell lateral raise", "shoulders"), i("Barbell curl", "biceps"), i("Triceps pushdown (rope)", "triceps"), i("Rear delt fly", "shoulders"), i("Hammer curl", "biceps")],
  },
  arms: {
    title: "Arm Day",
    focus: "Biceps · Triceps · Forearms",
    slots: [c("Close-grip bench press", "triceps"), i("Barbell curl", "biceps"), i("Skull crusher", "triceps"), i("Incline dumbbell curl", "biceps"), i("Overhead triceps extension", "triceps"), i("Hammer curl", "biceps")],
  },
  push: {
    title: "Push",
    focus: "Chest · Shoulders · Triceps",
    slots: [c("Barbell bench press", "chest"), c("Seated dumbbell shoulder press", "shoulders"), c("Incline dumbbell press", "chest"), i("Dumbbell lateral raise", "shoulders"), i("Triceps pushdown (rope)", "triceps"), i("Overhead triceps extension", "triceps")],
  },
  pull: {
    title: "Pull",
    focus: "Back · Biceps · Rear delts",
    slots: [c("Barbell row", "back"), c("Lat pulldown", "back"), i("Seated cable row", "back"), i("Face pull", "shoulders"), i("Dumbbell curl", "biceps"), i("Hammer curl", "biceps")],
  },
  legsB: {
    title: "Legs",
    focus: "Quads · Hamstrings · Glutes",
    slots: [c("Back squat", "quads"), c("Romanian deadlift", "hamstrings"), c("Bulgarian split squat", "quads"), i("Lying leg curl", "hamstrings"), i("Standing calf raise", "calves"), i("Plank", "core")],
  },
  upperA: {
    title: "Upper A",
    focus: "Strength focus",
    slots: [c("Barbell bench press", "chest"), c("Barbell row", "back"), c("Overhead press (barbell)", "shoulders"), c("Pull-up", "back"), i("Dumbbell curl", "biceps"), i("Triceps pushdown (bar)", "triceps")],
  },
  lowerA: {
    title: "Lower A",
    focus: "Squat focus",
    slots: [c("Back squat", "quads"), c("Romanian deadlift", "hamstrings"), c("Walking lunge", "quads"), i("Leg extension", "quads"), i("Standing calf raise", "calves"), i("Hanging knee raise", "core")],
  },
  upperB: {
    title: "Upper B",
    focus: "Hypertrophy focus",
    slots: [c("Incline dumbbell press", "chest"), c("Lat pulldown", "back"), c("Seated dumbbell shoulder press", "shoulders"), i("Chest-supported dumbbell row", "back"), i("Dumbbell lateral raise", "shoulders"), i("Hammer curl", "biceps")],
  },
  lowerB: {
    title: "Lower B",
    focus: "Hinge focus",
    slots: [c("Deadlift", "hamstrings"), c("Leg press", "quads"), c("Hip thrust", "glutes"), i("Seated leg curl", "hamstrings"), i("Seated calf raise", "calves"), i("Cable crunch", "core")],
  },
  fullA: {
    title: "Full Body A",
    focus: "Squat · Press · Row",
    slots: [c("Goblet squat", "quads"), c("Dumbbell bench press", "chest"), c("One-arm dumbbell row", "back"), i("Dumbbell lateral raise", "shoulders"), i("Glute bridge", "glutes"), i("Plank", "core")],
  },
  fullB: {
    title: "Full Body B",
    focus: "Hinge · Pull · Press",
    slots: [c("Dumbbell Romanian deadlift", "hamstrings"), c("Lat pulldown", "back"), c("Seated dumbbell shoulder press", "shoulders"), i("Walking lunge", "quads"), i("Dumbbell curl", "biceps"), i("Dead bug", "core")],
  },
  fullC: {
    title: "Full Body C",
    focus: "Legs · Push · Pull",
    slots: [c("Leg press", "quads"), c("Push-up", "chest"), c("Seated cable row", "back"), i("Lying leg curl", "hamstrings"), i("Triceps pushdown (rope)", "triceps"), i("Russian twist", "core")],
  },
  // Pairs: chest & triceps, back & biceps, legs & shoulders.
  chestTri: { title: "Chest & Triceps", focus: "Chest · Triceps", groups: [["chest", 4], ["triceps", 2]] },
  backBi: { title: "Back & Biceps", focus: "Back · Biceps", groups: [["back", 4], ["biceps", 2]] },
  legsShoulders: { title: "Legs & Shoulders", focus: "Quads · Hamstrings · Shoulders", groups: [["quads", 2], ["hamstrings", 1], ["shoulders", 2], ["calves", 1]] },
  // Arnold split.
  chestBack: { title: "Chest & Back", focus: "Chest · Back", groups: [["chest", 3], ["back", 3]] },
  arnoldArms: { title: "Shoulders & Arms", focus: "Delts · Biceps · Triceps", groups: [["shoulders", 2], ["biceps", 2], ["triceps", 2]] },
  // Glutes & legs focus.
  gluteHam: { title: "Glutes & Hamstrings", focus: "Glutes · Hamstrings · Core", groups: [["glutes", 3], ["hamstrings", 2], ["core", 1]] },
  quadGlute: { title: "Quads & Glutes", focus: "Quads · Glutes · Calves", groups: [["quads", 3], ["glutes", 2], ["calves", 1]] },
  upperBody: { title: "Upper Body", focus: "Chest · Back · Shoulders", groups: [["back", 2], ["chest", 2], ["shoulders", 2]] },
};

const SPLIT_DAYS: Record<Exclude<SplitId, "auto" | "custom">, (days: number) => string[]> = {
  fullbody: (d) => ["fullA", "fullB", "fullC", "fullA", "fullB", "fullC"].slice(0, d),
  upperlower: (d) => ["upperA", "lowerA", "upperB", "lowerB", "upperA", "lowerA"].slice(0, d),
  ppl: (d) => ["push", "pull", "legsB", "push", "pull", "legsB"].slice(0, d),
  bodypart: (d) =>
    d <= 3
      ? ["chest", "back", "legs"].slice(0, d)
      : d === 4
        ? ["chest", "back", "legs", "shoulderArms"]
        : d === 5
          ? ["chest", "back", "legs", "shoulders", "arms"]
          : ["chest", "back", "legs", "shoulders", "arms", "legsB"],
  pairs: (d) => ["chestTri", "backBi", "legsShoulders", "chestTri", "backBi", "legsShoulders"].slice(0, d),
  arnold: (d) => ["chestBack", "arnoldArms", "legs", "chestBack", "arnoldArms", "legs"].slice(0, d),
  glutes: (d) => (d === 2 ? ["gluteHam", "upperBody"] : ["gluteHam", "upperBody", "quadGlute", "upperBody", "gluteHam", "quadGlute"].slice(0, d)),
};

/** A day of "My own split": the muscle groups chosen for it. */
export type CustomDay = MuscleGroup[];

/** A sensible starting point for "My own split", from the body-part split. */
export function defaultCustomDays(days: number): CustomDay[] {
  const all: CustomDay[] = [["chest", "triceps"], ["back", "biceps"], ["quads", "hamstrings", "calves"], ["shoulders", "core"], ["biceps", "triceps", "forearms"], ["glutes", "hamstrings"]];
  return all.slice(0, days);
}

const groupLabel = (g: MuscleGroup) => MUSCLE_GROUPS.find((x) => x.id === g)!.label;

/** "Chest & Triceps", "Back, Biceps & Core". */
export function customTitle(groups: CustomDay) {
  const names = groups.map((g) => t(groupLabel(g)));
  if (!names.length) return t("Rest day");
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/** How many exercises each chosen group gets on a custom day (5–6 in all, big muscles first). */
function customGroups(groups: CustomDay, total: number): [MuscleGroup, number][] {
  if (!groups.length) return [];
  const big = new Set<MuscleGroup>(["chest", "back", "quads", "hamstrings", "glutes", "shoulders"]);
  const out = groups.map((g) => [g, 1] as [MuscleGroup, number]);
  let left = Math.max(0, total - groups.length);
  for (let k = 0; left > 0 && k < 20; k++) {
    for (const row of out) {
      if (left <= 0) break;
      if (big.has(row[0]) || k > 0) {
        row[1]++;
        left--;
      }
    }
  }
  return out;
}

export function resolveSplit(split: SplitId, days: number, exp: Experience): Exclude<SplitId, "auto"> {
  if (split !== "auto") return split;
  if (days <= 2) return "fullbody";
  if (days === 3) return exp === "beginner" ? "fullbody" : "ppl";
  if (days === 4) return "upperlower";
  if (days === 5) return "bodypart";
  return "ppl";
}

/** Spread training days over Mon–Sun so rest days fall between sessions where possible. */
const WEEK_LAYOUT: Record<number, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
};
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface PlannedExercise {
  name: string;
  /** Muscle group it trains, and its place in the plan (for swapping it). */
  group?: MuscleGroup;
  swapKey?: string;
  sets: number;
  reps: string;
  restSec: number;
  rir: string;
  tip?: string;
  muscles?: string[];
}

export interface PlannedDay {
  key: string;
  /** The day it's built from, for keeping its exercises in the order the person chose. */
  template: string;
  /** Its place in the suggested plan, before the person changed the order. */
  index: number;
  weekday: number;
  title: string;
  focus: string;
  exercises: PlannedExercise[];
  cardio?: string;
  estMinutes: number;
}

export interface TrainingPlan {
  split: Exclude<SplitId, "auto">;
  days: PlannedDay[];
  principles: string[];
}

function scheme(goal: Goal, exp: Experience, compound: boolean) {
  const base = exp === "beginner" ? 3 : exp === "advanced" ? 4 : 3;
  if (goal === "gain") {
    return compound
      ? { sets: base + (exp === "beginner" ? 0 : 1), reps: "6–8", restSec: 150, rir: "1–2" }
      : { sets: base, reps: "10–12", restSec: 75, rir: "0–1" };
  }
  if (goal === "lose") {
    return compound
      ? { sets: base, reps: "8–10", restSec: 120, rir: "1–2" }
      : { sets: base, reps: "12–15", restSec: 60, rir: "0–1" };
  }
  return compound
    ? { sets: base, reps: "8–10", restSec: 120, rir: "1–2" }
    : { sets: base, reps: "10–15", restSec: 75, rir: "1" };
}

/** Where the person trains, exercises they swapped, and their own split, if any. */
export interface PlanOptions {
  equipment?: Equipment;
  /** "<day template>#<position>" → exercise name. */
  swaps?: Record<string, string>;
  custom?: CustomDay[];
  /** Days and exercises the person put in their own order: key → original positions in the new order. */
  order?: Record<string, number[]>;
}

/** Where the order of a plan's days is kept: per split and number of days. */
export const dayOrderKey = (split: string, days: number) => `days:${split}:${days}`;
/** Where the order of a day's exercises is kept: per day and number of exercises. */
export const exerciseOrderKey = (template: string, count: number) => `ex:${template}:${count}`;


/** One exercise that fits the equipment, preferring a compound or isolation as asked and skipping ones already used. */
function pickFrom(group: MuscleGroup, where: Equipment, compound: boolean | null, used: Set<string>): { name: string; compound: boolean } | null {
  const pool = poolFor(group).filter((e) => !used.has(e.name) && allowed(where, exerciseByName(e.name)!));
  const best = pool.find((e) => e.staple && (compound === null || e.compound === compound)) ?? pool.find((e) => e.staple) ?? pool[0];
  return best ? { name: best.name, compound: best.compound } : null;
}

/** The exercises for a day: a fixed list adapted to the equipment, or picked from the muscle groups. */
function daySlots(tpl: DayTemplate, where: Equipment, count: number): Slot[] {
  const used = new Set<string>();
  const out: Slot[] = [];
  if (tpl.slots) {
    for (const slot of tpl.slots.slice(0, count)) {
      const ex = exerciseByName(slot.name);
      if (ex && allowed(where, ex) && !used.has(slot.name)) {
        out.push(slot);
        used.add(slot.name);
        continue;
      }
      // Not possible here (a barbell at home): the closest exercise for the same muscles.
      const alt = pickFrom(slot.group, where, slot.compound, used);
      if (alt) {
        out.push({ ...alt, group: slot.group });
        used.add(alt.name);
      }
    }
    return out;
  }
  const spec = tpl.groups ?? [];
  // Compound lifts first across the day, then isolation work.
  const want: { group: MuscleGroup; compound: boolean | null }[] = [];
  for (const [group, n] of spec) {
    const compounds = n >= 3 ? 2 : n >= 2 ? 1 : group === "calves" || group === "core" || group === "biceps" || group === "forearms" ? 0 : 1;
    for (let k = 0; k < n; k++) want.push({ group, compound: k < compounds ? true : group === "calves" || group === "core" ? null : false });
  }
  want.sort((x, y) => Number(y.compound === true) - Number(x.compound === true));
  for (const w of want.slice(0, Math.max(count, spec.length))) {
    const ex = pickFrom(w.group, where, w.compound, used);
    if (!ex) continue;
    out.push({ ...ex, group: w.group });
    used.add(ex.name);
  }
  return out;
}

/** The plan for the person using the app now, with their equipment, swaps and own split. */
export function planFor(s: { profile: Profile; split: SplitId; planSwaps?: Record<string, string>; customSplit?: string[][]; planOrder?: Record<string, number[]> }): TrainingPlan {
  return buildPlan(s.profile, s.split, { equipment: s.profile.equipment, swaps: s.planSwaps, custom: s.customSplit as CustomDay[] | undefined, order: s.planOrder });
}

export function buildPlan(p: Pick<Profile, "goal" | "experience" | "trainingDays">, split: SplitId, opts: PlanOptions = {}): TrainingPlan {
  const days = Math.min(6, Math.max(2, p.trainingDays));
  const resolved = resolveSplit(split, days, p.experience);
  const where = opts.equipment ?? "gym";
  const count = p.experience === "beginner" ? 5 : 6;
  const custom = (opts.custom?.length ? opts.custom : defaultCustomDays(days)).slice(0, days);
  while (custom.length < days) custom.push(defaultCustomDays(6)[custom.length] ?? ["chest"]);
  const built: [string, DayTemplate][] =
    resolved === "custom"
      ? custom.map((groups, idx) => [`custom${idx}`, { title: customTitle(groups), focus: groups.map((g) => t(groupLabel(g))).join(" · "), groups: customGroups(groups, count) }])
      : SPLIT_DAYS[resolved](days).map((key) => [key, DAYS[key]]);
  // The person can put the days in their own order (shoulders before legs…); the week fills in that order.
  const templates = inOrder(
    built.map(([key, tpl], i) => [key, tpl, i] as const),
    opts.order?.[dayOrderKey(resolved, days)],
  );

  const planned = templates.map(([key, tpl, orig], idx): PlannedDay => {
    const slots = daySlots(tpl, where, count).map((slot, pos) => {
      const swapped = opts.swaps?.[`${key}#${pos}`];
      const name = swapped && exerciseByName(swapped) ? swapped : slot.name;
      const ex = EXERCISE_BY_NAME.get(name);
      const compound = swapped ? (ex?.muscles?.length ?? 0) >= 3 || slot.compound : slot.compound;
      return { name, group: slot.group, swapKey: `${key}#${pos}`, ...scheme(p.goal, p.experience, compound), tip: ex?.tip, muscles: ex?.muscles };
    });
    const exercises = inOrder(slots, opts.order?.[exerciseOrderKey(key, slots.length)]);
    const cardio =
      p.goal === "lose"
        ? t("Finish with 15–20 min incline walk or bike (zone 2)")
        : p.goal === "maintain" && idx % 2 === 1
          ? t("Optional: 10–15 min easy cardio")
          : undefined;
    const lifting = exercises.reduce((a, e) => a + e.sets * (0.75 + e.restSec / 60), 0);
    return {
      // Stays the same when the day is moved.
      key: `${key}-${orig}`,
      template: key,
      index: orig,
      weekday: WEEK_LAYOUT[days][idx],
      // Day titles and focus are translated here; nothing compares them to English text.
      title: resolved === "custom" ? tpl.title : t(tpl.title),
      focus: resolved === "custom" ? tpl.focus : t(tpl.focus),
      exercises,
      cardio,
      estMinutes: Math.round((lifting + 8 + (cardio ? 15 : 0)) / 5) * 5,
    };
  });

  const principles = [
    t("Warm up 5–10 min, then do 1–2 lighter ramp-up sets before your first heavy exercise."),
    t("Progressive overload: when you hit the top of the rep range on every set, add 2.5 kg (upper) or 5 kg (lower) next time."),
    t('RIR = reps in reserve. "1–2" means stop each set with 1–2 good reps still in the tank.'),
    p.goal === "lose"
      ? t("Keep lifting heavy while cutting — it's what tells your body to keep its muscle. Aim for 8–10k steps a day.")
      : p.goal === "gain"
        ? t("Eat in a small surplus and sleep 7–9 hours. Expect about 0.25–0.5% bodyweight gain per week.")
        : t("Train consistently and keep protein high to slowly recompose your body."),
    t("Every 6–8 weeks take a lighter deload week (half the sets) to recover."),
  ];
  return { split: resolved, days: planned, principles };
}

export function sessionFromPlan(day: PlannedDay): SessionExercise[] {
  return day.exercises.map((e, idx) => {
    const ex = EXERCISE_BY_NAME.get(e.name);
    return {
      id: `${Date.now()}-${idx}`,
      exerciseId: ex?.id ?? e.name,
      name: e.name,
      kind: "strength",
      met: ex?.met ?? 5,
      targetReps: e.reps,
      restSec: e.restSec,
      sets: Array.from({ length: e.sets }, () => ({ reps: parseInt(e.reps, 10) || 10, weightKg: 0, done: false })),
    };
  });
}

/** "1 exercise", "3 exercises". Malay and Chinese don't pluralise, so only the noun is translated. */
export const plural = (n: number, word: string) =>
  (getState().language ?? "en") === "en" ? `${n} ${word}${n === 1 ? "" : "s"}` : `${n} ${t(word)}`;
