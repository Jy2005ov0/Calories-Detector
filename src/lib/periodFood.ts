import { FOOD_BY_NAME } from "../data/foods";
import { foodConflicts } from "./allergens";
import type { Phase } from "./cycle";
import type { DayStats, Food, Profile } from "./types";

// Food for how you feel on your period: for heavy flow and each symptom, several foods that help
// and why, plus what to cut back on. Every food is one from the food list, so it can be logged in
// a tap, and foods that clash with the person's diet or allergies are left out. General guidance
// from nutrition research, not medical advice. Text is English keys for t().

export type FoodSituation = "heavyFlow" | "period" | "cramps" | "bloating" | "headache" | "tired" | "lowMood" | "nausea" | "backPain" | "breasts" | "acne" | "cravings";

interface Tip {
  food: string;
  why: string;
}

interface SituationDef {
  title: string;
  intro: string;
  tips: Tip[];
  limit: string;
  /** Something that needs a doctor rather than food. */
  warn?: string;
}

const DEFS: Record<FoodSituation, SituationDef> = {
  heavyFlow: {
    title: "Heavy flow",
    intro: "A heavy period takes iron with it, which can leave you tired and dizzy. Eat iron-rich food with something high in vitamin C, which helps your body take the iron in.",
    tips: [
      { food: "Beef steak (sirloin, grilled)", why: "Red meat has the iron your body absorbs most easily" },
      { food: "Chicken liver", why: "One of the richest sources of iron and vitamin B12" },
      { food: "Cockles (boiled)", why: "Kerang are packed with iron" },
      { food: "Chinese spinach (bayam)", why: "Iron and folate, for new red blood cells" },
      { food: "Lentils (cooked)", why: "Plant iron with protein and fibre" },
      { food: "Tofu (firm)", why: "Iron and protein without meat" },
      { food: "Sardines (canned in tomato)", why: "Iron, protein and omega-3 in a cheap tin" },
      { food: "Guava", why: "More vitamin C than an orange: eat it with the iron" },
      { food: "Orange", why: "Vitamin C helps you absorb iron from the same meal" },
    ],
    limit: "Tea or coffee with meals: they block iron. Have them an hour before or after.",
    warn: "Soaking through a pad or tampon every hour, passing large clots or bleeding for more than 7 days needs a doctor.",
  },
  period: {
    title: "On your period",
    intro: "Replace the iron you lose, drink enough and keep meals regular.",
    tips: [
      { food: "Beef steak (sirloin, grilled)", why: "Iron your body absorbs easily" },
      { food: "Cockles (boiled)", why: "Kerang are packed with iron" },
      { food: "Kangkung (water spinach)", why: "Iron and folate" },
      { food: "Dhal curry", why: "Plant iron and protein" },
      { food: "Guava", why: "Vitamin C to absorb the iron" },
      { food: "Water", why: "Staying hydrated eases cramps and headaches" },
    ],
    limit: "Salty and very sugary food, which make bloating and mood swings worse.",
  },
  cramps: {
    title: "Cramps",
    intro: "Magnesium relaxes muscles, omega-3 fats calm the inflammation behind period pain, and something warm helps.",
    tips: [
      { food: "Ginger (fresh)", why: "Steep slices in hot water: ginger tea eases period pain in studies" },
      { food: "Dark chocolate (70%)", why: "Magnesium in 2–3 squares" },
      { food: "Banana", why: "Potassium and magnesium for muscle cramps" },
      { food: "Mackerel (grilled)", why: "Ikan kembung: omega-3 fats that ease pain" },
      { food: "Salmon (baked)", why: "Omega-3 fats that ease pain" },
      { food: "Pumpkin seeds", why: "Magnesium and zinc in a handful" },
      { food: "Almonds", why: "Magnesium and healthy fats" },
      { food: "Chicken soup", why: "Warm and easy on a sore stomach" },
    ],
    limit: "Fried and salty food, and lots of coffee, which can make cramps worse.",
    warn: "Pain that stops you doing everyday things, or doesn't ease with painkillers, is worth seeing a doctor about.",
  },
  bloating: {
    title: "Bloating",
    intro: "Potassium-rich, watery food and less salt help your body let go of extra water.",
    tips: [
      { food: "Water", why: "More water, not less, reduces water retention" },
      { food: "Banana", why: "Potassium balances out salt" },
      { food: "Cucumber", why: "Mostly water, with potassium" },
      { food: "Watermelon", why: "Hydrating and light" },
      { food: "Papaya", why: "Gentle on digestion" },
      { food: "Greek yogurt (plain, nonfat)", why: "Probiotics for a calmer gut" },
      { food: "Ginger (fresh)", why: "Ginger tea eases a bloated stomach" },
    ],
    limit: "Salty snacks, instant noodles, fizzy drinks and chewing gum.",
  },
  headache: {
    title: "Headache",
    intro: "Period headaches often come with dehydration and low blood sugar. Drink, eat regularly and get some magnesium.",
    tips: [
      { food: "Water", why: "Even mild dehydration can start a headache" },
      { food: "Coconut water", why: "Water with natural electrolytes" },
      { food: "Almonds", why: "Magnesium, which can help prevent headaches" },
      { food: "Spinach", why: "Magnesium and iron" },
      { food: "Oatmeal (cooked with water)", why: "Slow carbs keep your blood sugar steady" },
      { food: "Banana", why: "Magnesium and an easy snack between meals" },
      { food: "Watermelon", why: "Water and a little natural sugar" },
    ],
    limit: "Skipping meals, and big changes in how much coffee you drink.",
  },
  tired: {
    title: "Tired",
    intro: "Iron, protein and slow carbs give steady energy instead of a sugar crash.",
    tips: [
      { food: "Oatmeal (cooked with water)", why: "Slow-release energy for the morning" },
      { food: "Egg (boiled)", why: "Protein and vitamin B12" },
      { food: "Brown rice (cooked)", why: "Slow carbs and B vitamins" },
      { food: "Chickpeas (cooked)", why: "Iron, protein and fibre" },
      { food: "Beef steak (sirloin, grilled)", why: "Iron for low energy after heavy days" },
      { food: "Dates", why: "Quick natural energy with some iron" },
      { food: "Greek yogurt (plain, nonfat)", why: "Protein that keeps you going" },
    ],
    limit: "Sugary drinks and energy drinks: a quick high, then a crash.",
  },
  lowMood: {
    title: "Low mood",
    intro: "Omega-3 fats, protein and slow carbs support the brain chemicals that lift mood.",
    tips: [
      { food: "Salmon (baked)", why: "Omega-3 fats linked to better mood" },
      { food: "Walnuts", why: "Plant omega-3 in a handful" },
      { food: "Egg (boiled)", why: "Protein and vitamin D" },
      { food: "Oatmeal (cooked with water)", why: "Slow carbs help the body make serotonin" },
      { food: "Banana", why: "Vitamin B6 for mood" },
      { food: "Dark chocolate (70%)", why: "A little lifts mood (2–3 squares)" },
      { food: "Chickpeas (cooked)", why: "B vitamins and steady energy" },
    ],
    limit: "Alcohol and lots of sugar, which can make mood dips worse.",
    warn: "If you feel very low or anxious every month, a doctor can help: it may be PMDD, which is treatable.",
  },
  nausea: {
    title: "Nausea",
    intro: "Small, plain, cool foods are easiest. Eat a little often rather than big meals.",
    tips: [
      { food: "Ginger (fresh)", why: "Ginger is proven to ease nausea: in tea or a slice to chew" },
      { food: "Teh halia (ginger milk tea)", why: "Ginger in a warm drink" },
      { food: "Crackers (cream crackers)", why: "Plain and easy to keep down" },
      { food: "Rice porridge (plain)", why: "Bubur: gentle on the stomach" },
      { food: "Banana", why: "Soft and easy to digest" },
      { food: "Apple sauce (unsweetened)", why: "Plain and soothing" },
      { food: "Water", why: "Small sips often keep you hydrated" },
    ],
    limit: "Greasy, spicy and strong-smelling food.",
  },
  backPain: {
    title: "Back pain",
    intro: "Foods that calm inflammation can ease the dull ache in your lower back.",
    tips: [
      { food: "Mackerel (grilled)", why: "Omega-3 fats that calm inflammation" },
      { food: "Ikan goreng kunyit (turmeric fried fish)", why: "Turmeric is anti-inflammatory" },
      { food: "Spinach", why: "Magnesium for tight muscles" },
      { food: "Walnuts", why: "Omega-3 and magnesium" },
      { food: "Ginger (fresh)", why: "Ginger tea eases aches" },
      { food: "Banana", why: "Potassium for muscles" },
    ],
    limit: "Fried food and sugary snacks.",
  },
  breasts: {
    title: "Tender breasts",
    intro: "Less salt and caffeine, and more fibre, can ease swelling and tenderness.",
    tips: [
      { food: "Flaxseeds, ground", why: "A spoonful a day may ease breast pain" },
      { food: "Oatmeal (cooked with water)", why: "Fibre helps balance hormones" },
      { food: "Broccoli", why: "Fibre and vitamins" },
      { food: "Apple", why: "Fibre and water" },
      { food: "Chickpeas (cooked)", why: "Fibre and vitamin B6" },
      { food: "Water", why: "Helps with swelling" },
    ],
    limit: "Coffee, tea, cola and salty food.",
  },
  acne: {
    title: "Acne",
    intro: "Low-sugar meals and zinc help skin around your period.",
    tips: [
      { food: "Pumpkin seeds", why: "Zinc, which helps skin heal" },
      { food: "Chickpeas (cooked)", why: "Zinc and fibre" },
      { food: "Salmon (baked)", why: "Omega-3 calms inflamed skin" },
      { food: "Broccoli", why: "Vitamins A and C for skin" },
      { food: "Brown rice (cooked)", why: "Low-GI carbs instead of white rice" },
      { food: "Greek yogurt (plain, nonfat)", why: "Protein without added sugar" },
    ],
    limit: "Sugary drinks, sweets and lots of milk.",
  },
  cravings: {
    title: "Cravings",
    intro: "Cravings are normal before and during a period. Protein and fibre keep you full, and these swaps hit the spot.",
    tips: [
      { food: "Dark chocolate (70%)", why: "For chocolate cravings: 2–3 squares" },
      { food: "Dates", why: "Sweet, with fibre and iron" },
      { food: "Greek yogurt with honey", why: "Sweet and full of protein" },
      { food: "Roasted chickpeas (snack)", why: "Crunchy and salty, with protein" },
      { food: "Banana", why: "Naturally sweet and filling" },
      { food: "Popcorn (air-popped)", why: "A big bowl for few calories" },
    ],
    limit: "Eating straight from the packet: put a portion in a bowl.",
  },
};

