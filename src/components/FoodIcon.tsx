import { memo } from "react";
import { foodIcon } from "../lib/foodIcon";

// The picture is drawn with CSS (::before), so it isn't part of the text: screen readers and
// text matching see "Lunch", not "🍱Lunch".

/** A small picture of a food on a soft tile, tinted by kind (vegetables green, drinks blue…). */
export const FoodIcon = memo(function FoodIcon({ name, category, size = 40 }: { name: string; category?: string; size?: number }) {
  const { emoji, tone } = foodIcon(name, category);
  return (
    <span className={`food-icon tone-${tone}`} data-emoji={emoji} style={{ width: size, height: size, fontSize: Math.round(size * 0.56) }} aria-hidden />
  );
});

const MEAL_ICON: Record<string, [string, string]> = {
  breakfast: ["🍳", "tone-grain"],
  lunch: ["🍱", "tone-main"],
  dinner: ["🍲", "tone-protein"],
  snack: ["🍎", "tone-plant"],
  sahur: ["🌅", "tone-grain"],
  iftar: ["🌇", "tone-main"],
  moreh: ["🌙", "tone-drink"],
};

/** A picture for a meal of the day (breakfast, lunch…, or sahur, iftar and moreh in Ramadan). */
export function MealIcon({ meal, ramadan, size = 26 }: { meal: string; ramadan?: boolean; size?: number }) {
  const key = ramadan ? ({ breakfast: "sahur", dinner: "iftar", snack: "moreh" } as Record<string, string>)[meal] ?? meal : meal;
  const [emoji, tone] = MEAL_ICON[key] ?? MEAL_ICON.lunch;
  return (
    <span className={`food-icon ${tone}`} data-emoji={emoji} style={{ width: size, height: size, fontSize: Math.round(size * 0.6) }} aria-hidden />
  );
}

/** The meal a sample-day or plan name stands for ("Sahur", "First meal", "Post-workout / supper"…). */
export function mealOfName(name: string): string {
  const n = name.toLowerCase();
  if (/sahur/.test(n)) return "sahur";
  if (/iftar/.test(n)) return "iftar";
  if (/moreh/.test(n)) return "moreh";
  if (/breakfast|first meal/.test(n)) return "breakfast";
  if (/lunch/.test(n)) return "lunch";
  if (/dinner|last meal/.test(n)) return "dinner";
  return "snack";
}
