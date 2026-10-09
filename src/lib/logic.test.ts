import { describe, expect, it } from "vitest";
import { EXERCISES, EXERCISE_BY_NAME } from "../data/exercises";
import { FOODS, FOOD_BY_NAME, recipeTotals } from "../data/foods";
import { RECIPES } from "../data/dishes";
import { recommendedFoods, sampleDay } from "./diet";
import { SPLITS, buildPlan, kcalFor, sessionKcal } from "./fitness";
import { bmr, healthReport, scale, searchFoods, suitability, sum, targets, ZERO } from "./nutrition";
import { DEFAULT_PROFILE } from "./store";
import type { Profile, WorkoutSession } from "./types";

const profile: Profile = { ...DEFAULT_PROFILE, sex: "male", age: 25, heightCm: 175, weightKg: 75, activity: 1.55, goal: "maintain" };

describe("databases", () => {
  it("has a large food database with unique, sane entries", () => {
    expect(FOODS.length).toBeGreaterThan(380);
    expect(new Set(FOODS.map((f) => f.name)).size).toBe(FOODS.length);
    for (const f of FOODS) {
      const { kcal, protein, carbs, fat } = f.per100;
      // Atwater check: macros should roughly explain the calories (alcohol/fibre aside).
      const est = protein * 4 + carbs * 4 + fat * 9;
      if (kcal > 30 && f.category !== "Drinks") expect(Math.abs(est - kcal) / kcal, f.name).toBeLessThan(0.3);
      expect(f.servings[0].grams, f.name).toBeGreaterThan(0);
    }
  });

  it("has a large exercise database with unique names", () => {
    expect(EXERCISES.length).toBeGreaterThan(230);
    expect(EXERCISE_BY_NAME.size).toBe(EXERCISES.length);
  });

  it("every planned exercise exists in the library", () => {
    for (const split of SPLITS) {
      for (const days of [2, 3, 4, 5, 6]) {
        for (const experience of ["beginner", "intermediate", "advanced"] as const) {
          const plan = buildPlan({ goal: "gain", experience, trainingDays: days }, split.id);
          expect(plan.days).toHaveLength(days);
          for (const d of plan.days) for (const e of d.exercises) expect(EXERCISE_BY_NAME.has(e.name), e.name).toBe(true);
        }
      }
    }
  });

  it("every recommended food exists", () => {
    const names = new Set(FOODS.map((f) => f.name));
    for (const goal of ["lose", "maintain", "gain"] as const)
      for (const diet of ["anything", "halal", "vegetarian", "vegan"] as const)
        for (const g of recommendedFoods(goal, diet)) for (const n of g.foods) expect(names.has(n), n).toBe(true);
  });
});

