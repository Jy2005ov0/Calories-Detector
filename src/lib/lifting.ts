import { e1rm } from "./records";
import type { WorkoutSession } from "./types";

/** Plates per side for a target weight, heaviest first, with what's left over if it can't be made exactly. */
export function platesFor(totalKg: number, barKg = 20, available: number[] = [25, 20, 15, 10, 5, 2.5, 1.25]): { perSide: number[]; leftover: number } {
  let side = Math.max(0, (totalKg - barKg) / 2);
  const perSide: number[] = [];
  for (const p of [...available].sort((a, b) => b - a)) {
    while (side + 1e-9 >= p) {
      perSide.push(p);
      side -= p;
    }
  }
  return { perSide, leftover: Math.round(side * 2 * 100) / 100 };
}

/** Estimated one-rep max: the average of Epley and Brzycki, which agree closely up to about 10 reps. */
export function oneRepMax(kg: number, reps: number): number {
  if (kg <= 0 || reps <= 0) return 0;
  if (reps === 1) return kg;
  const brzycki = reps < 37 ? kg * (36 / (37 - reps)) : e1rm(kg, reps);
  return Math.round(((e1rm(kg, reps) + brzycki) / 2) * 10) / 10;
}

/** Weight you could lift for a number of reps, from a one-rep max (Epley, rearranged). */
export const weightForReps = (oneRm: number, reps: number) => (reps <= 1 ? oneRm : oneRm / (1 + reps / 30));

/** Round to the nearest weight you can load (2.5 kg steps by default). */
export const roundToPlate = (kg: number, step = 2.5) => Math.round(kg / step) * step;

/**
 * Warm-up sets before a working weight: the empty bar, then about 40%, 60% and 80%,
 * with fewer reps as the weight goes up. Light working weights get fewer warm-ups.
 */
export function warmupSets(workKg: number, barKg = 20): { kg: number; reps: number }[] {
  if (workKg <= barKg) return [];
  const steps: [number, number][] = workKg < 40 ? [[0.5, 8], [0.75, 5]] : [[0.4, 8], [0.6, 5], [0.8, 3]];
  const out: { kg: number; reps: number }[] = [{ kg: barKg, reps: 10 }];
  for (const [pct, reps] of steps) {
    const kg = Math.max(barKg, roundToPlate(workKg * pct));
    if (kg > out[out.length - 1].kg && kg < workKg) out.push({ kg, reps });
  }
  return out;
}

/** Best estimated 1RM and total volume for one exercise in each finished workout, oldest first (for charts). */
export function exerciseHistory(sessions: WorkoutSession[], exerciseId: string): { date: string; best: number; volume: number }[] {
  const out: { date: string; best: number; volume: number }[] = [];
  for (const s of [...sessions].filter((x) => x.endedAt).sort((a, b) => a.startedAt - b.startedAt)) {
    let best = 0;
    let volume = 0;
    for (const e of s.exercises) {
      if (e.exerciseId !== exerciseId) continue;
      for (const set of e.sets ?? []) {
        if (!set.done || set.warmup || set.reps <= 0 || set.weightKg <= 0) continue;
        best = Math.max(best, e1rm(set.weightKg, set.reps));
        volume += set.weightKg * set.reps;
      }
    }
    if (best > 0) out.push({ date: s.date, best: Math.round(best * 10) / 10, volume: Math.round(volume) });
  }
  return out;
}

/** Strength exercises done with weights, most often first (for picking a chart). */
export function liftedExercises(sessions: WorkoutSession[]): { exerciseId: string; name: string; count: number }[] {
  const map = new Map<string, { exerciseId: string; name: string; count: number }>();
  for (const s of sessions) {
    if (!s.endedAt) continue;
    for (const e of s.exercises) {
      if (!(e.sets ?? []).some((x) => x.done && x.weightKg > 0)) continue;
      const cur = map.get(e.exerciseId) ?? { exerciseId: e.exerciseId, name: e.name, count: 0 };
      cur.count++;
      map.set(e.exerciseId, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/** Minutes trained per day (finished workouts), for the calendar. */
export function trainingDays(sessions: WorkoutSession[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    if (!s.endedAt) continue;
    map.set(s.date, (map.get(s.date) ?? 0) + Math.max(1, Math.round((s.endedAt - s.startedAt) / 60000)));
  }
  return map;
}
