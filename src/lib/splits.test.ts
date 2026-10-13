import { describe, expect, it } from "vitest";
import { MUSCLE_GROUPS, allowed, exerciseByName, missingStaples, poolFor } from "../data/exercisePools";
import { SPLITS, buildPlan, customTitle, planFor } from "./fitness";
import { DEFAULT_PROFILE } from "./store";

const p = { goal: "gain" as const, experience: "intermediate" as const, trainingDays: 5 };

describe("training splits", () => {
  it("knows every staple exercise, and has plenty to choose from for each muscle", () => {
    expect(missingStaples()).toEqual([]);
    for (const g of MUSCLE_GROUPS) {
      expect(poolFor(g.id).length, g.id).toBeGreaterThanOrEqual(15);
      // No stretches or foam rolling in a workout.
      expect(poolFor(g.id).filter((e) => /stretch|smr/i.test(e.name)), g.id).toEqual([]);
    }
  });

  it("builds 5–6 different exercises every day, for every split, week and place", () => {
    for (const sp of SPLITS) {
      for (const trainingDays of [2, 3, 4, 5, 6]) {
        for (const equipment of ["gym", "dumbbells", "home"] as const) {
          const plan = buildPlan({ ...p, trainingDays }, sp.id, { equipment });
          expect(plan.days, `${sp.id} ${trainingDays}`).toHaveLength(trainingDays);
          for (const d of plan.days) {
            const names = d.exercises.map((e) => e.name);
            expect(names.length, `${sp.id} ${equipment} ${d.title}`).toBeGreaterThanOrEqual(5);
            expect(new Set(names).size, `${sp.id} ${equipment} ${d.title} repeats`).toBe(names.length);
            for (const n of names) expect(allowed(equipment, exerciseByName(n)!), `${n} at ${equipment}`).toBe(true);
          }
        }
      }
    }
  });

  it("keeps the gym body-part split as it was, and adapts it for home", () => {
    const gym = buildPlan(p, "bodypart");
    expect(gym.days[0].exercises.map((e) => e.name).slice(0, 2)).toEqual(["Barbell bench press", "Incline dumbbell press"]);
    const home = buildPlan(p, "bodypart", { equipment: "home" });
    const chest = home.days[0].exercises.map((e) => e.name);
    expect(chest).not.toContain("Barbell bench press");
    expect(chest.some((n) => /push-up|dip/i.test(n))).toBe(true);
    const db = buildPlan(p, "bodypart", { equipment: "dumbbells" }).days[0].exercises.map((e) => e.name);
    expect(db).toContain("Incline dumbbell press");
  });

  it("offers the new splits with the right days", () => {
    const titles = (id: Parameters<typeof buildPlan>[1], days: number) => buildPlan({ ...p, trainingDays: days }, id).days.map((d) => d.title);
    expect(titles("pairs", 3)).toEqual(["Chest & Triceps", "Back & Biceps", "Legs & Shoulders"]);
    expect(titles("arnold", 6)).toEqual(["Chest & Back", "Shoulders & Arms", "Leg Day", "Chest & Back", "Shoulders & Arms", "Leg Day"]);
    expect(titles("glutes", 4)).toEqual(["Glutes & Hamstrings", "Upper Body", "Quads & Glutes", "Upper Body"]);
    const chestTri = buildPlan({ ...p, trainingDays: 3 }, "pairs").days[0].exercises;
    expect(chestTri.filter((e) => e.group === "chest")).toHaveLength(4);
    expect(chestTri.filter((e) => e.group === "triceps")).toHaveLength(2);
    // Compound lifts come first.
    expect(chestTri[0].name).toBe("Barbell bench press");
  });

  it("builds my own split from the muscle groups I pick", () => {
    const plan = buildPlan({ ...p, trainingDays: 3 }, "custom", { custom: [["chest", "back"], ["glutes", "core"], ["biceps", "triceps", "forearms"]] });
    expect(plan.days.map((d) => d.title)).toEqual(["Chest & Back", "Glutes & Abs & core", "Biceps, Triceps & Forearms"]);
    expect(customTitle(["glutes", "core"])).toBe("Glutes & Abs & core");
    const arms = plan.days[2].exercises.map((e) => e.group);
    expect(new Set(arms)).toEqual(new Set(["biceps", "triceps", "forearms"]));
    // Fewer days saved than trained: the rest are filled in.
    expect(buildPlan({ ...p, trainingDays: 5 }, "custom", { custom: [["chest"]] }).days).toHaveLength(5);
  });

  it("swaps an exercise and keeps the swap", () => {
    const plan = buildPlan(p, "bodypart");
    const first = plan.days[0].exercises[0];
    expect(first.swapKey).toBe("chest#0");
    const swapped = planFor({ profile: { ...DEFAULT_PROFILE, ...p }, split: "bodypart", planSwaps: { "chest#0": "Machine chest press" } });
    expect(swapped.days[0].exercises[0].name).toBe("Machine chest press");
    // An unknown name (renamed exercise) falls back to the suggestion.
    const bad = planFor({ profile: { ...DEFAULT_PROFILE, ...p }, split: "bodypart", planSwaps: { "chest#0": "Nonexistent lift" } });
    expect(bad.days[0].exercises[0].name).toBe("Barbell bench press");
  });
});
