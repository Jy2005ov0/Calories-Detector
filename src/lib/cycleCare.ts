import { t as tr } from "../i18n";
import { periodDays, periodLength, starts, type CycleStatus, type Phase } from "./cycle";
import type { CycleSettings, DayStats, Flow, PeriodEntry, PillSettings, Profile, Symptom } from "./types";

// Extras around the cycle: symptoms and their patterns, a health check of past cycles, the fertile
// window, training and food by phase, the pill pack, and Ramadan fasts to replace. All estimates for
// planning; not medical advice and not birth control.

const DAY = 86_400_000;
const toDay = (key: string) => Math.round(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)) / DAY);
const fromDay = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);

// ── Flow and symptoms ───────────────────────────────────

export const FLOWS: Flow[] = ["spotting", "light", "medium", "heavy"];
export const SYMPTOMS: Symptom[] = ["cramps", "headache", "bloating", "breasts", "backPain", "acne", "tired", "lowMood", "cravings", "nausea"];

export const flowName = (f: Flow) => ({ spotting: tr("Spotting"), light: tr("Light"), medium: tr("Medium"), heavy: tr("Heavy") })[f];
export const symptomName = (s: Symptom) =>
  ({
    cramps: tr("Cramps"),
    headache: tr("Headache"),
    bloating: tr("Bloating"),
    breasts: tr("Tender breasts"),
    backPain: tr("Back pain"),
    acne: tr("Acne"),
    tired: tr("Tired"),
    lowMood: tr("Low mood"),
    cravings: tr("Cravings"),
    nausea: tr("Nausea"),
  })[s];

/** A symptom that keeps coming at the same point in the cycle. */
export interface SymptomPattern {
  symptom: Symptom;
  /** "before": days before a period starts; "during": days of the period. */
  when: "before" | "during";
  from: number;
  to: number;
  /** In how many cycles it happened then. */
  cycles: number;
}

/**
 * Symptoms that came at about the same point in two or more cycles: "headaches 1–2 days before your
 * period", "cramps on days 1–2". Each cycle counts once, by the first day the symptom was logged.
 */
export function symptomPatterns(periods: Pick<PeriodEntry, "date">[], days: Pick<DayStats, "id" | "symptoms">[]): SymptomPattern[] {
  const s = starts(periods).map(toDay);
  if (s.length < 2) return [];
  const out: SymptomPattern[] = [];
  for (const symptom of SYMPTOMS) {
    const before = new Map<number, number>();
    const during = new Map<number, number>();
    for (const d of days) {
      if (!d.symptoms?.includes(symptom)) continue;
      const n = toDay(d.id);
      // The period this day belongs to (the last start on or before it), and the one after.
      let i = -1;
      while (i + 1 < s.length && s[i + 1] <= n) i++;
      const dayOf = i >= 0 ? n - s[i] + 1 : 0;
      const until = i + 1 < s.length ? s[i + 1] - n : 0;
      if (dayOf >= 1 && dayOf <= 7) {
        const prev = during.get(i);
        if (prev === undefined || dayOf < prev) during.set(i, dayOf);
      } else if (until >= 1 && until <= 10) {
        const prev = before.get(i + 1);
        if (prev === undefined || until > prev) before.set(i + 1, until);
      }
    }
    const add = (when: "before" | "during", m: Map<number, number>) => {
      if (m.size < 2) return;
      const v = [...m.values()].sort((a, b) => a - b);
      // Close together across cycles (within 3 days of each other), else it isn't a pattern.
      if (v[v.length - 1] - v[0] > 3) return;
      out.push({ symptom, when, from: v[0], to: v[v.length - 1], cycles: m.size });
    };
    add("before", before);
    add("during", during);
  }
  return out.sort((a, b) => b.cycles - a.cycles);
}

export function patternText(p: SymptomPattern): string {
  const name = symptomName(p.symptom);
  const range = p.from === p.to ? String(p.from) : `${p.from}–${p.to}`;
  return p.when === "before"
    ? tr("{symptom}: usually {range} days before your period ({n} cycles)", { symptom: name, range, n: p.cycles })
    : tr("{symptom}: usually on day {range} of your period ({n} cycles)", { symptom: name, range, n: p.cycles });
}

/** Patterns due about now: "before" ones in the days ahead of the predicted period. */
export function earlyWarnings(patterns: SymptomPattern[], status: CycleStatus | null): SymptomPattern[] {
  if (!status || status.phase === "period" || status.phase === "late") return [];
  return patterns.filter((p) => p.when === "before" && status.daysUntil >= 1 && status.daysUntil <= p.to + 1 && status.daysUntil >= p.from - 1);
}

