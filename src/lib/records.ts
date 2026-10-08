import { EXERCISES } from "../data/exercises";
import { t } from "../i18n";
import type { SessionExercise, SetEntry, WorkoutSession } from "./types";

/** Estimated one-rep max (Epley). */
export const e1rm = (kg: number, reps: number) => (reps <= 1 ? kg : kg * (1 + reps / 30));

export interface Best {
  exerciseId: string;
  name: string;
  weightKg: number;
  reps: number;
  e1rm: number;
  date: string;
}

const doneSets = (e: SessionExercise) => (e.sets ?? []).filter((s) => s.done && s.weightKg > 0 && s.reps > 0);

/** Heaviest estimated 1RM per exercise across finished workouts. */
export function personalRecords(sessions: WorkoutSession[]): Best[] {
  const best = new Map<string, Best>();
  for (const s of sessions) {
    if (!s.endedAt) continue;
    for (const e of s.exercises) {
      for (const set of doneSets(e)) {
        const est = e1rm(set.weightKg, set.reps);
        const cur = best.get(e.exerciseId);
        if (!cur || est > cur.e1rm) best.set(e.exerciseId, { exerciseId: e.exerciseId, name: e.name, weightKg: set.weightKg, reps: set.reps, e1rm: est, date: s.date });
      }
    }
  }
  return [...best.values()].sort((a, b) => b.date.localeCompare(a.date) || b.e1rm - a.e1rm);
}

/** The sets done for an exercise in the most recent finished workout that had it. */
export function lastPerformance(sessions: WorkoutSession[], exerciseId: string, excludeSessionId?: string): { date: string; sets: SetEntry[] } | null {
  const sorted = sessions.filter((s) => s.endedAt && s.id !== excludeSessionId).sort((a, b) => b.startedAt - a.startedAt);
  for (const s of sorted) {
    const e = s.exercises.find((x) => x.exerciseId === exerciseId);
    if (e && doneSets(e).length) return { date: s.date, sets: doneSets(e) };
  }
  return null;
}

const LOWER = new Set(EXERCISES.filter((e) => /leg|glute|quad|hamstring/i.test(`${e.category} ${(e.muscles ?? []).join(" ")}`)).map((e) => e.id));

export interface Suggestion {
  weightKg: number;
  text: string;
}

/**
 * Progressive overload: if every set last time reached the top of the rep range, add weight
 * (2.5 kg upper body, 5 kg legs); otherwise keep the weight and aim for more reps.
 */
export function suggestNext(last: { sets: SetEntry[] } | null, targetReps: string | undefined, exerciseId: string): Suggestion | null {
  if (!last || !last.sets.length) return null;
  const top = Math.max(...last.sets.map((s) => s.weightKg));
  const topSets = last.sets.filter((s) => s.weightKg === top);
  const [lo, hi] = (targetReps ?? "8–12").split(/[–-]/).map((x) => parseInt(x, 10));
  const upper = Number.isFinite(hi) ? hi : lo || 10;
  if (topSets.every((s) => s.reps >= upper)) {
    const step = LOWER.has(exerciseId) ? 5 : 2.5;
    return { weightKg: top + step, text: t("Hit {reps} reps on every set last time — try {kg} kg", { reps: upper, kg: top + step }) };
  }
  const best = Math.max(...topSets.map((s) => s.reps));
  return { weightKg: top, text: t("Stay at {kg} kg and aim for {reps}+ reps", { kg: top, reps: Math.min(upper, best + 1) }) };
}

/** True when this set beats the person's previous best for the exercise. */
export function isNewRecord(sessions: WorkoutSession[], exerciseId: string, set: SetEntry, currentSessionId: string) {
  if (!set.done || set.weightKg <= 0 || set.reps <= 0) return false;
  const prev = personalRecords(sessions.filter((s) => s.id !== currentSessionId)).find((b) => b.exerciseId === exerciseId);
  return !!prev && e1rm(set.weightKg, set.reps) > prev.e1rm + 0.01;
}
