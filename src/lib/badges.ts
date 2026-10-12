import { addDays, logStreak } from "./progress";
import { personalRecords } from "./records";
import { sum, type Targets } from "./nutrition";
import type { Challenge, ChallengeId, DayStats, LogEntry, WeightEntry, WorkoutSession } from "./types";

export interface Data {
  log: LogEntry[];
  days: DayStats[];
  sessions: WorkoutSession[];
  weights: WeightEntry[];
  tg: Targets;
  waterGoalMl: number;
  stepGoal: number;
  today: string;
}

const dayTotals = (log: LogEntry[]) => {
  const map = new Map<string, LogEntry[]>();
  for (const e of log) map.set(e.date, [...(map.get(e.date) ?? []), e]);
  return new Map([...map].map(([d, es]) => [d, sum(es.map((e) => e.nutrients))]));
};

/** Sugary drinks, by name (diet, zero and no-sugar versions don't count). */
const SUGARY = /\b(cola|coke|soda|soft drink|sirap|syrup|bubble|boba|milk tea|teh tarik|teh c|teh o|kopi|milo|juice|frappe|frappuccino|lemonade|iced tea|ice lemon tea|energy drink|100plus|sprite|fanta|pepsi|7up|bandung|soya bean drink|chrysanthemum|barley|sugarcane|slurpee|smoothie|milkshake|chocolate drink)\b/i;
const SUGAR_FREE = /\b(kosong|zero|diet|no sugar|sugar[- ]free|tanpa gula|unsweetened|0% sugar)\b/i;
export const isSugaryDrink = (e: Pick<LogEntry, "name" | "nutrients">) => SUGARY.test(e.name) && !SUGAR_FREE.test(e.name) && e.nutrients.sugar >= 5;

export interface ChallengeDef {
  id: ChallengeId;
  title: string;
  detail: string;
  /** Days the challenge lasts, or 0 for a count reached at any pace (within 90 days). */
  days: number;
  goal: number;
}

export const CHALLENGES: ChallengeDef[] = [
  { id: "protein7", title: "7 days hitting protein", detail: "Reach your protein target every day for a week.", days: 7, goal: 7 },
  { id: "water7", title: "7 days of water", detail: "Drink your daily water goal for a week.", days: 7, goal: 7 },
  { id: "steps10k7", title: "10,000 steps for a week", detail: "Walk 10,000 steps a day for seven days.", days: 7, goal: 7 },
  { id: "log14", title: "Log every day for 2 weeks", detail: "Log at least one food every day for 14 days.", days: 14, goal: 14 },
  { id: "noSugaryDrinks30", title: "A month without sugary drinks", detail: "30 days without soft drinks, sweet teas, bubble tea or juice.", days: 30, goal: 30 },
  { id: "workouts30", title: "30 workouts", detail: "Finish 30 workouts within 90 days.", days: 0, goal: 30 },
];

export interface ChallengeProgress {
  def: ChallengeDef;
  start: string;
  done: number;
  status: "active" | "complete" | "failed";
  /** Day of the challenge today (1-based), for timed challenges. */
  day: number;
}

/** How a joined challenge is going: days met so far, and whether it's done or broken. */
export function challengeProgress(c: Challenge, d: Data): ChallengeProgress {
  const def = CHALLENGES.find((x) => x.id === c.id)!;
  const totals = dayTotals(d.log);
  const dayN = Math.floor((Date.parse(d.today) - Date.parse(c.start)) / 86400000) + 1;
  if (def.id === "workouts30") {
    const end = addDays(c.start, 89);
    const done = d.sessions.filter((s) => s.endedAt && s.date >= c.start && s.date <= end).length;
    const status = done >= def.goal ? "complete" : d.today > end ? "failed" : "active";
    return { def, start: c.start, done: Math.min(done, def.goal), status, day: dayN };
  }
  const met = (date: string): boolean => {
    const day = d.days.find((x) => x.id === date);
    switch (def.id) {
      case "protein7":
        return (totals.get(date)?.protein ?? 0) >= d.tg.protein * 0.95;
      case "water7":
        return (day?.waterMl ?? 0) >= d.waterGoalMl;
      case "steps10k7":
        return (day?.steps ?? 0) >= 10000;
      case "log14":
        return totals.has(date);
      case "noSugaryDrinks30":
        return !d.log.some((e) => e.date === date && isSugaryDrink(e));
      default:
        return false;
    }
  };
  let done = 0;
  let status: ChallengeProgress["status"] = "active";
  for (let i = 0; i < def.days; i++) {
    const date = addDays(c.start, i);
    if (date > d.today) break;
    if (met(date)) done++;
    // Today can still be met; a missed earlier day breaks the challenge.
    else if (date < d.today) {
      status = "failed";
      break;
    }
  }
  if (status !== "failed" && done >= def.goal) status = "complete";
  return { def, start: c.start, done, status, day: Math.min(dayN, def.days) };
}

export interface Badge {
  id: string;
  title: string;
  detail: string;
  earned: boolean;
  /** Progress toward it, 0–1. */
  progress: number;
}

/** Badges earned from everything logged so far. */
export function badges(d: Data): Badge[] {
  const totals = dayTotals(d.log);
  const finished = d.sessions.filter((s) => s.endedAt);
  const proteinDays = [...totals.values()].filter((n) => n.protein >= d.tg.protein * 0.95).length;
  const waterDays = d.days.filter((x) => x.waterMl >= d.waterGoalMl).length;
  const stepBest = Math.max(0, ...d.days.map((x) => x.steps ?? 0));
  // Longest run of logged days ever.
  const dates = [...totals.keys()].sort();
  let longest = 0;
  let run = 0;
  for (let i = 0; i < dates.length; i++) {
    run = i && addDays(dates[i - 1], 1) === dates[i] ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  longest = Math.max(longest, logStreak(d.log, d.today));
  const longestRun = Math.max(0, ...finished.map((s) => s.distanceM ?? 0));
  const ws = [...d.weights].sort((a, b) => a.date.localeCompare(b.date));
  const lost = ws.length > 1 ? ws[0].kg - Math.min(...ws.map((w) => w.kg)) : 0;
  const make = (id: string, title: string, detail: string, value: number, goal: number): Badge => ({ id, title, detail, earned: value >= goal, progress: Math.min(1, value / goal) });
  return [
    make("firstLog", "First bite", "Log your first food", d.log.length, 1),
    make("streak7", "One week strong", "Log food 7 days in a row", longest, 7),
    make("streak30", "Habit made", "Log food 30 days in a row", longest, 30),
    make("firstWorkout", "Clocked in", "Finish your first workout", finished.length, 1),
    make("workouts10", "Regular", "Finish 10 workouts", finished.length, 10),
    make("workouts50", "Gym rat", "Finish 50 workouts", finished.length, 50),
    make("pr", "Personal best", "Set a personal record", personalRecords(d.sessions).length, 1),
    make("protein7", "Protein pro", "Hit your protein target on 7 days", proteinDays, 7),
    make("water7", "Hydrated", "Reach your water goal on 7 days", waterDays, 7),
    make("steps10k", "10K day", "Walk 10,000 steps in a day", stepBest, 10000),
    make("run5k", "5K", "Track a 5 km run or walk", longestRun, 5000),
    make("lost5", "Down 5 kg", "Lose 5 kg from your first weigh-in", lost, 5),
  ];
}