// ── Past cycles and a health check ──────────────────────

export interface PastCycle {
  start: string;
  /** Days to the next period; null for the one going on now. */
  length: number | null;
  /** Days of bleeding (marked, or the usual length). */
  bleeding: number;
  /** Days logged as heavy flow in it. */
  heavyDays: number;
}

export function pastCycles(periods: Pick<PeriodEntry, "date" | "end">[], settings: Pick<CycleSettings, "periodDays">, days: Pick<DayStats, "id" | "flow">[]): PastCycle[] {
  const usual = periodLength(periods, settings.periodDays);
  const sorted = [...periods].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((p, i) => {
    const next = sorted[i + 1];
    const a = toDay(p.date);
    const bleeding = p.end ? toDay(p.end) - a + 1 : usual;
    const until = next ? toDay(next.date) : Infinity;
    const heavyDays = days.filter((d) => d.flow === "heavy" && toDay(d.id) >= a && toDay(d.id) < until).length;
    return { start: p.date, length: next ? toDay(next.date) - a : null, bleeding, heavyDays };
  });
}

export type HealthFlag = "short" | "long" | "irregular" | "longPeriods" | "heavy" | "between" | "missed";

export interface HealthCheck {
  /** Average and spread of the finished cycles (last six). */
  average: number | null;
  shortest: number | null;
  longest: number | null;
  /** Regular when the cycles vary by less than 8 days; null with fewer than three. */
  regular: boolean | null;
  flags: HealthFlag[];
}

/**
 * Looks over the last six cycles for things worth showing a doctor: cycles often shorter than 21 or
 * longer than 35 days, a spread of 8+ days, periods over 7 days, a lot of heavy flow, bleeding between
 * periods, or no period for 90 days.
 */
export function healthCheck(cycles: PastCycle[], days: Pick<DayStats, "id" | "flow">[], periods: Pick<PeriodEntry, "date" | "end">[], settings: Pick<CycleSettings, "periodDays">, today: string): HealthCheck {
  const done = cycles.filter((c) => c.length !== null && c.length <= 90).slice(-6);
  const lengths = done.map((c) => c.length!);
  const flags: HealthFlag[] = [];
  const average = lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : null;
  const shortest = lengths.length ? Math.min(...lengths) : null;
  const longest = lengths.length ? Math.max(...lengths) : null;
  const regular = lengths.length >= 3 ? longest! - shortest! < 8 : null;
  if (lengths.filter((n) => n < 21).length >= 2) flags.push("short");
  if (lengths.filter((n) => n > 35).length >= 2) flags.push("long");
  if (regular === false) flags.push("irregular");
  const recent = cycles.slice(-6);
  if (recent.filter((c) => c.bleeding > 7).length >= 2) flags.push("longPeriods");
  if (recent.some((c) => c.heavyDays >= 4) || recent.filter((c) => c.heavyDays >= 3).length >= 2) flags.push("heavy");
  // Spotting or flow logged on days that aren't part of a period.
  const bleed = periodDays(periods, settings, today);
  if (days.filter((d) => d.flow && !bleed.has(d.id) && d.id <= today).length >= 3) flags.push("between");
  const last = starts(periods).filter((d) => d <= today).pop();
  if (last && toDay(today) - toDay(last) >= 90) flags.push("missed");
  return { average, shortest, longest, regular, flags };
}

export const flagText = (f: HealthFlag) =>
  ({
    short: tr("Cycles shorter than 21 days, more than once"),
    long: tr("Cycles longer than 35 days, more than once"),
    irregular: tr("Cycle length changes a lot from month to month"),
    longPeriods: tr("Periods lasting more than 7 days"),
    heavy: tr("Several days of heavy flow"),
    between: tr("Bleeding or spotting between periods"),
    missed: tr("No period for 90 days or more"),
  })[f];

// ── Fertile window ──────────────────────────────────────

/** Estimated fertile days (five before ovulation to one after) and ovulation days, for this cycle and the next two. */
export function fertileDays(status: CycleStatus | null): { fertile: Set<string>; ovulation: Set<string> } {
  const fertile = new Set<string>();
  const ovulation = new Set<string>();
  if (!status) return { fertile, ovulation };
  const start = toDay(status.nextStart) - status.length;
  for (let k = 0; k < 3; k++) {
    const ov = start + k * status.length + status.length - 14;
    ovulation.add(fromDay(ov));
    for (let d = ov - 5; d <= ov + 1; d++) fertile.add(fromDay(d));
  }
  return { fertile, ovulation };
}

