import { FOODS } from "../data/foods";
import { foodConflicts } from "./allergens";
import { scale, sum, type Targets } from "./nutrition";
import type { Allergen, Food, Goal, Nutrients, Profile } from "./types";

const byName = new Map(FOODS.map((f) => [f.name, f]));
const food = (name: string) => {
  const f = byName.get(name);
  if (!f) throw new Error(`Unknown food in diet template: ${name}`);
  return f;
};

export interface FoodGroupAdvice {
  title: string;
  why: string;
  foods: string[];
}

type Diet = Profile["diet"];

/** Foods to suggest, without anything the person is allergic to or avoids (halal, vegetarian…). */
export function recommendedFoods(goal: Goal, diet: Diet, allergies: Allergen[] = []): FoodGroupAdvice[] {
  return baseRecommendations(goal, diet).map((g) =>
    g.title === "Limit" ? g : { ...g, foods: g.foods.filter((n) => foodConflicts(food(n), { diet, allergies }).length === 0) },
  );
}

function baseRecommendations(goal: Goal, diet: Diet): FoodGroupAdvice[] {
  const veg = diet === "vegetarian" || diet === "vegan";
  const proteins =
    diet === "vegan"
      ? ["Tofu (firm)", "Tempeh", "Edamame", "Lentils (cooked)", "Chickpeas (cooked)", "Plant protein powder"]
      : diet === "vegetarian"
        ? ["Egg (boiled)", "Greek yogurt (plain, nonfat)", "Tofu (firm)", "Tempeh", "Cottage cheese", "Lentils (cooked)"]
        : ["Chicken breast (grilled, skinless)", "Egg (boiled)", "White fish (steamed)", "Salmon (baked)", "Tuna (canned in water)", "Greek yogurt (plain, nonfat)", "Tofu (firm)", "Lean ground beef (cooked)"];

  return [
    {
      title: "Lean protein",
      why: "Builds and protects muscle and keeps you full. Have a palm-sized portion at every meal.",
      foods: proteins,
    },
    {
      title: goal === "gain" ? "Energy carbs" : "Smart carbs",
      why:
        goal === "gain"
          ? "Fuel hard sessions and make the surplus easy to hit. Eat most of them around training."
          : "Fibre-rich carbs give steady energy. Put them around your workouts and keep portions to a fist.",
      foods:
        goal === "gain"
          ? ["White rice (cooked)", "Oats (dry)", "Banana", "Potato (boiled)", "Wholemeal bread", "Pasta (cooked)", "Dates"]
          : ["Brown rice (cooked)", "Oats (dry)", "Sweet potato (baked)", "Quinoa (cooked)", "Wholemeal bread", "Apple", "Guava"],
    },
    {
      title: "Vegetables & fruit",
      why: "Vitamins, minerals and volume for few calories. Fill half your plate with vegetables.",
      foods: ["Broccoli", "Kailan (Chinese broccoli)", "Spinach", "Kangkung (water spinach)", "Bok choy", "Carrot", "Papaya", "Blueberries"],
    },
    {
      title: "Healthy fats",
      why: "Needed for hormones and absorbing vitamins. A thumb-sized portion per meal is enough.",
      foods: ["Avocado", "Almonds", "Olive oil", "Peanut butter", "Chia seeds", ...(veg ? [] : ["Mackerel (grilled)"])],
    },
    {
      title: "Limit",
      why: "Easy to over-eat and low in nutrients. Keep them for occasional treats.",
      foods: ["Teh tarik", "Soft drink (cola)", "Bubble milk tea (with pearls)", veg ? "Curry puff" : "Fried chicken (breaded)", "Roti tisu", "Potato chips", "Doughnut (glazed)"],
    },
  ];
}

export interface PlannedMealItem {
  food: Food;
  grams: number;
  nutrients: Nutrients;
}
export interface PlannedMeal {
  name: string;
  time: string;
  items: PlannedMealItem[];
  total: Nutrients;
}

type Template = { name: string; time: string; items: [string, number][] }[];

