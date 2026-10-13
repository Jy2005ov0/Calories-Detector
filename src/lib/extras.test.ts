import { describe, expect, it } from "vitest";
import { FOODS } from "../data/foods";
import { badges, challengeProgress, isSugaryDrink, type Data } from "./badges";
import { bodyFatBand, latestMeasurements, measurementChange, navyBodyFat } from "./body";
import { oneRepMax, platesFor, roundToPlate, warmupSets, weightForReps } from "./lifting";
import { DEFAULT_PROFILE } from "./store";
import { PREGNANCY_EXTRA, ZERO, targets, tdee } from "./nutrition";
import { weeklyReport } from "./report";
import { acceptFix, formatPace, haversine, metForSpeed, pace, routeDistance, runKcal, simplify } from "./run";
import { androidDaySteps, stepKcal } from "./steps";
import type { LogEntry, Measurement, Profile } from "./types";
import { matchSpoken, parseSpoken } from "./voice";

const day = (k: string, h = 12) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d, h).getTime();
};

describe("gym maths", () => {
  it("loads plates per side, heaviest first", () => {
    expect(platesFor(100)).toEqual({ perSide: [25, 15], leftover: 0 });
    expect(platesFor(62.5)).toEqual({ perSide: [20, 1.25], leftover: 0 });
    expect(platesFor(61).leftover).toBe(1);
    expect(platesFor(15).perSide).toEqual([]);
  });

  it("estimates a one-rep max and the weight for other reps", () => {
    expect(oneRepMax(100, 1)).toBe(100);
    expect(oneRepMax(100, 5)).toBe(114.6); // Epley 116.7, Brzycki 112.5
    expect(oneRepMax(0, 5)).toBe(0);
    expect(roundToPlate(weightForReps(120, 5))).toBe(102.5);
  });

  it("builds warm-ups that climb towards the working weight", () => {
    const w = warmupSets(100);
    expect(w[0]).toEqual({ kg: 20, reps: 10 });
    expect(w.map((x) => x.kg)).toEqual([20, 40, 60, 80]);
    expect(warmupSets(20)).toEqual([]);
    for (let i = 1; i < w.length; i++) expect(w[i].kg).toBeGreaterThan(w[i - 1].kg);
  });
});

describe("GPS runs", () => {
  it("measures distance and pace", () => {
    // One degree of latitude is about 111 km.
    expect(haversine([3, 101], [4, 101])).toBeGreaterThan(111_000);
    expect(haversine([3, 101], [4, 101])).toBeLessThan(111_400);
    expect(routeDistance([[3, 101], [3.001, 101], [3.002, 101]])).toBeCloseTo(222, -1);
    expect(pace(5000, 25 * 60)).toBe(5);
    expect(formatPace(5.5)).toBe("5:30");
    expect(formatPace(null)).toBe("–");
    expect(pace(10, 60)).toBeNull();
  });

  it("ignores inaccurate fixes, jitter and impossible jumps", () => {
    const a = { lat: 3, lng: 101, acc: 5, t: 0 };
    expect(acceptFix(null, a)).toBe(true);
    expect(acceptFix(a, { ...a, acc: 80, t: 5000 })).toBe(false);
    expect(acceptFix(a, { ...a, lat: 3.00001, t: 5000 })).toBe(false); // ~1 m: jitter
    expect(acceptFix(a, { ...a, lat: 3.0002, t: 5000 })).toBe(true); // ~22 m in 5 s: a run
    expect(acceptFix(a, { ...a, lat: 3.01, t: 5000 })).toBe(false); // 1 km in 5 s
  });

  it("works out calories from speed, and thins long routes", () => {
    expect(metForSpeed(8)).toBeCloseTo(8.3);
    expect(metForSpeed(5)).toBeGreaterThan(3.5);
    expect(runKcal(5000, 1800, 60)).toBeCloseTo(300.75, 1); // 10 km/h ≈ 10 MET for half an hour
    const route = Array.from({ length: 1000 }, (_, i) => [3 + i / 1e4, 101] as [number, number]);
    const s = simplify(route, 100);
    expect(s).toHaveLength(100);
    expect(s[0]).toEqual(route[0]);
    expect(s[99]).toEqual(route[999]);
  });
});

