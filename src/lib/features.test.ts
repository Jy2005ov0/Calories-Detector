import { describe, expect, it } from "vitest";
import { FOOD_BY_NAME } from "../data/foods";
import { conflicts, foodConflicts, foodTags } from "./allergens";
import { recommendedFoods, sampleDay } from "./diet";
import { toCsv } from "./export";
import { fastStatus, logStreak, waterGoalMl, weightTrend, workoutWeekStreak } from "./progress";
import { e1rm, isNewRecord, lastPerformance, personalRecords, suggestNext } from "./records";
import { DEFAULT_PROFILE, INITIAL_STATE } from "./store";
import { targets } from "./nutrition";
import type { WorkoutSession } from "./types";

const food = (n: string) => {
  const f = FOOD_BY_NAME.get(n);
  if (!f) throw new Error(n);
  return f;
};

describe("allergens and halal", () => {
  it("knows what common dishes contain", () => {
    const nasiLemak = foodTags(food("Nasi lemak (with sambal, egg, anchovies, peanuts)"));
    for (const t of ["peanuts", "egg", "fish"] as const) expect(nasiLemak.has(t), t).toBe(true);
    expect(foodTags(food("Char siu (BBQ pork)")).has("pork")).toBe(true);
    expect(foodTags(food("Beer")).has("alcohol")).toBe(true);
    expect(foodTags(food("Prawns (cooked)")).has("shellfish")).toBe(true);
  });

  it("doesn't flag plain foods", () => {
    for (const n of ["Apple", "Broccoli", "White rice (cooked)", "Chicken breast (grilled, skinless)", "Long beans", "Honeydew", "Pasta (cooked)"]) {
      const tags = foodTags(food(n));
      for (const t of ["pork", "alcohol", "peanuts", "treeNuts", "shellfish", "honey"] as const) expect(tags.has(t), `${n} ${t}`).toBe(false);
    }
  });

  it("explains conflicts for allergies, halal and vegetarian diets", () => {
    expect(foodConflicts(food("Satay (chicken)"), { allergies: ["peanuts"], diet: "anything" }).map((c) => c.kind)).toEqual(["allergy"]);
    expect(foodConflicts(food("Bak kut teh"), { allergies: [], diet: "halal" }).map((c) => c.text)).toEqual(["Not halal · contains pork"]);
    expect(foodConflicts(food("Chicken curry"), { allergies: [], diet: "vegetarian" }).map((c) => c.kind)).toEqual(["diet"]);
    expect(foodConflicts(food("Greek yogurt (plain, nonfat)"), { allergies: [], diet: "vegan" }).map((c) => c.kind)).toEqual(["diet"]);
    expect(conflicts(new Set(), { allergies: ["egg"], diet: "halal" })).toEqual([]);
  });

  it("treats trace seafood (belacan, fish sauce) as an allergy warning, not a reason to hide a dish from vegetarians", () => {
    const sambalTempeh = { id: "x-tempeh", name: "Sambal tempeh" };
    expect(conflicts(foodTags(sambalTempeh), { allergies: [], diet: "vegetarian" })).toEqual([]);
    expect(conflicts(foodTags(sambalTempeh), { allergies: ["shellfish"], diet: "anything" }).map((c) => c.kind)).toEqual(["allergy"]);
    expect(foodConflicts(food("Prawn mee (soup)"), { allergies: [], diet: "vegetarian" }).map((c) => c.kind)).toEqual(["diet"]);
  });

  it("leaves allergens out of suggestions and meal plans", () => {
    const groups = recommendedFoods("lose", "anything", ["egg", "dairy"]);
    const names = groups.filter((g) => g.title !== "Limit").flatMap((g) => g.foods);
    expect(names).not.toContain("Egg (boiled)");
    expect(names).not.toContain("Greek yogurt (plain, nonfat)");
    const p = { ...DEFAULT_PROFILE, weightKg: 70, goal: "lose" as const };
    const day = sampleDay(targets(p), "anything", { allergies: ["egg", "dairy"] });
    const items = day.meals.flatMap((m) => m.items.map((i) => i.food.name));
    expect(items.some((n) => /egg|milk|yogurt/i.test(n))).toBe(false);
    // The rest still adds up to roughly the target.
    expect(Math.abs(day.total.kcal - targets(p).kcal)).toBeLessThan(targets(p).kcal * 0.12);
  });
});

describe("fasting", () => {
  const p = { ...DEFAULT_PROFILE, fastTimes: { sahur: "05:45", iftar: "19:20", windowStart: "12:00" } };
  const at = (h: number, m = 0) => new Date(2026, 2, 3, h, m);

  it("Ramadan: fasting in the day, eating from iftar to sahur", () => {
    expect(fastStatus({ ...p, fasting: "ramadan" }, at(14))).toEqual(expect.objectContaining({ eating: false, minutesLeft: 320 }));
    expect(fastStatus({ ...p, fasting: "ramadan" }, at(21))).toEqual(expect.objectContaining({ eating: true }));
    expect(fastStatus({ ...p, fasting: "ramadan" }, at(4, 45))).toEqual(expect.objectContaining({ eating: true, minutesLeft: 60 }));
  });

  it("16:8: an 8-hour window", () => {
    expect(fastStatus({ ...p, fasting: "16:8" }, at(13))).toEqual(expect.objectContaining({ eating: true, closes: "20:00", minutesLeft: 420 }));
    expect(fastStatus({ ...p, fasting: "16:8" }, at(8))).toEqual(expect.objectContaining({ eating: false, minutesLeft: 240 }));
    expect(fastStatus({ ...p, fasting: "off" }, at(8))).toBeNull();
  });

  it("Ramadan meal plan is sahur, iftar and moreh, with dates at iftar", () => {
    const day = sampleDay(targets({ ...p, fasting: "ramadan" }), "halal", { fasting: "ramadan" });
    expect(day.meals.map((m) => m.name)).toEqual(["Sahur", "Iftar", "Moreh"]);
    expect(day.meals[1].items[0].food.name).toBe("Dates");
  });

  it("uses a gentler deficit during Ramadan", () => {
    const base = { ...p, goal: "lose" as const };
    expect(targets({ ...base, fasting: "ramadan" }).kcal).toBeGreaterThan(targets({ ...base, fasting: "off" }).kcal);
  });
});

