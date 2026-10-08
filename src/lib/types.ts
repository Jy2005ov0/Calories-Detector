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
  onboarded: boolean;
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
