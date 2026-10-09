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
  /** Ramadan (sahur / iftar) or 16:8 intermittent fasting. */
  fasting: "off" | "ramadan" | "16:8";
  /** Ramadan sahur end and iftar ("HH:MM", they change with location), and the 16:8 window start. */
  fastTimes: { sahur: string; iftar: string; windowStart: string };
  /** Daily step goal. */
  stepGoal: number;
  onboarded: boolean;
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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: number;
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
  date: string;
  title: string;
  startedAt: number;
  endedAt?: number;
  exercises: SessionExercise[];
  kcal: number;
}

export interface CustomMeal {
  id: string;
  name: string;
  items: { foodId: string; name: string; grams: number; per100: Nutrients }[];
}
