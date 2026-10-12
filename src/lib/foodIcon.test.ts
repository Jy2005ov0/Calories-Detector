import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FOODS } from "../data/foods";
import { ALL_FOOD_EMOJI, foodIcon } from "./foodIcon";

const pic = (name: string, category?: string) => foodIcon(name, category).emoji;

describe("food pictures", () => {
  it("picks the right picture for everyday Malaysian food", () => {
    expect(pic("Nasi lemak (with sambal, egg, anchovies, peanuts)")).toBe("🍱");
    expect(pic("Roti canai")).toBe("🫓");
    expect(pic("Teh tarik")).toBe("🍵");
    expect(pic("Kopi O kosong")).toBe("☕");
    expect(pic("Char kway teow")).toBe("🍜");
    expect(pic("Curry laksa")).toBe("🍜");
    expect(pic("Satay (chicken)")).toBe("🍢");
    expect(pic("Chicken curry")).toBe("🍛");
    expect(pic("Bak kut teh")).toBe("🍲");
    expect(pic("Kuih lapis")).toBe("🍡");
    expect(pic("Cendol")).toBe("🍧");
    expect(pic("Bubble milk tea (with pearls)")).toBe("🧋");
    expect(pic("Ikan bakar")).toBe("🐟");
    expect(pic("Sambal udang")).toBe("🍤");
  });

  it("doesn't confuse words inside other words", () => {
    expect(pic("Pineapple")).toBe("🍍");
    expect(pic("Apple")).toBe("🍎");
    expect(pic("Eggplant")).toBe("🍆");
    expect(pic("Egg (boiled)")).toBe("🥚");
    expect(pic("Chocolate cake")).toBe("🍰");
    expect(pic("Fried carrot cake (black, sweet soy)")).toBe("🍘");
    expect(pic("Fish cake")).toBe("🍥");
    expect(pic("Pancake")).toBe("🥞");
    expect(pic("Watermelon")).toBe("🍉");
    expect(pic("Coconut flesh")).toBe("🥥");
    expect(pic("Potato (boiled)")).toBe("🥔");
    expect(pic("Salami")).toBe("🥓");
    expect(pic("Milk chocolate")).toBe("🍫");
  });

  it("falls back to the food's category, and gives every food a picture", () => {
    expect(pic("Something unusual", "Vegetables")).toBe("🥬");
    expect(pic("Something unusual")).toBe("🍽️");
    const world = JSON.parse(readFileSync("public/data/world-foods.json", "utf8")).rows.map((r: string[]) => ({ name: r[0], category: r[1] }));
    const all = [...FOODS, ...world];
    const generic = all.filter((f) => pic(f.name, f.category) === "🍽️").length;
    expect(generic / all.length).toBeLessThan(0.02);
  });

  it("only uses emoji that older phones can show (Unicode 13 or earlier)", () => {
    // Unicode 14+ food emoji (beans, jar, pea pod, ginger…) show as blank boxes on older Android phones.
    for (const e of ALL_FOOD_EMOJI) expect(["🫘", "🫙", "🫛", "🫚", "🪺"]).not.toContain(e);
  });
});
