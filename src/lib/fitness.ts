import { EXERCISE_BY_NAME } from "../data/exercises";
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

export type SplitId = "auto" | "fullbody" | "upperlower" | "ppl" | "bodypart";

export const SPLITS: { id: SplitId; name: string; blurb: string }[] = [
  { id: "auto", name: "Recommended", blurb: "Picked from your days per week and experience." },
  { id: "bodypart", name: "Body-part split", blurb: "Chest · Back · Legs · Shoulders · Arms — one muscle group per day." },
  { id: "ppl", name: "Push / Pull / Legs", blurb: "Pushing muscles, pulling muscles, then legs." },
  { id: "upperlower", name: "Upper / Lower", blurb: "Alternate upper body and lower body days." },
  { id: "fullbody", name: "Full body", blurb: "Every session trains the whole body. Best for 2–3 days." },
];

interface Slot {
  name: string;
  compound: boolean;
}
interface DayTemplate {
  title: string;
  focus: string;
  slots: Slot[];
}

const c = (name: string): Slot => ({ name, compound: true });
const i = (name: string): Slot => ({ name, compound: false });

const DAYS: Record<string, DayTemplate> = {
  chest: {
    title: "Chest Day",
    focus: "Chest · Triceps",
    slots: [c("Barbell bench press"), c("Incline dumbbell press"), i("Cable crossover"), c("Chest dip"), i("Pec deck / machine fly"), i("Triceps pushdown (rope)")],
  },
  back: {
    title: "Back Day",
    focus: "Back · Rear delts",
    slots: [c("Deadlift"), c("Pull-up"), c("Barbell row"), i("Seated cable row"), i("Straight-arm pulldown"), i("Face pull")],
  },
  legs: {
    title: "Leg Day",
    focus: "Quads · Hamstrings · Glutes · Calves",
    slots: [c("Back squat"), c("Romanian deadlift"), c("Leg press"), i("Lying leg curl"), i("Leg extension"), i("Standing calf raise")],
  },
  shoulders: {
    title: "Shoulder Day",
    focus: "Delts · Traps · Core",
    slots: [c("Overhead press (barbell)"), i("Dumbbell lateral raise"), i("Rear delt fly"), c("Arnold press"), i("Dumbbell shrug"), i("Hanging leg raise")],
  },
  shoulderArms: {
    title: "Shoulders & Arms",
    focus: "Delts · Biceps · Triceps",
    slots: [c("Overhead press (barbell)"), i("Dumbbell lateral raise"), i("Barbell curl"), i("Triceps pushdown (rope)"), i("Rear delt fly"), i("Hammer curl")],
  },
  arms: {
    title: "Arm Day",
    focus: "Biceps · Triceps · Forearms",
    slots: [c("Close-grip bench press"), i("Barbell curl"), i("Skull crusher"), i("Incline dumbbell curl"), i("Overhead triceps extension"), i("Hammer curl")],
  },
  push: {
    title: "Push",
    focus: "Chest · Shoulders · Triceps",
    slots: [c("Barbell bench press"), c("Seated dumbbell shoulder press"), c("Incline dumbbell press"), i("Dumbbell lateral raise"), i("Triceps pushdown (rope)"), i("Overhead triceps extension")],
  },
  pull: {
    title: "Pull",
    focus: "Back · Biceps · Rear delts",
    slots: [c("Barbell row"), c("Lat pulldown"), i("Seated cable row"), i("Face pull"), i("Dumbbell curl"), i("Hammer curl")],
  },
  legsB: {
    title: "Legs",
    focus: "Quads · Hamstrings · Glutes",
    slots: [c("Back squat"), c("Romanian deadlift"), c("Bulgarian split squat"), i("Lying leg curl"), i("Standing calf raise"), i("Plank")],
  },
  upperA: {
    title: "Upper A",
    focus: "Strength focus",
    slots: [c("Barbell bench press"), c("Barbell row"), c("Overhead press (barbell)"), c("Pull-up"), i("Dumbbell curl"), i("Triceps pushdown (bar)")],
  },
  lowerA: {
    title: "Lower A",
    focus: "Squat focus",
    slots: [c("Back squat"), c("Romanian deadlift"), c("Walking lunge"), i("Leg extension"), i("Standing calf raise"), i("Hanging knee raise")],
  },
  upperB: {
    title: "Upper B",
    focus: "Hypertrophy focus",
    slots: [c("Incline dumbbell press"), c("Lat pulldown"), c("Seated dumbbell shoulder press"), i("Chest-supported dumbbell row"), i("Dumbbell lateral raise"), i("Hammer curl")],
  },
  lowerB: {
    title: "Lower B",
    focus: "Hinge focus",
    slots: [c("Deadlift"), c("Leg press"), c("Hip thrust"), i("Seated leg curl"), i("Seated calf raise"), i("Cable crunch")],
  },
  fullA: {
    title: "Full Body A",
    focus: "Squat · Press · Row",
    slots: [c("Goblet squat"), c("Dumbbell bench press"), c("One-arm dumbbell row"), i("Dumbbell lateral raise"), i("Glute bridge"), i("Plank")],
  },
  fullB: {
    title: "Full Body B",
    focus: "Hinge · Pull · Press",
    slots: [c("Dumbbell Romanian deadlift"), c("Lat pulldown"), c("Seated dumbbell shoulder press"), i("Walking lunge"), i("Dumbbell curl"), i("Dead bug")],
  },
  fullC: {
    title: "Full Body C",
    focus: "Legs · Push · Pull",
    slots: [c("Leg press"), c("Push-up"), c("Seated cable row"), i("Lying leg curl"), i("Triceps pushdown (rope)"), i("Russian twist")],
  },
};