describe("body measurements", () => {
  it("estimates body fat with the US Navy method", () => {
    const man = navyBodyFat({ sex: "male", heightCm: 175 }, { waistCm: 85, neckCm: 38 });
    expect(man).toBeGreaterThan(15);
    expect(man).toBeLessThan(21);
    const woman = navyBodyFat({ sex: "female", heightCm: 162 }, { waistCm: 72, neckCm: 32, hipCm: 96 });
    expect(woman).toBeGreaterThan(24);
    expect(woman).toBeLessThan(32);
    expect(navyBodyFat({ sex: "female", heightCm: 162 }, { waistCm: 72, neckCm: 32 })).toBeNull();
    expect(bodyFatBand("male", 12)).toBe("athletic");
    expect(bodyFatBand("female", 35)).toBe("high");
  });

  it("keeps the latest of each measurement and the change over time", () => {
    const list = [
      { id: "1", date: "2026-09-01", waistCm: 90, neckCm: 38, createdAt: 1 },
      { id: "2", date: "2026-09-15", hipCm: 100, createdAt: 2 },
      { id: "3", date: "2026-10-01", waistCm: 86.5, createdAt: 3 },
    ] as Measurement[];
    expect(latestMeasurements(list)).toEqual({ waistCm: 86.5, neckCm: 38, hipCm: 100 });
    expect(measurementChange(list, "waistCm")).toBe(-3.5);
    expect(measurementChange(list, "hipCm")).toBeNull();
  });
});

describe("steps", () => {
  it("counts calories walked", () => {
    expect(stepKcal(10000, 70)).toBe(350);
  });

  it("turns Android's running total into steps per day", () => {
    const first = androidDaySteps(null, 50_000, day("2026-10-12", 8), "2026-10-12");
    expect(first.steps).toBe(0);
    const later = androidDaySteps(first.next, 53_000, day("2026-10-12", 12), "2026-10-12");
    expect(later.steps).toBe(3000);
    // Phone restarted: the counter starts from zero again.
    const restarted = androidDaySteps(later.next, 400, day("2026-10-12", 13), "2026-10-12");
    expect(restarted.steps).toBe(3400);
    // Next morning: steps since the last reading are split by time between the two days.
    const next = androidDaySteps(restarted.next, 2400, day("2026-10-13", 1), "2026-10-13");
    expect(next.steps + (next.yesterday! - 3400)).toBe(2000);
    expect(next.steps).toBe(Math.round(2000 * (1 / 12)));
  });
});

describe("pregnancy targets", () => {
  const p: Profile = { ...DEFAULT_PROFILE, sex: "female", age: 30, heightCm: 160, weightKg: 60, goal: "lose" };
  it("adds energy by trimester and drops any deficit", () => {
    expect(Math.abs(targets({ ...p, pregnancy: "t2" }).kcal - (tdee(p) + PREGNANCY_EXTRA.t2))).toBeLessThanOrEqual(10);
    expect(targets({ ...p, pregnancy: "t3" }).kcal).toBeGreaterThan(targets({ ...p, pregnancy: "t2" }).kcal);
    expect(targets({ ...p, pregnancy: "breastfeeding" }).kcal).toBeGreaterThan(targets(p).kcal);
    // At least the pregnancy RDA of 1.1 g per kg.
    expect(targets({ ...p, pregnancy: "t2" }).protein).toBeGreaterThanOrEqual(1.1 * p.weightKg);
    // Men can't be put in pregnancy mode.
    expect(targets({ ...p, sex: "male", pregnancy: "t2" }).kcal).toBe(targets({ ...p, sex: "male" }).kcal);
  });
});

describe("faster logging by voice", () => {
  it("understands amounts and meals in English, Malay and Chinese", () => {
    expect(parseSpoken("two roti canai and teh tarik for breakfast")).toEqual({ meal: "breakfast", items: [{ query: "roti canai", qty: 2 }, { query: "teh tarik", qty: 1 }] });
    expect(parseSpoken("makan tengah hari dua pinggan nasi lemak dan satu gelas milo")).toEqual({ meal: "lunch", items: [{ query: "nasi lemak", qty: 2 }, { query: "milo", qty: 1 }] });
    expect(parseSpoken("200 g chicken breast").items).toEqual([{ query: "chicken breast", qty: 1, grams: 200 }]);
    const zh = parseSpoken("晚餐两碗白饭和一杯咖啡");
    expect(zh.meal).toBe("dinner");
    expect(zh.items.map((i) => i.qty)).toEqual([2, 1]);
  });

  it("finds the food and the grams to log", () => {
    const [rice, kopi] = matchSpoken(parseSpoken("两碗白饭和一杯咖啡").items, FOODS);
    expect(rice.food?.name).toMatch(/white rice/i);
    expect(rice.grams).toBe(2 * rice.food!.servings[0].grams);
    expect(kopi.food?.name).toMatch(/kopi/i);
  });
});

const entry = (date: string, kcal: number, protein: number, extra: Partial<LogEntry> = {}): LogEntry => ({
  id: `${date}-${kcal}-${extra.name ?? ""}`,
  date,
  meal: "lunch",
  name: "Food",
  grams: 100,
  nutrients: { ...ZERO, kcal, protein, fiber: 30 },
  source: "db",
  createdAt: 0,
  ...extra,
});