const OMNI: Template = [
  { name: "Breakfast", time: "7:30 am", items: [["Oats (dry)", 60], ["Egg (boiled)", 100], ["Banana", 118], ["Low fat milk", 250]] },
  { name: "Lunch", time: "12:30 pm", items: [["Brown rice (cooked)", 180], ["Chicken breast (grilled, skinless)", 150], ["Kailan (Chinese broccoli)", 150], ["Olive oil", 7]] },
  { name: "Pre-workout snack", time: "4:00 pm", items: [["Greek yogurt (plain, nonfat)", 170], ["Blueberries", 75], ["Almonds", 20]] },
  { name: "Dinner", time: "7:30 pm", items: [["White fish (steamed)", 180], ["Sweet potato (baked)", 200], ["Stir-fried mixed vegetables", 150]] },
  { name: "Post-workout / supper", time: "9:30 pm", items: [["Whey protein powder", 30], ["Low fat milk", 250]] },
];
const VEGETARIAN: Template = [
  { name: "Breakfast", time: "7:30 am", items: [["Oats (dry)", 60], ["Greek yogurt (plain, nonfat)", 170], ["Banana", 118], ["Chia seeds", 12]] },
  { name: "Lunch", time: "12:30 pm", items: [["Brown rice (cooked)", 180], ["Tofu (firm)", 200], ["Bok choy", 150], ["Olive oil", 7]] },
  { name: "Pre-workout snack", time: "4:00 pm", items: [["Egg (boiled)", 100], ["Apple", 182]] },
  { name: "Dinner", time: "7:30 pm", items: [["Lentils (cooked)", 200], ["Chapati", 80], ["Stir-fried mixed vegetables", 150]] },
  { name: "Post-workout / supper", time: "9:30 pm", items: [["Cottage cheese", 150], ["Low fat milk", 250]] },
];
const VEGAN: Template = [
  { name: "Breakfast", time: "7:30 am", items: [["Oats (dry)", 70], ["Soy milk (unsweetened)", 250], ["Banana", 118], ["Peanut butter", 16]] },
  { name: "Lunch", time: "12:30 pm", items: [["Quinoa (cooked)", 185], ["Tempeh", 150], ["Spinach", 60], ["Olive oil", 7]] },
  { name: "Pre-workout snack", time: "4:00 pm", items: [["Edamame", 155], ["Apple", 182]] },
  { name: "Dinner", time: "7:30 pm", items: [["Brown rice (cooked)", 180], ["Tofu (firm)", 200], ["Stir-fried mixed vegetables", 150]] },
  { name: "Post-workout / supper", time: "9:30 pm", items: [["Plant protein powder", 33], ["Soy milk (unsweetened)", 250]] },
];

/**
 * A sample day scaled to the user's calorie target. Protein foods keep their portion
 * (scaled gently) while carb and fat portions flex to close the calorie gap.
 */
export function sampleDay(
  t: Targets,
  diet: Diet,
  opts: { allergies?: Allergen[]; fasting?: Profile["fasting"] } = {},
): { meals: PlannedMeal[]; total: Nutrients } {
  const base = diet === "vegan" ? VEGAN : diet === "vegetarian" ? VEGETARIAN : OMNI;
  // Leave out anything the person is allergic to; the other portions grow to make up the calories.
  const safe = (items: [string, number][]) => items.filter(([n]) => foodConflicts(food(n), { diet, allergies: opts.allergies ?? [] }).length === 0);
  const template = withFasting(base, opts.fasting ?? "off")
    .map((m) => ({ ...m, items: safe(m.items) }))
    .filter((m) => m.items.length > 0);
  const isProteinFood = (f: Food) => (f.per100.protein * 4) / Math.max(1, f.per100.kcal) > 0.35;
  const flat = template.flatMap((m) => m.items.map(([n, g]) => ({ f: food(n), g })));
  const proteinItems = flat.filter((x) => isProteinFood(x.f));
  const otherItems = flat.filter((x) => !isProteinFood(x.f));

  // Solve for two portion multipliers — one for protein foods, one for everything else — so the
  // day hits both the calorie and the protein target (carb foods carry protein too, so iterate).
  const totals = (list: typeof flat) => sum(list.map((x) => scale(x.f.per100, x.g)));
  const P = totals(proteinItems);
  const O = totals(otherItems);
  let proteinRatio = 1;
  let otherRatio = 1;
  for (let i = 0; i < 12; i++) {
    otherRatio = Math.min(2.5, Math.max(0.3, (t.kcal - P.kcal * proteinRatio) / O.kcal));
    const protein = P.protein * proteinRatio + O.protein * otherRatio;
    proteinRatio = Math.min(2, Math.max(0.3, proteinRatio * (t.protein / protein)));
  }
  otherRatio = Math.min(2.5, Math.max(0.3, (t.kcal - P.kcal * proteinRatio) / O.kcal));

  const portion = (f: Food, g: number) => {
    const grams = g * (isProteinFood(f) ? proteinRatio : otherRatio);
    // Round to sensible kitchen units.
    return grams < 30 ? Math.round(grams) : Math.round(grams / 5) * 5;
  };

  const meals = template.map((m) => {
    const items = m.items.map(([n, g]) => {
      const f = food(n);
      const grams = portion(f, g);
      return { food: f, grams, nutrients: scale(f.per100, grams) };
    });
    return { name: m.name, time: m.time, items, total: sum(items.map((x) => x.nutrients)) };
  });
  return { meals, total: sum(meals.map((m) => m.total)) };
}

