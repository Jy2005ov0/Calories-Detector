import { todayKey, weekdayOf } from "./store";
import type { LogEntry, Profile, WeightEntry, WorkoutSession } from "./types";

const DAY = 86400000;

export function addDays(key: string, n: number) {
  const [y, m, d] = key.split("-").map(Number);
  return todayKey(new Date(y, m - 1, d + n));
}

/** Days in a row with something logged, ending today (or yesterday if today is still empty). */
export function logStreak(log: Pick<LogEntry, "date">[], today: string) {
  const days = new Set(log.map((e) => e.date));
  let day = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

/** Weeks in a row (Mon–Sun) with at least one workout, counting this week if it already has one. */
export function workoutWeekStreak(sessions: Pick<WorkoutSession, "date" | "endedAt">[], today: string) {
  const weekStart = (key: string) => addDays(key, -weekdayOf(key));
  const weeks = new Set(sessions.filter((s) => s.endedAt).map((s) => weekStart(s.date)));
  let week = weekStart(today);
  if (!weeks.has(week)) week = addDays(week, -7);
  let n = 0;
  while (weeks.has(week)) {
    n++;
    week = addDays(week, -7);
  }
  return n;
}

/** Change in kg per week over the last `days` days (least-squares line), or null with too little data. */
export function weightTrend(weights: WeightEntry[], today: string, days = 28): number | null {
  const from = addDays(today, -days);
  const pts = weights.filter((w) => w.date >= from).map((w) => ({ x: Date.parse(w.date) / DAY, y: w.kg }));
  if (pts.length < 3 || pts[pts.length - 1].x - pts[0].x < 6) return null;
  const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
  const my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  const num = pts.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0);
  const den = pts.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  return den ? (num / den) * 7 : null;
}

/** About 35 ml per kg a day, rounded to whole 250 ml glasses. */
export function waterGoalMl(p: Pick<Profile, "weightKg">) {
  return Math.max(1500, Math.round((p.weightKg * 35) / 250) * 250);
}

export const GLASS_ML = 250;

/** Minutes since midnight for "HH:MM". */
export const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

export interface FastStatus {
  eating: boolean;
  /** Minutes until the state changes. */
  minutesLeft: number;
  /** Start and end of the eating window, "HH:MM". */
  opens: string;
  closes: string;
}

/**
 * Where the person is in their fast. Ramadan: eat from iftar until sahur ends.
 * 16:8: an 8-hour window starting at `windowStart`.
 */
export function fastStatus(p: Pick<Profile, "fasting" | "fastTimes">, now: Date): FastStatus | null {
  if (p.fasting === "off") return null;
  const times = p.fastTimes;
  const opens = p.fasting === "ramadan" ? times.iftar : times.windowStart;
  const closes = p.fasting === "ramadan" ? times.sahur : fmt((minutesOf(times.windowStart) + 8 * 60) % 1440);
  const o = minutesOf(opens);
  const c = minutesOf(closes);
  const n = now.getHours() * 60 + now.getMinutes();
  // The window may cross midnight (Ramadan: 7:20 pm → 5:45 am).
  const eating = o < c ? n >= o && n < c : n >= o || n < c;
  const target = eating ? c : o;
  const minutesLeft = (target - n + 1440) % 1440;
  return { eating, minutesLeft, opens, closes };
}

const fmt = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
