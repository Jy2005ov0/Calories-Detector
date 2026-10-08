import { describe, expect, it } from "vitest";
import { bmi } from "./nutrition";
import { bmiBand, bodyCheck, healthyWeightRange } from "./recommend";
import { DEFAULT_PROFILE } from "./store";
import { EXERCISE_BY_NAME } from "../data/exercises";
import { buildPlan } from "./fitness";

describe("BMI", () => {
  it("is weight divided by height squared", () => {
    expect(bmi({ heightCm: 175, weightKg: 70 })).toBeCloseTo(22.86, 2);
  });

  it("uses the Asia-Pacific bands", () => {
    expect(bmiBand(18.4).label).toBe("Underweight");
    expect(bmiBand(18.5).label).toBe("Healthy");
    expect(bmiBand(22.9).label).toBe("Healthy");
    expect(bmiBand(23).label).toBe("Overweight");
    expect(bmiBand(27.5).label).toBe("Obese");
  });

  it("gives the healthy weight range for a height", () => {
    // 1.70 m: 18.5 × 2.89 = 53.5 → 54; 22.9 × 2.89 = 66.2 → 66
    expect(healthyWeightRange(170)).toEqual({ min: 54, max: 66 });
  });
});

describe("body check recommendations", () => {
  const p = { ...DEFAULT_PROFILE, age: 30, sex: "male" as const, goal: "maintain" as const };

  it("recommends fat loss, low-impact cardio and a deficit when obese", () => {
    const r = bodyCheck(p, 170, 95);
    expect(r.band.label).toBe("Obese");
    expect(r.goal).toBe("lose");
    expect(r.toHealthy).toBe(66 - 95);
    expect(r.weeksToHealthy).toBe(58);
    expect(r.training.split).toBe("fullbody");
    expect(r.training.points.join(" ")).toMatch(/low-impact/i);
    expect(r.nutrition.targets.kcal).toBeLessThan(bodyCheck({ ...p, goal: "maintain" }, 170, 60).nutrition.targets.kcal);
  });

  it("recommends building muscle in a surplus when underweight", () => {
    const r = bodyCheck(p, 180, 55);
    expect(r.band.label).toBe("Underweight");
    expect(r.goal).toBe("gain");
    expect(r.toHealthy).toBeGreaterThan(0);
    expect(r.training.points.join(" ")).toMatch(/compound/i);
  });

  it("keeps a healthy person's own goal unless it is fat loss", () => {
    expect(bodyCheck({ ...p, goal: "gain" }, 175, 68).goal).toBe("gain");
    expect(bodyCheck({ ...p, goal: "lose" }, 175, 68).goal).toBe("maintain");
    expect(bodyCheck({ ...p, goal: "gain" }, 175, 68).training.split).toBe("bodypart");
  });

  it("only recommends foods that suit the diet", () => {
    const r = bodyCheck({ ...p, diet: "vegan" }, 170, 80);
    expect(r.nutrition.eat.join(" ")).not.toMatch(/chicken|fish|egg|yogurt|beef/i);
  });

  it("recommended splits produce real plans", () => {
    for (const [h, w] of [[170, 95], [170, 75], [180, 55], [175, 68]] as const) {
      const r = bodyCheck(p, h, w);
      const plan = buildPlan({ goal: r.goal, experience: "beginner", trainingDays: r.training.days }, r.training.split);
      expect(plan.days).toHaveLength(r.training.days);
      for (const d of plan.days) for (const e of d.exercises) expect(EXERCISE_BY_NAME.has(e.name)).toBe(true);
    }
  });
});
