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

export function cycleStatus(settings: CycleSettings, periods: Pick<PeriodEntry, "date">[], today: string): CycleStatus | null {
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
  if (day <= settings.periodDays) phase = "period";
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