export interface FoodHelp {
  key: FoodSituation;
  title: string;
  intro: string;
  foods: { food: Food; why: string }[];
  limit: string;
  warn?: string;
}

/**
 * What to eat for today: heavy flow first, then each symptom logged, or general period advice when
 * on a period with nothing logged. Empty outside a period with nothing logged.
 */
export function foodHelp(day: Pick<DayStats, "flow" | "symptoms"> | undefined, phase: Phase | undefined, profile: Pick<Profile, "allergies" | "diet">): FoodHelp[] {
  const keys: FoodSituation[] = [];
  if (day?.flow === "heavy") keys.push("heavyFlow");
  for (const s of day?.symptoms ?? []) if (s in DEFS) keys.push(s as FoodSituation);
  if (!keys.length && (phase === "period" || (day?.flow && day.flow !== "spotting"))) keys.push("period");
  return keys.map((key) => {
    const d = DEFS[key];
    const foods = d.tips
      .map((tip) => ({ food: FOOD_BY_NAME.get(tip.food), why: tip.why }))
      .filter((x): x is { food: Food; why: string } => !!x.food && foodConflicts(x.food, profile).length === 0);
    return { key, title: d.title, intro: d.intro, foods, limit: d.limit, warn: d.warn };
  });
}

/** Every food named here, for checking they're all in the food list. */
export const allSuggestedFoods = () => [...new Set(Object.values(DEFS).flatMap((d) => d.tips.map((x) => x.food)))];
