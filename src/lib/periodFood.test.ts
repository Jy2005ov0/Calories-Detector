import { describe, expect, it } from "vitest";
import { FOOD_BY_NAME } from "../data/foods";
import { allSuggestedFoods, foodHelp } from "./periodFood";

const anyone = { allergies: [], diet: "anything" as const };

describe("food for how you feel on your period", () => {
  it("names only foods in the food list", () => {
    expect(allSuggestedFoods().filter((n) => !FOOD_BY_NAME.has(n))).toEqual([]);
  });
  it("gives several foods for heavy flow and each symptom, heavy flow first", () => {
    const help = foodHelp({ flow: "heavy", symptoms: ["cramps", "bloating", "nausea"] }, "period", anyone);
    expect(help.map((h) => h.key)).toEqual(["heavyFlow", "cramps", "bloating", "nausea"]);
    for (const h of help) expect(h.foods.length).toBeGreaterThanOrEqual(5);
    expect(help[0].warn).toMatch(/doctor/);
    expect(help[0].foods.some((f) => f.food.name === "Guava")).toBe(true);
  });
  it("on a period with nothing logged, gives general advice; outside one, nothing", () => {
    expect(foodHelp(undefined, "period", anyone).map((h) => h.key)).toEqual(["period"]);
    expect(foodHelp(undefined, "luteal", anyone)).toEqual([]);
    expect(foodHelp({ symptoms: ["headache"] }, "luteal", anyone).map((h) => h.key)).toEqual(["headache"]);
  });
  it("leaves out foods that clash with allergies or diet", () => {
    const cramps = (p: Parameters<typeof foodHelp>[2]) => foodHelp({ symptoms: ["cramps"] }, "period", p)[0].foods.map((f) => f.food.name);
    const all = cramps(anyone);
    expect(all).toContain("Mackerel (grilled)");
    const noFish = cramps({ allergies: ["fish"], diet: "anything" });
    expect(noFish).not.toContain("Mackerel (grilled)");
    expect(noFish).not.toContain("Salmon (baked)");
    expect(noFish.length).toBeGreaterThanOrEqual(4);
    const veg = foodHelp({ flow: "heavy" }, "period", { allergies: [], diet: "vegetarian" })[0].foods.map((f) => f.food.name);
    expect(veg).not.toContain("Beef steak (sirloin, grilled)");
    expect(veg).toContain("Lentils (cooked)");
  });
});