describe("nutrition", () => {
  it("computes BMR with Mifflin-St Jeor", () => {
    expect(bmr(profile)).toBeCloseTo(10 * 75 + 6.25 * 175 - 5 * 25 + 5);
  });

  it("sets a deficit for fat loss and surplus for gain", () => {
    const m = targets(profile).kcal;
    expect(targets({ ...profile, goal: "lose" }).kcal).toBeLessThan(m);
    expect(targets({ ...profile, goal: "gain" }).kcal).toBeGreaterThan(m);
  });

  it("macros add up to the calorie target", () => {
    for (const goal of ["lose", "maintain", "gain"] as const) {
      const t = targets({ ...profile, goal });
      expect(Math.abs(t.protein * 4 + t.carbs * 4 + t.fat * 9 - t.kcal)).toBeLessThan(15);
    }
  });

  it("scales per-100 g values", () => {
    const rice = FOODS.find((f) => f.name === "White rice (cooked)")!;
    expect(scale(rice.per100, 200).kcal).toBeCloseTo(260);
  });

  it("grades chicken breast above a soft drink", () => {
    const chicken = FOODS.find((f) => f.name.startsWith("Chicken breast"))!;
    const cola = FOODS.find((f) => f.name === "Soft drink (cola)")!;
    expect(healthReport(scale(chicken.per100, 150)).score).toBeGreaterThan(healthReport(scale(cola.per100, 330)).score);
    expect(["A", "B"]).toContain(healthReport(scale(chicken.per100, 150)).grade);
    expect(["D", "E"]).toContain(healthReport(scale(cola.per100, 330)).grade);
  });

  it("flags a meal that blows the remaining budget", () => {
    const t = targets({ ...profile, goal: "lose" });
    const almostFull = { ...ZERO, kcal: t.kcal - 100 };
    const big = { ...ZERO, kcal: 900, carbs: 100, fat: 45, sugar: 60, satFat: 20, sodium: 1500 };
    expect(["caution", "avoid"]).toContain(suitability(big, t, almostFull, "lose").verdict);
  });

  it("never calls a low-grade dish a great choice", () => {
    const t = targets({ ...profile, goal: "gain" });
    const puff = FOODS.find((f) => f.name === "Curry puff")!;
    const n = scale(puff.per100, 140);
    expect(["C", "D", "E"]).toContain(healthReport(n).grade);
    expect(healthReport(n).negatives).toContain("High in saturated fat");
    expect(suitability(n, t, ZERO, "gain").verdict).not.toBe("great");
  });

  it("4-day body-part split includes an arm day", () => {
    const plan = buildPlan({ goal: "gain", experience: "intermediate", trainingDays: 4 }, "bodypart");
    expect(plan.days.map((d) => d.title)).toEqual(["Chest Day", "Back Day", "Leg Day", "Shoulders & Arms"]);
  });

  it("finds Malaysian foods by alias", () => {
    expect(searchFoods(FOODS, "roti prata")[0].name).toBe("Roti canai");
    expect(searchFoods(FOODS, "nasi lemak").length).toBeGreaterThan(0);
  });

  it("puts the everyday food first, not a regional variation", () => {
    const top = (q: string) => searchFoods(FOODS, q)[0].name;
    expect(top("rice")).toBe("White rice (cooked)");
    expect(top("bread")).toBe("White bread");
    expect(top("coffee")).toBe("Black coffee");
    expect(top("egg")).toBe("Egg (boiled)");
    expect(top("nasi lemak")).toBe("Nasi lemak (with sambal, egg, anchovies, peanuts)");
    expect(top("chicken rice")).toBe("Chicken rice (rice only)");
    expect(top("curry")).not.toMatch(/^Curry (pan|puff)/);
  });

  it("scales the sample day close to the target", () => {
    for (const goal of ["lose", "maintain", "gain"] as const) {
      const t = targets({ ...profile, goal });
      for (const diet of ["anything", "vegetarian", "vegan"] as const) {
        const day = sampleDay(t, diet);
        expect(Math.abs(day.total.kcal - t.kcal) / t.kcal, `${goal}/${diet}`).toBeLessThan(0.05);
        expect(Math.abs(day.total.protein - t.protein) / t.protein, `${goal}/${diet} protein`).toBeLessThan(0.15);
        expect(sum(day.meals.map((m) => m.total)).kcal).toBeCloseTo(day.total.kcal);
      }
    }
  });
});

describe("fitness", () => {
  it("uses MET × kg × hours", () => {
    expect(kcalFor(8, 75, 60)).toBe(600);
  });

  it("counts clocked time without exercises as general gym work", () => {
    const s: WorkoutSession = { id: "1", date: "", title: "", startedAt: 0, endedAt: 60 * 60000, exercises: [], kcal: 0 };
    expect(sessionKcal(s, 70)).toBeCloseTo(3.5 * 70);
  });

  it("counts logged cardio by its MET", () => {
    const s: WorkoutSession = {
      id: "1",
      date: "",
      title: "",
      startedAt: 0,
      endedAt: 30 * 60000,
      exercises: [{ id: "a", exerciseId: "x", name: "Run", kind: "cardio", met: 10, minutes: 30 }],
      kcal: 0,
    };
    expect(sessionKcal(s, 70)).toBeCloseTo(350);
  });
});

describe("dishes with parts", () => {
  it("every recipe uses real foods and adds up to the dish", () => {
    for (const [name, parts] of Object.entries(RECIPES)) {
      const dish = FOOD_BY_NAME.get(name);
      expect(dish, name).toBeDefined();
      expect(dish!.recipe).toBe(parts);
      const { total, grams } = recipeTotals(parts.map((p) => ({ food: p.food, grams: p.unitGrams * p.qty })));
      expect(dish!.servings[0].grams).toBe(Math.round(grams));
      expect((dish!.per100.kcal * grams) / 100).toBeCloseTo(total.kcal, 5);
      // A plate of food, not a typo: 250–1,100 kcal per serving.
      expect(total.kcal, name).toBeGreaterThan(250);
      expect(total.kcal, name).toBeLessThan(1100);
    }
  });

  it("nasi lemak is rice, sambal, egg, ikan bilis, peanuts and cucumber", () => {
    const parts = FOOD_BY_NAME.get("Nasi lemak (with sambal, egg, anchovies, peanuts)")!.recipe!.map((p) => p.label);
    expect(parts).toEqual(["Coconut rice", "Sambal", "Boiled egg", "Ikan bilis", "Peanuts", "Cucumber"]);
  });
});
