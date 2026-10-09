import { t as tr } from "../i18n";
import type { CycleSettings, PeriodEntry, Profile } from "./types";

/** Cycle settings that apply: tracking is only for women, even if it was switched on before a change of sex. */
export const cycleOf = (p: Pick<Profile, "sex" | "cycle">): CycleSettings => ({ ...p.cycle, on: !!p.cycle?.on && p.sex === "female" });

// Menstrual cycle: predictions from the user's own logged period starts. Estimates for planning
// training and food around how you feel; not medical advice and not a method of contraception.

export type Phase = "period" | "follicular" | "ovulation" | "luteal" | "late";

export interface CycleStatus {
  /** Day of the current cycle, 1 = first day of the last period. */
  day: number;
  /** Average cycle length used for the prediction. */
  length: number;
  phase: Phase;
  /** Predicted first day of the next period (YYYY-MM-DD). */
  nextStart: string;
  /** Days until then (0 = today); negative when late. */
  daysUntil: number;
}

const DAY = 86_400_000;
const toDay = (key: string) => Math.round(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)) / DAY);
const fromDay = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);

/** Distinct period start dates, oldest first. */
export const starts = (periods: Pick<PeriodEntry, "date">[]) => [...new Set(periods.map((p) => p.date))].sort();

/** Average of the last six cycle lengths (ignoring gaps that look like a missed log), else the setting. */
export function averageLength(periods: Pick<PeriodEntry, "date">[], fallback: number): number {
  const s = starts(periods).map(toDay);
  const gaps: number[] = [];
  for (let i = 1; i < s.length; i++) {
    const g = s[i] - s[i - 1];
    if (g >= 18 && g <= 50) gaps.push(g);
  }
  const recent = gaps.slice(-6);
  return recent.length ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : fallback;
}

/** How long periods usually last: the average of the last six with a marked end, else the setting. */
export function periodLength(periods: Pick<PeriodEntry, "date" | "end">[], fallback: number): number {
  const lengths = periods
    .filter((p) => p.end && p.end >= p.date)
    .map((p) => toDay(p.end!) - toDay(p.date) + 1)
    .filter((n) => n >= 1 && n <= 12)
    .slice(-6);
  return lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : fallback;
}

/** Last day of a period: the marked end, or (still going) the usual length. */
const lastDayOf = (p: Pick<PeriodEntry, "date" | "end">, usual: number) => (p.end ? toDay(p.end) : toDay(p.date) + usual - 1);

/** Every day marked as a period day up to today (an ongoing period counts up to today). */
export function periodDays(periods: Pick<PeriodEntry, "date" | "end">[], settings: Pick<CycleSettings, "periodDays">, today: string): Set<string> {
  const usual = periodLength(periods, settings.periodDays);
  const now = toDay(today);
  const out = new Set<string>();
  for (const p of periods) for (let d = toDay(p.date); d <= Math.min(lastDayOf(p, usual), now); d++) out.add(fromDay(d));
  return out;
}

/** The days of the next predicted period (for the calendar). */
export function predictedDays(status: CycleStatus | null, periods: Pick<PeriodEntry, "date" | "end">[], settings: Pick<CycleSettings, "periodDays">): Set<string> {
  const out = new Set<string>();
  if (!status) return out;
  const usual = periodLength(periods, settings.periodDays);
  // When late, the prediction moves to today.
  const start = toDay(status.nextStart) + Math.max(0, -status.daysUntil);
  for (let d = start; d < start + usual; d++) out.add(fromDay(d));
  return out;
}

/**
 * Tap a day on the calendar: mark it as a period day, or unmark it. Neighbouring days join into one
 * period. A period that reaches today and is shorter than usual stays open (it's probably still going).
 */
export function togglePeriodDay(periods: PeriodEntry[], day: string, settings: Pick<CycleSettings, "periodDays">, today: string, now = Date.now()): PeriodEntry[] {
  if (day > today) return periods;
  const usual = periodLength(periods, settings.periodDays);
  const days = periodDays(periods, settings, today);
  if (days.has(day)) days.delete(day);
  else days.add(day);
  const sorted = [...days].map(toDay).sort((a, b) => a - b);
  const runs: [number, number][] = [];
  for (const d of sorted) {
    const last = runs[runs.length - 1];
    if (last && d === last[1] + 1) last[1] = d;
    else runs.push([d, d]);
  }
  const t = toDay(today);
  return runs.map(([a, b], i) => {
    const kept = periods.find((p) => p.date === fromDay(a));
    const ongoing = b === t && b - a + 1 < usual;
    return { id: kept?.id ?? `p-${a}-${i}`, date: fromDay(a), ...(ongoing ? {} : { end: fromDay(b) }), createdAt: kept?.createdAt ?? now };
  });
}

export function cycleStatus(settings: CycleSettings, periods: Pick<PeriodEntry, "date" | "end">[], today: string): CycleStatus | null {
  if (!settings.on) return null;
  const past = starts(periods).filter((d) => d <= today);
  if (!past.length) return null;
  const length = averageLength(periods, settings.length);
  const last = toDay(past[past.length - 1]);
  const now = toDay(today);
  const day = now - last + 1;
  const next = last + length;
  const daysUntil = next - now;
  // Ovulation is about 14 days before the next period, whatever the cycle length.
  const ovulation = length - 14;
  let phase: Phase;
  const latest = periods.filter((p) => p.date === past[past.length - 1])[0];
  const periodLong = latest ? lastDayOf(latest, periodLength(periods, settings.periodDays)) - last + 1 : settings.periodDays;
  if (day <= periodLong) phase = "period";
  else if (daysUntil < 0) phase = "late";
  else if (Math.abs(day - ovulation) <= 1) phase = "ovulation";
  else if (day < ovulation) phase = "follicular";
  else phase = "luteal";
  return { day, length, phase, nextStart: fromDay(next), daysUntil };
}

export const phaseName = (p: Phase) =>
  ({
    period: tr("Period"),
    follicular: tr("Follicular phase"),
    ovulation: tr("Ovulation"),
    luteal: tr("Luteal phase"),
    late: tr("Period late"),
  })[p];

/** What this phase usually means for training and eating. */
export function phaseTip(s: CycleStatus): string {
  switch (s.phase) {
    case "period":
      return tr("Train as you feel: lighter sessions, walking or mobility are fine on tired days. Iron-rich foods like red meat, spinach and lentils help.");
    case "follicular":
      return tr("Energy usually rises now — a good week to push heavier lifts or try for a personal record.");
    case "ovulation":
      return tr("Often when you feel strongest. Warm up well; joints can be a little looser around ovulation.");
    case "luteal":
      return tr("Appetite can rise — you may burn 100–300 kcal more a day. Protein and fibre keep you full, and a little water weight on the scale is normal.");
    case "late":
      return tr("{n} days late. Stress, travel, hard training and eating too little can all delay a period. If it keeps happening or you might be pregnant, see a doctor.", { n: -s.daysUntil });
  }
}

/** Show the "Period started" button when it's due soon, due today or late. */
export const periodDue = (s: CycleStatus | null) => !!s && s.phase !== "period" && s.daysUntil <= 3;