describe("progress", () => {
  it("counts logging streaks, allowing today to be empty", () => {
    const log = ["2026-10-08", "2026-10-09", "2026-10-10"].map((date) => ({ date }));
    expect(logStreak(log, "2026-10-10")).toBe(3);
    expect(logStreak(log, "2026-10-11")).toBe(3);
    expect(logStreak(log, "2026-10-12")).toBe(0);
  });

  it("counts weeks in a row with a workout", () => {
    const s = (date: string) => ({ date, endedAt: 1 });
    // Mondays: 28 Sep, 5 Oct, 12 Oct 2026
    expect(workoutWeekStreak([s("2026-09-29"), s("2026-10-07"), s("2026-10-12")], "2026-10-14")).toBe(3);
    expect(workoutWeekStreak([s("2026-09-29"), s("2026-10-07")], "2026-10-14")).toBe(2);
    expect(workoutWeekStreak([s("2026-09-22")], "2026-10-14")).toBe(0);
  });

  it("finds the weekly weight trend", () => {
    const weights = [0, 7, 14, 21].map((d, i) => ({ id: String(i), date: `2026-09-${String(10 + d).padStart(2, "0")}`, kg: 80 - i * 0.5, createdAt: i }));
    expect(weightTrend(weights, "2026-10-01")).toBeCloseTo(-0.5, 2);
    expect(weightTrend(weights.slice(0, 2), "2026-10-01")).toBeNull();
  });

  it("sets a water goal of about 35 ml per kg", () => {
    expect(waterGoalMl({ weightKg: 70 })).toBe(2500);
    expect(waterGoalMl({ weightKg: 30 })).toBe(1500);
  });
});

describe("personal records and progressive overload", () => {
  const session = (id: string, day: number, sets: [number, number][], exerciseId = "s-1"): WorkoutSession => ({
    id,
    date: `2026-10-${String(day).padStart(2, "0")}`,
    title: "Chest Day",
    startedAt: day * 86400000,
    endedAt: day * 86400000 + 3600000,
    kcal: 200,
    exercises: [{ id: `${id}-e`, exerciseId, name: "Barbell bench press", kind: "strength", met: 5, sets: sets.map(([weightKg, reps]) => ({ weightKg, reps, done: true })) }],
  });

  it("finds the best lift by estimated 1RM", () => {
    const prs = personalRecords([session("a", 1, [[60, 8]]), session("b", 3, [[65, 5], [55, 10]])]);
    expect(prs).toHaveLength(1);
    expect(prs[0].weightKg).toBe(60);
    expect(prs[0].e1rm).toBeCloseTo(e1rm(60, 8));
  });

  it("suggests more weight after hitting the top of the range", () => {
    const last = lastPerformance([session("a", 1, [[60, 10], [60, 10], [60, 10]])], "s-1");
    expect(suggestNext(last, "8–10", "s-1")?.weightKg).toBe(62.5);
    const short = lastPerformance([session("a", 1, [[60, 10], [60, 8], [60, 7]])], "s-1");
    expect(suggestNext(short, "8–10", "s-1")).toEqual(expect.objectContaining({ weightKg: 60 }));
  });

  it("spots a new record but not the first time", () => {
    const history = [session("a", 1, [[60, 8]])];
    expect(isNewRecord(history, "s-1", { weightKg: 62.5, reps: 8, done: true }, "now")).toBe(true);
    expect(isNewRecord(history, "s-1", { weightKg: 50, reps: 8, done: true }, "now")).toBe(false);
    expect(isNewRecord([], "s-1", { weightKg: 50, reps: 8, done: true }, "now")).toBe(false);
    // A second set at the same weight in the same workout isn't another record.
    const live = { ...session("now", 8, [[62.5, 8]]), endedAt: undefined };
    expect(isNewRecord([...history, live], "s-1", { weightKg: 62.5, reps: 8, done: true }, "now")).toBe(false);
    expect(isNewRecord([...history, live], "s-1", { weightKg: 65, reps: 8, done: true }, "now")).toBe(true);
  });
});

describe("export", () => {
  it("writes every table and escapes awkward values", () => {
    const f = food("Roti canai");
    const csv = toCsv({
      ...INITIAL_STATE,
      log: [{ id: "1", date: "2026-10-08", meal: "breakfast", name: 'Roti "kosong", extra', grams: 95, nutrients: f.per100, source: "db", createdAt: 1 }],
      weights: [{ id: "w", date: "2026-10-08", kg: 70.4, createdAt: 1 }],
      days: [{ id: "2026-10-08", waterMl: 1500, steps: 6000 }],
      customMeals: [],
    });
    expect(csv).toContain("# Food log");
    expect(csv).toContain('"Roti ""kosong"", extra"');
    expect(csv).toContain("2026-10-08,70.4");
    expect(csv).toContain("2026-10-08,1500,6000");
  });

  it("neutralises spreadsheet formulas", () => {
    const csv = toCsv({ ...INITIAL_STATE, log: [{ id: "1", date: "2026-10-08", meal: "snack", name: "=HYPERLINK(1)", grams: 1, nutrients: food("Apple").per100, source: "custom", createdAt: 1 }] });
    expect(csv).toContain("'=HYPERLINK(1)");
  });
});