const SPLIT_DAYS: Record<Exclude<SplitId, "auto">, (days: number) => string[]> = {
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
};

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
  sets: number;
  reps: string;
  restSec: number;
  rir: string;
  tip?: string;
  muscles?: string[];
}

export interface PlannedDay {
  key: string;
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

export function buildPlan(p: Pick<Profile, "goal" | "experience" | "trainingDays">, split: SplitId): TrainingPlan {
  const days = Math.min(6, Math.max(2, p.trainingDays));
  const resolved = resolveSplit(split, days, p.experience);
  const keys = SPLIT_DAYS[resolved](days);
  const count = p.experience === "beginner" ? 5 : 6;

  const planned = keys.map((key, idx): PlannedDay => {
    const t = DAYS[key];
    const exercises = t.slots.slice(0, count).map((slot) => {
      const ex = EXERCISE_BY_NAME.get(slot.name);
      return { name: slot.name, ...scheme(p.goal, p.experience, slot.compound), tip: ex?.tip, muscles: ex?.muscles };
    });
    const cardio =
      p.goal === "lose"
        ? "Finish with 15–20 min incline walk or bike (zone 2)"
        : p.goal === "maintain" && idx % 2 === 1
          ? "Optional: 10–15 min easy cardio"
          : undefined;
    const lifting = exercises.reduce((a, e) => a + e.sets * (0.75 + e.restSec / 60), 0);
    return {
      key: `${key}-${idx}`,
      weekday: WEEK_LAYOUT[days][idx],
      title: t.title,
      focus: t.focus,
      exercises,
      cardio,
      estMinutes: Math.round((lifting + 8 + (cardio ? 15 : 0)) / 5) * 5,
    };
  });

  const principles = [
    "Warm up 5–10 min, then do 1–2 lighter ramp-up sets before your first heavy exercise.",
    "Progressive overload: when you hit the top of the rep range on every set, add 2.5 kg (upper) or 5 kg (lower) next time.",
    'RIR = reps in reserve. "1–2" means stop each set with 1–2 good reps still in the tank.',
    p.goal === "lose"
      ? "Keep lifting heavy while cutting — it's what tells your body to keep its muscle. Aim for 8–10k steps a day."
      : p.goal === "gain"
        ? "Eat in a small surplus and sleep 7–9 hours. Expect about 0.25–0.5% bodyweight gain per week."
        : "Train consistently and keep protein high to slowly recompose your body.",
    "Every 6–8 weeks take a lighter deload week (half the sets) to recover.",
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

/** "1 exercise", "3 exercises". */
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