/** Ramadan: sahur before dawn, iftar at sunset, moreh at night. 16:8: eat between 12 pm and 8 pm. */
function withFasting(t: Template, fasting: Profile["fasting"]): Template {
  const [breakfast, lunch, snack, dinner, supper] = t;
  if (fasting === "ramadan") {
    return [
      { name: "Sahur", time: "5:00 am", items: breakfast.items },
      { name: "Iftar", time: "7:25 pm", items: [["Dates", 24], ...lunch.items] },
      { name: "Moreh", time: "10:00 pm", items: [...snack.items, ...supper.items] },
    ];
  }
  if (fasting === "16:8") {
    return [
      { name: "First meal", time: "12:00 pm", items: lunch.items },
      { name: "Snack", time: "4:00 pm", items: [...snack.items, ...supper.items] },
      { name: "Last meal", time: "7:30 pm", items: dinner.items },
    ];
  }
  return t;
}

export function mealTiming(goal: Goal, fasting: Profile["fasting"] = "off") {
  if (fasting === "ramadan") {
    return [
      { title: "Sahur", text: "Eat slow carbs and protein before dawn: oats, wholemeal bread, eggs, yogurt. Skip salty and very sweet food so you stay less thirsty." },
      { title: "Iftar", text: "Break your fast with water and 2–3 dates, then a balanced plate: rice, lean protein and vegetables. Go easy on fried food and sweet drinks." },
      { title: "Training", text: "Lift about an hour before iftar or after tarawih. Keep sessions shorter and drop the volume, not the weight." },
      { title: "Hydration", text: "Drink 2–3 litres between iftar and sahur — a glass every hour or so — rather than all at once." },
    ];
  }
  if (fasting === "16:8") {
    return [
      { title: "Eating window", text: "Eat between 12 pm and 8 pm. Water, black coffee and plain tea are fine while fasting." },
      { title: "Protein", text: "Spread your protein over 2–3 meals in the window — at least 30 g each — to protect muscle." },
      { title: "Training", text: "Train in the window if you can, or have your first meal soon after a morning session." },
      { title: "Hydration", text: "Drink about 35 ml per kg of body weight a day, including during the fast." },
    ];
  }
  return defaultTiming(goal);
}

function defaultTiming(goal: Goal) {
  return [
    { title: "Before training (1–2 h)", text: "Carbs + some protein, low fat: rice with chicken, oats with yogurt, or a banana with a protein shake." },
    { title: "After training (within 2 h)", text: "20–40 g protein plus carbs to refill glycogen: chicken rice, tuna sandwich, or a shake with fruit." },
    {
      title: "Hydration",
      text: "Drink about 35 ml per kg of body weight a day, plus 500–750 ml for each hour of training in Malaysia's heat.",
    },
    goal === "lose"
      ? { title: "Cutting tips", text: "Order 'kurang manis' or 'kosong' drinks, choose soup over fried noodles, and double the vegetables at the economy rice stall." }
      : goal === "gain"
        ? { title: "Bulking tips", text: "Add an extra scoop of rice, drink milk with meals, and keep easy snacks (nuts, bread with peanut butter) on hand." }
        : { title: "Maintenance tips", text: "Use the 80/20 rule: whole foods most of the time, favourite hawker meals in moderation." },
  ];
}
