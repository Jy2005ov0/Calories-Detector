import { describe, expect, it } from "vitest";
import { MAX_KCAL, MIN_KCAL, safeMinimum, suggestedKcal, targets } from "./nutrition";
import { sampleDay } from "./diet";
import { DEFAULT_PROFILE } from "./store";
import type { Profile } from "./types";

const me: Profile = { ...DEFAULT_PROFILE, sex: "female", age: 27, heightCm: 162, weightKg: 61, goal: "lose", onboarded: true };

describe("your own calorie target", () => {
  it("replaces the worked-out target, and the suggestion stays the worked-out one", () => {
    const auto = targets(me);
    const own = targets({ ...me, kcalTarget: 2000 });
    expect(own.kcal).toBe(2000);
    expect(suggestedKcal({ ...me, kcalTarget: 2000 })).toBe(auto.kcal);
  });

  it("keeps protein from the body, and carbs and fat fill the rest of the day", () => {
    for (const kcal of [1300, 1800, 2500, 3500]) {
      const tg = targets({ ...me, kcalTarget: kcal });
      expect(tg.protein, `${kcal}`).toBe(targets(me).protein);
      const total = tg.protein * 4 + tg.carbs * 4 + tg.fat * 9;
      // Macros add up to the target (rounding aside), with at least 50 g carbs and 20% fat.
      expect(Math.abs(total - kcal), `${kcal}`).toBeLessThan(kcal < 1500 ? 260 : 30);
      expect(tg.carbs).toBeGreaterThanOrEqual(50);
      expect(tg.fat * 9).toBeGreaterThanOrEqual(kcal * 0.2 - 9);
      // Limits scale with the day too.
      expect(tg.sugarMax).toBe(Math.round((kcal * 0.1) / 4));
    }
  });

  it("stays within safe limits", () => {
    expect(targets({ ...me, kcalTarget: 100 }).kcal).toBe(MIN_KCAL);
    expect(targets({ ...me, kcalTarget: 99999 }).kcal).toBe(MAX_KCAL);
    expect(safeMinimum({ sex: "female" })).toBe(1200);
    expect(safeMinimum({ sex: "male" })).toBe(1500);
    // The worked-out target never goes below the safe minimum on its own.
    expect(targets({ ...me, weightKg: 40, heightCm: 145, age: 70, activity: 1.2 }).kcal).toBeGreaterThanOrEqual(1200);
  });

  it("is used for meal plans, and an empty target means automatic", () => {
    const day = sampleDay(targets({ ...me, kcalTarget: 2400 }), me.diet, {});
    expect(day.total.kcal).toBeGreaterThan(targets(me).kcal);
    expect(targets({ ...me, kcalTarget: undefined }).kcal).toBe(targets(me).kcal);
    expect(targets({ ...me, kcalTarget: 0 }).kcal).toBe(targets(me).kcal);
  });
});
