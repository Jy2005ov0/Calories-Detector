import { describe, expect, it } from "vitest";
import { dislikesIn, foodTags } from "./allergens";
import { CUISINES, _pools, mealBudgets, mealIdeas, type IdeaContext } from "./ideas";
import { DEFAULT_MEAL_PREFS } from "./store";
import type { MealPrefs, MealType } from "./types";

const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function ctx(over: Partial<Omit<IdeaContext, "prefs" | "profile">> & { prefs?: Partial<MealPrefs>; profile?: Partial<IdeaContext["profile"]> } = {}): IdeaContext {
  return {
    targets: { kcal: 2200, protein: 130 },
    log: [],
    today: "2026-10-12",
    minutes: 7 * 60,
    ...over,
    profile: { diet: "anything", allergies: [], dislikes: [], goal: "maintain", fasting: "off", ...over.profile },
    prefs: { ...DEFAULT_MEAL_PREFS, ...over.prefs },
  };
}

/** Every item of the top ideas for every meal. */
function allItems(c: IdeaContext, n = 8) {
  return mealBudgets(c, MEALS).flatMap((b) => mealIdeas(c, b.meal, b, [], n).flatMap((i) => i.items.map((x) => x.food)));
}

describe("meal ideas", () => {
  it("has dishes, protein mains, breakfasts and snacks to choose from", () => {
    const p = _pools();
    expect(p.dish.length).toBeGreaterThan(300);
    expect(p.protein.length).toBeGreaterThan(150);
    expect(p.breakfast.length).toBeGreaterThan(100);
    expect(p.snack.length).toBeGreaterThan(30);
    // No desserts or drinks as a main meal.
    for (const c of [...p.dish, ...p.protein]) expect(c.food.name).not.toMatch(/cendol|ice cream|cake|kuih|teh tarik|juice/i);
  });

  it("splits what's left of the day over the meals still ahead", () => {
    const c = ctx({ log: [{ date: "2026-10-12", meal: "breakfast", name: "Roti canai", nutrients: { kcal: 400, protein: 10, carbs: 0, fat: 0, fiber: 0, sugar: 0, satFat: 0, sodium: 0 } }], minutes: 11 * 60 });
    const b = mealBudgets(c, MEALS);
    expect(b.map((x) => x.meal)).toEqual(["lunch", "dinner", "snack"]);
    expect(Math.round(b.reduce((a, x) => a + x.kcal, 0))).toBe(1800);
    expect(Math.round(b.reduce((a, x) => a + x.protein, 0))).toBe(120);
    // Late afternoon: breakfast and lunch are over.
    expect(mealBudgets(ctx({ minutes: 16 * 60 }), MEALS).map((x) => x.meal)).toEqual(["dinner", "snack"]);
    // Ramadan: sahur, iftar, moreh.
    expect(mealBudgets(ctx({ profile: { fasting: "ramadan" }, minutes: 4 * 60 }), ["breakfast", "dinner", "snack"]).map((x) => x.meal)).toEqual(["breakfast", "dinner", "snack"]);
  });

  it("sizes each idea to the meal's calories", () => {
    const c = ctx();
    for (const b of mealBudgets(c, MEALS)) {
      for (const idea of mealIdeas(c, b.meal, b, [], 5)) {
        expect(idea.total.kcal).toBeGreaterThan(b.kcal * 0.6);
        expect(idea.total.kcal).toBeLessThan(b.kcal * 1.35);
      }
    }
  });

  it("never suggests meat or animal foods to vegans, or meat to vegetarians", () => {
    const meaty = /chicken|beef|pork|lamb|mutton|fish|prawn|shrimp|crab|ham\b|bacon|anchov|squid|duck|tuna|salmon|ikan|ayam|daging|udang/i;
    for (const name of allItems(ctx({ profile: { diet: "vegan" } })).map((f) => f.name)) {
      expect(name).not.toMatch(meaty);
      expect(name).not.toMatch(/\begg|cheese|yogurt|paneer|ghee|honey|low fat milk/i);
    }
    for (const style of ["balanced", "highProtein", "lowCarb"] as const) {
      for (const name of allItems(ctx({ profile: { diet: "vegetarian" }, prefs: { style } })).map((f) => f.name)) expect(name).not.toMatch(meaty);
    }
  });

  it("keeps halal ideas free of pork and alcohol, and leaves out allergens and dislikes", () => {
    for (const f of allItems(ctx({ profile: { diet: "halal" } }), 12)) {
      const tags = foodTags(f);
      expect(tags.has("pork")).toBe(false);
      expect(tags.has("alcohol")).toBe(false);
    }
    for (const f of allItems(ctx({ profile: { allergies: ["peanuts", "shellfish"] } }), 12)) {
      expect(foodTags(f).has("peanuts")).toBe(false);
      expect(foodTags(f).has("shellfish")).toBe(false);
    }
    for (const f of allItems(ctx({ profile: { dislikes: ["spicy", "vegetables"] } }), 12)) expect(dislikesIn(f.name, ["spicy", "vegetables"])).toEqual([]);
  });

  it("sticks to the cuisines picked", () => {
    const picked = new Set(CUISINES.find((c) => c.value === "japanese")!.categories);
    const c = ctx({ prefs: { cuisines: ["japanese"] } });
    const ideas = mealIdeas(c, "dinner", { kcal: 650, protein: 40 }, [], 10);
    const main = ideas.map((i) => i.items[0].food);
    // Japanese dishes, or plain home cooking (grilled chicken, fish…) that goes with anything.
    expect(main.filter((f) => picked.has(f.category)).length).toBeGreaterThanOrEqual(7);
    for (const f of main) expect(picked.has(f.category) || ["Poultry", "Meat", "Seafood", "Grains", "Eggs & Dairy", "Legumes & Nuts", "Vegetables", "Fruits"].includes(f.category)).toBe(true);
  });

  it("learns: a liked dish comes up first, a hidden one never, swaps fade", () => {
    const c = ctx();
    const b = { kcal: 700, protein: 40 };
    const top = mealIdeas(c, "lunch", b, [], 6);
    const fifth = top[4].key;
    expect(mealIdeas(ctx({ prefs: { liked: [fifth] } }), "lunch", b)[0].key).toBe(fifth);
    expect(mealIdeas(ctx({ prefs: { liked: [fifth] } }), "lunch", b)[0].reasons).toContain("You liked this before");
    const first = top[0].key;
    expect(mealIdeas(ctx({ prefs: { hidden: [first] } }), "lunch", b, [], 30).some((i) => i.key === first)).toBe(false);
    expect(mealIdeas(c, "lunch", b, [first])[0].key).not.toBe(first);
    const skipped = mealIdeas(ctx({ prefs: { skipped: [first, first, first] } }), "lunch", b, [], 6).map((i) => i.key);
    expect(skipped[0]).not.toBe(first);
  });

  it("brings back what the person often eats when they prefer their usual foods", () => {
    const n = { kcal: 600, protein: 25, carbs: 70, fat: 20, fiber: 3, sugar: 4, satFat: 6, sodium: 900 };
    const log = [3, 5, 8, 10, 13].map((d) => ({ date: `2026-09-${String(30 - d).padStart(2, "0")}`, meal: "lunch" as const, name: "Nasi ayam (roasted)", nutrients: n }));
    const familiar = mealIdeas(ctx({ log, prefs: { variety: "familiar" } }), "lunch", { kcal: 700, protein: 40 }, [], 3).map((i) => i.key);
    expect(familiar).toContain("Nasi ayam (roasted)");
    const fresh = mealIdeas(ctx({ log, prefs: { variety: "new" } }), "lunch", { kcal: 700, protein: 40 }, [], 3).map((i) => i.key);
    expect(fresh).not.toContain("Nasi ayam (roasted)");
  });

  it("is stable within a day and changes from day to day", () => {
    const a = mealIdeas(ctx(), "dinner", { kcal: 650, protein: 40 }, [], 3).map((i) => i.key);
    expect(mealIdeas(ctx(), "dinner", { kcal: 650, protein: 40 }, [], 3).map((i) => i.key)).toEqual(a);
    const week = new Set(["2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"].map((today) => mealIdeas(ctx({ today }), "dinner", { kcal: 650, protein: 40 })[0].key));
    expect(week.size).toBeGreaterThan(1);
  });

  it("goes light when the day's calories are used up", () => {
    const c = ctx({ log: [{ date: "2026-10-12", meal: "lunch", name: "Big lunch", nutrients: { kcal: 2300, protein: 130, carbs: 0, fat: 0, fiber: 0, sugar: 0, satFat: 0, sodium: 0 } }], minutes: 17 * 60 });
    const b = mealBudgets(c, MEALS);
    expect(b.every((x) => x.kcal === 0)).toBe(true);
    const idea = mealIdeas(c, b[0].meal, { kcal: 120, protein: 0 })[0];
    expect(idea.total.kcal).toBeLessThan(180);
  });
});
