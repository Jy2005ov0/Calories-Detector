import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FOODS } from "../data/foods";
import { searchFoods } from "./nutrition";
import { toFood } from "./usda";

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../public/data/usda-sr28.json"), "utf8"));
const usda = data.rows.map(toFood);

describe("USDA SR28 reference foods", () => {
  it("has the full database and, with the app's own foods, over 10,000 foods", () => {
    expect(usda.length).toBeGreaterThan(8500);
    expect(usda.length + FOODS.length).toBeGreaterThan(10_000);
  });

  it("has valid, unique entries", () => {
    expect(new Set(usda.map((f: { id: string }) => f.id)).size).toBe(usda.length);
    for (const f of usda) {
      const n = f.per100;
      expect(Object.values(n).every((v) => Number.isFinite(v as number) && (v as number) >= 0), f.name).toBe(true);
      expect(n.kcal, f.name).toBeLessThanOrEqual(902);
      expect(n.fiber, f.name).toBeLessThanOrEqual(n.carbs + 0.05);
      expect(n.satFat, f.name).toBeLessThanOrEqual(n.fat + 0.05);
      expect(f.servings[0].grams, f.name).toBeGreaterThan(0);
    }
  });

  it("finds everyday foods first", () => {
    expect(searchFoods(usda, "apple", 1)[0].name).toMatch(/^Apples, raw/);
    expect(searchFoods(usda, "broccoli", 1)[0].name).toBe("Broccoli, raw");
    expect(searchFoods(usda, "salmon", 3).every((f) => f.name.startsWith("Salmon,"))).toBe(true);
  });
});
