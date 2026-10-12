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

// ── A late or missed period ─────────────────────────────

/** How late, in bands that change the advice. */
export type LateLevel = "few" | "late" | "long" | "missed";

/** Something in the person's own data that can delay a period. */
export type LateSignal =
  | { kind: "lowIntake"; kcal: number; target: number; days: number }
  | { kind: "weightLoss"; kg: number }
  | { kind: "training"; sessions: number }
  | { kind: "underweight"; bmi: number }
  | { kind: "fasting" }
  | { kind: "irregular"; min: number; max: number };

export interface LateAdvice {
  level: LateLevel;
  daysLate: number;
  /** Days since the last period started. */
  sinceLast: number;
  signals: LateSignal[];
  /** Old enough that perimenopause is a possible reason. */
  over40: boolean;
}

/** Shortest and longest of the recent cycles (gaps up to 90 days count here), when there are at least three. */
export function cycleRange(periods: Pick<PeriodEntry, "date">[]): { min: number; max: number } | null {
  const s = starts(periods).map(toDay);
  const gaps: number[] = [];
  for (let i = 1; i < s.length; i++) {
    const g = s[i] - s[i - 1];
    if (g >= 18 && g <= 90) gaps.push(g);
  }
  const recent = gaps.slice(-6);
  return recent.length >= 3 ? { min: Math.min(...recent), max: Math.max(...recent) } : null;
}

export interface LateInput {
  periods: Pick<PeriodEntry, "date">[];
  weights: { date: string; kg: number }[];
  log: { date: string; meal: string; nutrients: { kcal: number } }[];
  sessions: { date: string }[];
  profile: Pick<Profile, "age" | "heightCm" | "weightKg" | "fasting">;
  kcalTarget: number;
  today: string;
}

/**
 * Advice for a period that hasn't come when expected: how late it is, and what in the person's own
 * logs (eating, weight, training, fasting) could explain it. Null unless the period is late.
 */
export function lateAdvice(status: CycleStatus | null, d: LateInput): LateAdvice | null {
  if (!status || status.phase !== "late") return null;
  const daysLate = -status.daysUntil;
  const sinceLast = status.day - 1;
  const level: LateLevel = sinceLast >= 90 ? "missed" : daysLate >= 14 ? "long" : daysLate >= 5 ? "late" : "few";
  const now = toDay(d.today);
  const within = (date: string, days: number) => now - toDay(date) < days && toDay(date) <= now;
  const signals: LateSignal[] = [];

  // Eating: the last four weeks, counting only days logged fully enough to mean something (2+ meals).
  const byDay = new Map<string, { kcal: number; meals: Set<string> }>();
  for (const e of d.log) {
    if (!within(e.date, 28)) continue;
    const day = byDay.get(e.date) ?? { kcal: 0, meals: new Set<string>() };
    day.kcal += e.nutrients.kcal;
    day.meals.add(e.meal);
    byDay.set(e.date, day);
  }
  const full = [...byDay.values()].filter((x) => x.meals.size >= 2);
  if (full.length >= 7) {
    const avg = Math.round(full.reduce((a, x) => a + x.kcal, 0) / full.length / 10) * 10;
    if (avg < Math.max(1200, d.kcalTarget * 0.8)) signals.push({ kind: "lowIntake", kcal: avg, target: d.kcalTarget, days: full.length });
  }

  // Weight: lost 5% or more over about two months.
  const recent = d.weights.filter((w) => within(w.date, 63)).sort((a, b) => a.date.localeCompare(b.date));
  if (recent.length >= 2) {
    const lost = recent[0].kg - recent[recent.length - 1].kg;
    if (lost >= recent[0].kg * 0.05) signals.push({ kind: "weightLoss", kg: Math.round(lost * 10) / 10 });
  }

  // Training: four or more sessions a week for the last four weeks.
  const sessions = d.sessions.filter((s) => within(s.date, 28)).length;
  if (sessions >= 16) signals.push({ kind: "training", sessions });

  const m = d.profile.heightCm / 100;
  const bmi = m > 0 ? d.profile.weightKg / (m * m) : 0;
  if (bmi > 0 && bmi < 18.5) signals.push({ kind: "underweight", bmi: Math.round(bmi * 10) / 10 });
  if (d.profile.fasting !== "off") signals.push({ kind: "fasting" });

  const range = cycleRange(d.periods);
  if (range && range.max - range.min >= 9) signals.push({ kind: "irregular", ...range });

  return { level, daysLate, sinceLast, signals, over40: d.profile.age >= 40 };
}
