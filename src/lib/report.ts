import { addDays } from "./progress";
import { sum, type Targets } from "./nutrition";
import type { DayStats, LogEntry, Nutrients, WorkoutSession } from "./types";

export interface DayTotal {
  date: string;
  n: Nutrients;
}

export type Tip = "logMore" | "protein" | "fibre" | "sodium" | "sugar" | "over" | "under" | "water" | "great";

export interface WeeklyReport {
  from: string;
  to: string;
  daysLogged: number;
  avg: Nutrients | null;
  /** The logged day closest to the calorie target with protein near target, and the one furthest from it. */
  best: DayTotal | null;
  worst: DayTotal | null;
  workouts: number;
  workoutMinutes: number;
  avgWaterMl: number | null;
  avgSteps: number | null;
  avgSleepH: number | null;
  tip: Tip;
}

const avgOf = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** The last seven days (ending today) against the person's targets, with one thing to work on next week. */
export function weeklyReport(log: LogEntry[], days: DayStats[], sessions: WorkoutSession[], tg: Targets, today: string, waterGoalMl: number): WeeklyReport {
  const from = addDays(today, -6);
  const inWeek = (d: string) => d >= from && d <= today;
  const byDay = new Map<string, LogEntry[]>();
  for (const e of log) if (inWeek(e.date)) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  const totals: DayTotal[] = [...byDay.entries()].map(([date, es]) => ({ date, n: sum(es.map((e) => e.nutrients)) })).sort((a, b) => a.date.localeCompare(b.date));
  const avg = totals.length ? (Object.fromEntries(Object.keys(totals[0].n).map((k) => [k, totals.reduce((a, d) => a + d.n[k as keyof Nutrients], 0) / totals.length])) as unknown as Nutrients) : null;
  // A day scores worse the further its calories are from target, and when protein falls short.
  const score = (d: DayTotal) => Math.abs(d.n.kcal - tg.kcal) / tg.kcal + Math.max(0, 1 - d.n.protein / tg.protein);
  const ranked = [...totals].sort((a, b) => score(a) - score(b));
  const weekDays = days.filter((d) => inWeek(d.id));
  const done = sessions.filter((s) => s.endedAt && inWeek(s.date));
  const avgWaterMl = avgOf(weekDays.filter((d) => d.waterMl > 0).map((d) => d.waterMl));
  const report: WeeklyReport = {
    from,
    to: today,
    daysLogged: totals.length,
    avg,
    best: ranked.length > 1 ? ranked[0] : null,
    worst: ranked.length > 1 ? ranked[ranked.length - 1] : null,
    workouts: done.length,
    workoutMinutes: Math.round(done.reduce((a, s) => a + (s.endedAt! - s.startedAt) / 60000, 0)),
    avgWaterMl: avgWaterMl === null ? null : Math.round(avgWaterMl),
    avgSteps: (() => {
      const v = avgOf(weekDays.filter((d) => (d.steps ?? 0) > 0).map((d) => d.steps!));
      return v === null ? null : Math.round(v);
    })(),
    avgSleepH: (() => {
      const v = avgOf(weekDays.filter((d) => d.sleepH).map((d) => d.sleepH!));
      return v === null ? null : Math.round(v * 10) / 10;
    })(),
    tip: "great",
  };
  report.tip = pickTip(report, tg, waterGoalMl);
  return report;
}

/** The one thing most worth changing next week, in order of how much it matters. */
function pickTip(r: WeeklyReport, tg: Targets, waterGoalMl: number): Tip {
  if (!r.avg || r.daysLogged < 3) return "logMore";
  if (r.avg.kcal > tg.kcal * 1.1) return "over";
  if (r.avg.kcal < tg.kcal * 0.75) return "under";
  if (r.avg.protein < tg.protein * 0.8) return "protein";
  if (r.avg.sugar > tg.sugarMax * 1.2) return "sugar";
  if (r.avg.sodium > tg.sodiumMax * 1.2) return "sodium";
  if (r.avg.fiber < tg.fiber * 0.6) return "fibre";
  if (r.avgWaterMl !== null && r.avgWaterMl < waterGoalMl * 0.7) return "water";
  return "great";
}

export interface SleepInsight {
  /** Days with 7+ hours of sleep vs fewer. */
  rested: number;
  short: number;
  /** Average energy (1–5) on each kind of day. */
  energyRested: number | null;
  energyShort: number | null;
  /** Average minutes trained on each kind of day. */
  trainRested: number;
  trainShort: number;
}

/** How sleep lines up with energy and training, once there are at least three days of each kind. */
export function sleepInsight(days: DayStats[], sessions: WorkoutSession[]): SleepInsight | null {
  const withSleep = days.filter((d) => d.sleepH !== undefined);
  const rested = withSleep.filter((d) => d.sleepH! >= 7);
  const short = withSleep.filter((d) => d.sleepH! < 7);
  if (rested.length < 3 || short.length < 3) return null;
  const minutes = (date: string) => sessions.filter((s) => s.endedAt && s.date === date).reduce((a, s) => a + (s.endedAt! - s.startedAt) / 60000, 0);
  const energy = (list: DayStats[]) => {
    const v = avgOf(list.filter((d) => d.energy).map((d) => d.energy!));
    return v === null ? null : Math.round(v * 10) / 10;
  };
  return {
    rested: rested.length,
    short: short.length,
    energyRested: energy(rested),
    energyShort: energy(short),
    trainRested: Math.round(avgOf(rested.map((d) => minutes(d.id)))!),
    trainShort: Math.round(avgOf(short.map((d) => minutes(d.id)))!),
  };
}