export const inFertileWindow = (status: CycleStatus | null) => !!status && status.phase !== "period" && status.phase !== "late" && Math.abs(status.day - (status.length - 14) + 2) <= 3;

// ── Training by phase ───────────────────────────────────

export interface TrainingTip {
  tone: "lighter" | "push" | "steady";
  title: string;
  body: string;
}

export function trainingTip(s: CycleStatus | null): TrainingTip | null {
  if (!s) return null;
  const pre = s.phase === "luteal" && s.daysUntil <= 3;
  if (s.phase === "period" && s.day <= 2)
    return { tone: "lighter", title: tr("Period day {n}: go by feel", { n: s.day }), body: tr("If you're tired or crampy, use about 80% of your usual weights, drop a set, or swap for a walk or mobility. Moving often eases cramps.") };
  if (s.phase === "period") return { tone: "steady", title: tr("Period day {n}", { n: s.day }), body: tr("Energy usually comes back from now. Train as normal if you feel good.") };
  if (s.phase === "follicular") return { tone: "push", title: tr("Strong days ahead"), body: tr("Energy and recovery are usually at their best now: a good week for heavier lifts or a personal record.") };
  if (s.phase === "ovulation") return { tone: "push", title: tr("Peak strength"), body: tr("Often when you feel strongest. Warm up well; joints can be a little looser now.") };
  if (pre) return { tone: "lighter", title: tr("Period in {n} days", { n: Math.max(1, s.daysUntil) }), body: tr("You may feel heavier and more tired. Keep the weights, add a little rest between sets, and don't chase records.") };
  if (s.phase === "luteal") return { tone: "steady", title: tr("Steady week"), body: tr("Keep training as planned. Hot days can feel harder now; drink a little more water.") };
  return null;
}

// ── Food by phase ───────────────────────────────────────

/** Extra calories in the luteal phase, when it's switched on (the body burns a little more then). */
export const LUTEAL_KCAL = 150;
export const cycleKcal = (settings: Pick<CycleSettings, "lutealKcal">, status: CycleStatus | null) => (settings.lutealKcal && status?.phase === "luteal" ? LUTEAL_KCAL : 0);

/** Foods with a good amount of iron, for meal ideas during a period. */
export const IRON_RICH = /\b(beef|lamb|mutton|liver|daging|kambing|spinach|bayam|kangkung|lentil|dhal|dal|chickpea|kacang kuda|bean|tofu|tempeh|egg|telur|sardine|sardin|clam|kerang|mussel|oyster|quinoa|pumpkin seed|chicken liver|ati)\b/i;

export const cravingSwaps = () => [
  { craving: tr("Chocolate"), swap: tr("2 squares of dark chocolate (about 110 kcal) with a few almonds") },
  { craving: tr("Something sweet"), swap: tr("3 dates or a banana with yoghurt") },
  { craving: tr("Crisps or salty snacks"), swap: tr("Roasted chickpeas or a handful of popcorn") },
  { craving: tr("Ice cream"), swap: tr("Frozen yoghurt or a smoothie with frozen fruit") },
];

// ── Birth-control pill ──────────────────────────────────

export interface PillDay {
  /** Day of the pack, 1-based. */
  day: number;
  pack: number;
  active: boolean;
  /** Day of the break or placebo week (when not active). */
  breakDay: number;
}

export function pillDay(pill: PillSettings | undefined, today: string): PillDay | null {
  if (!pill?.on || !pill.packStart || today < pill.packStart) return null;
  const pack = pill.active + pill.breakDays;
  const n = toDay(today) - toDay(pill.packStart);
  const day = (n % pack) + 1;
  const active = day <= pill.active;
  return { day, pack, active, breakDay: active ? 0 : day - pill.active };
}

// ── Ramadan: fasts to replace ───────────────────────────

/** Missed Ramadan fasts still to replace: the days counted, plus any added by hand, minus those replaced. */
export function qadaOwed(days: Pick<DayStats, "fastMissed" | "qada">[], adjust = 0): number {
  const missed = days.filter((d) => d.fastMissed).length;
  const made = days.filter((d) => d.qada).length;
  return Math.max(0, missed + adjust - made);
}

/** A period day during Ramadan: no fasting, and no sahur or iftar reminders. */
export const haidToday = (profile: Pick<Profile, "fasting">, status: CycleStatus | null) => profile.fasting === "ramadan" && status?.phase === "period";

export type { Phase };