describe("weekly report", () => {
  const tg = targets({ ...DEFAULT_PROFILE, onboarded: true });
  it("asks for more logging until there's enough to judge", () => {
    expect(weeklyReport([entry("2026-10-12", 2000, 100)], [], [], tg, "2026-10-12", 2500).tip).toBe("logMore");
  });
  it("picks the best and toughest day and one tip", () => {
    const log = [entry("2026-10-08", tg.kcal, tg.protein), entry("2026-10-09", tg.kcal + 250, tg.protein), entry("2026-10-10", tg.kcal, tg.protein * 0.3), entry("2026-10-01", 9000, 0)];
    const r = weeklyReport(log, [], [], tg, "2026-10-12", 2500);
    expect(r.daysLogged).toBe(3);
    expect(r.best?.date).toBe("2026-10-08");
    expect(r.worst?.date).not.toBe("2026-10-08");
    expect(r.tip).toBe("protein");
    const over = weeklyReport([1, 2, 3].map((d) => entry(`2026-10-1${d}`, tg.kcal * 1.3, tg.protein)), [], [], tg, "2026-10-13", 2500);
    expect(over.tip).toBe("over");
  });
});

describe("badges and challenges", () => {
  const tg = targets({ ...DEFAULT_PROFILE, onboarded: true });
  const base: Data = { log: [], days: [], sessions: [], weights: [], tg, waterGoalMl: 2500, stepGoal: 10000, today: "2026-10-12" };
  it("knows a sugary drink from a sugar-free one", () => {
    expect(isSugaryDrink({ name: "Teh tarik", nutrients: { ...ZERO, sugar: 20 } })).toBe(true);
    expect(isSugaryDrink({ name: "Teh O kosong", nutrients: { ...ZERO, sugar: 0 } })).toBe(false);
    expect(isSugaryDrink({ name: "Coke Zero", nutrients: { ...ZERO, sugar: 6 } })).toBe(false);
  });
  it("earns the first badges", () => {
    const none = badges(base);
    expect(none.find((b) => b.id === "firstLog")?.earned).toBe(false);
    const log = Array.from({ length: 7 }, (_, i) => entry(`2026-10-${String(i + 6).padStart(2, "0")}`, 1800, 50));
    const some = badges({ ...base, log });
    expect(some.find((b) => b.id === "firstLog")?.earned).toBe(true);
    expect(some.find((b) => b.id === "streak7")?.earned).toBe(true);
  });
  it("tracks a challenge and breaks it on a missed day", () => {
    const log = ["2026-10-10", "2026-10-11", "2026-10-12"].map((d) => entry(d, 1800, tg.protein));
    const going = challengeProgress({ id: "protein7", start: "2026-10-10" }, { ...base, log });
    expect(going.done).toBe(3);
    expect(going.status).toBe("active");
    const broken = challengeProgress({ id: "protein7", start: "2026-10-09" }, { ...base, log });
    expect(broken.status).toBe("failed");
  });
});

describe("workout Live Activity", () => {
  it("shows the exercise in progress, sets done, calories and the rest countdown", async () => {
    const { liveState } = await import("./liveActivity");
    const now = 1_700_000_000_000;
    const s = {
      id: "s",
      date: "2026-10-13",
      title: "Chest Day",
      startedAt: now - 20 * 60_000,
      exercises: [
        { id: "a", exerciseId: "x", name: "Barbell bench press", kind: "strength" as const, met: 6, sets: [{ reps: 8, weightKg: 60, done: true }, { reps: 8, weightKg: 60, done: true }] },
        { id: "b", exerciseId: "y", name: "Incline dumbbell press", kind: "strength" as const, met: 6, sets: [{ reps: 10, weightKg: 20, done: true }, { reps: 10, weightKg: 20, done: false }] },
      ],
      kcal: 0,
    };
    const st = liveState(s, 70, null, now);
    expect(st.exercise).toBe("Incline dumbbell press");
    expect(st.setsDone).toBe(3);
    expect(st.kcal).toBeGreaterThan(50);
    expect(st.restEndsAt).toBeUndefined();
    const resting = liveState(s, 70, { startedAt: now - 30_000, endsAt: now + 60_000 }, now);
    expect(resting.restEndsAt).toBe(now + 60_000);
    // A rest that's over isn't shown.
    expect(liveState(s, 70, { startedAt: now - 120_000, endsAt: now - 1 }, now).restEndsAt).toBeUndefined();
  });
});

describe("rest notification", () => {
  it("says how long to rest and when the next set is", async () => {
    const { restMessage } = await import("./native");
    const now = new Date(2026, 9, 13, 10, 31, 0).getTime();
    const m = restMessage(now + 90_000, now);
    expect(m.title).toBe("Rest 1:30");
    expect(m.body).toMatch(/^Next set at 10:32/);
  });
});
