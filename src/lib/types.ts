export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  satFat: number;
  /** milligrams */
  sodium: number;
}

export interface Serving {
  label: string;
  grams: number;
}

export interface Food {
  id: string;
  name: string;
  category: string;
  per100: Nutrients;
  servings: Serving[];
  aliases?: string;
  brand?: string;
  source: "db" | "custom" | "online" | "photo";
  /** Reference database the food comes from (USDA SR28), shown as a small label. */
  dataset?: "usda";
  /** An everyday staple from the core list; ranked first in search. */
  staple?: boolean;
  /** Parts of a mixed dish (rice, sambal, egg…) the user can adjust. */
  recipe?: import("../data/dishes").RecipePart[];
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface LogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  meal: MealType;
  name: string;
  grams: number;
  nutrients: Nutrients; // for this portion
  source: Food["source"];
  createdAt: number;
  /** For customised dishes: what changed, e.g. "2 × Fried egg · no Peanuts". */
  note?: string;
}

export type Sex = "male" | "female";
export type Goal = "lose" | "maintain" | "gain";
export type Experience = "beginner" | "intermediate" | "advanced";

export interface Profile {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
  goal: Goal;
  experience: Experience;
  trainingDays: number;
  diet: "anything" | "halal" | "vegetarian" | "vegan";
  /** Foods to warn about and leave out of plans. */
  allergies: Allergen[];
  /** Foods the person just doesn't eat: a food group ("vegetables", "beef"…) or a word they typed ("durian"). */
  dislikes?: string[];
  /** Ramadan (sahur / iftar) or 16:8 intermittent fasting. */
  fasting: "off" | "ramadan" | "16:8";
  /** Ramadan sahur end and iftar ("HH:MM", they change with location), and the 16:8 window start. */
  fastTimes: { sahur: string; iftar: string; windowStart: string };
  /** Daily step goal. */
  stepGoal: number;
  /** Menstrual cycle tracking (off unless turned on). */
  cycle: CycleSettings;
  /** Water added per tap, in ml (250 when unset). */
  waterServingMl?: number;
  /** Profile picture: a small square JPEG as a data URL. */
  photo?: string;
  onboarded: boolean;
}

export interface CycleSettings {
  on: boolean;
  /** Usual cycle length in days, used until enough periods are logged to learn it. */
  length: number;
  /** Usual period length in days. */
  periodDays: number;
  /** Notify two days before the next period is expected. */
  remind: boolean;
}

/** The first day of a period. */
export interface PeriodEntry {
  id: string;
  /** First day of the period. */
  date: string;
  /** Last day, once known (marked on the calendar). Without it the usual period length is assumed. */
  end?: string;
  createdAt: number;
}

export type Allergen = "peanuts" | "treeNuts" | "shellfish" | "fish" | "dairy" | "egg" | "gluten" | "soy" | "sesame";

export interface WeightEntry {
  id: string;
  date: string;
  kg: number;
  createdAt: number;
}

/** Per-day extras. The id is the date (YYYY-MM-DD). */
export interface DayStats {
  id: string;
  /** When this item was last changed; sync keeps the newer copy. */
  updatedAt?: number;
  waterMl: number;
  steps: number;
  /** Steps came from Apple Health / Health Connect rather than typed in. */
  stepsFromHealth?: boolean;
}

export interface Reminders {
  meals: boolean;
  water: boolean;
  gym: boolean;
  breakfast: string; // "HH:MM"
  lunch: string;
  dinner: string;
  gymTime: string;
}


export type ExerciseKind = "cardio" | "strength";

export interface Exercise {
  id: string;
  name: string;
  kind: ExerciseKind;
  category: string;
  met: number;
  muscles?: string[];
  equipment?: string;
  tip?: string;
  aliases?: string;
}

export interface SetEntry {
  reps: number;
  weightKg: number;
  done: boolean;
}

export interface SessionExercise {
  id: string;
  exerciseId: string;
  name: string;
  kind: ExerciseKind;
  met: number;
  /** cardio: minutes performed */
  minutes?: number;
  sets?: SetEntry[];
  /** plan target, e.g. "8–12" */
  targetReps?: string;
  /** Rest between sets, from the plan. */
  restSec?: number;
}

export interface WorkoutSession {
  id: string;
  /** When this item was last changed; sync keeps the newer copy. */
  updatedAt?: number;
  date: string;
  title: string;
  startedAt: number;
  endedAt?: number;
  exercises: SessionExercise[];
  kcal: number;
}

export interface CustomMeal {
  id: string;
  /** When this item was last changed; sync keeps the newer copy. */
  updatedAt?: number;
  name: string;
  items: { foodId: string; name: string; grams: number; per100: Nutrients }[];
}
