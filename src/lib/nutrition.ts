import { t as tr } from "../i18n";
import type { Food, Goal, Nutrients, Profile } from "./types";

export const ZERO: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, satFat: 0, sodium: 0 };

export function scale(per100: Nutrients, grams: number): Nutrients {
  const f = grams / 100;
  return {
    kcal: per100.kcal * f,
    protein: per100.protein * f,
    carbs: per100.carbs * f,
    fat: per100.fat * f,
    fiber: per100.fiber * f,
    sugar: per100.sugar * f,
    satFat: per100.satFat * f,
    sodium: per100.sodium * f,
  };
}

export function sum(list: Nutrients[]): Nutrients {
  return list.reduce(
    (a, n) => ({
      kcal: a.kcal + n.kcal,
      protein: a.protein + n.protein,
      carbs: a.carbs + n.carbs,
      fat: a.fat + n.fat,
      fiber: a.fiber + n.fiber,
      sugar: a.sugar + n.sugar,
      satFat: a.satFat + n.satFat,
      sodium: a.sodium + n.sodium,
    }),
    ZERO,
  );
}

/** Mifflin-St Jeor resting energy expenditure. */
export function bmr(p: Pick<Profile, "sex" | "weightKg" | "heightCm" | "age">): number {
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === "male" ? 5 : -161);
}

export function tdee(p: Profile): number {
  return bmr(p) * p.activity;
}

const GOAL_ADJUST: Record<Goal, number> = { lose: -0.2, maintain: 0, gain: 0.1 };

export interface Targets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugarMax: number;
  satFatMax: number;
  sodiumMax: number;
}

export function targets(p: Profile): Targets {
  const floor = p.sex === "male" ? 1500 : 1200;
  // During Ramadan a 20% deficit on top of fasting is hard to sustain; use 15%.
  const adjust = p.goal === "lose" && p.fasting === "ramadan" ? -0.15 : GOAL_ADJUST[p.goal];
  const kcal = Math.max(floor, Math.round((tdee(p) * (1 + adjust)) / 10) * 10);
  // Protein: 2.0 g/kg while cutting (preserve muscle), 1.8 g/kg otherwise (ISSN position stand).
  // Above a BMI of 25 it's based on the weight at BMI 25, since extra body fat doesn't need extra protein.
  const m = p.heightCm / 100;
  const leanRef = m > 0 ? Math.min(p.weightKg, 25 * m * m) : p.weightKg;
  const protein = Math.round(leanRef * (p.goal === "lose" ? 2.0 : 1.8));
  // At least 50 g carbs; fat gives way if the day is too small for both (it never drops below 20% of energy).
  const fat = Math.round(Math.max(kcal * 0.2, Math.min(kcal * (p.goal === "lose" ? 0.27 : 0.28), kcal - protein * 4 - 200)) / 9);
  const carbs = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return {
    kcal,
    protein,
    carbs,
    fat,
    fiber: Math.round((kcal / 1000) * 14),
    sugarMax: Math.round((kcal * 0.1) / 4), // WHO: free sugars < 10% energy
    satFatMax: Math.round((kcal * 0.1) / 9),
    sodiumMax: 2000, // WHO
  };
}

export function bmi(p: Pick<Profile, "weightKg" | "heightCm">) {
  const m = p.heightCm / 100;
  return p.weightKg / (m * m);
}

export function bmiLabel(v: number) {
  // Asia-Pacific cut-offs (WHO 2004) are used because they suit Malaysian users better.
  if (v < 18.5) return tr("Underweight");
  if (v < 23) return tr("Healthy");
  if (v < 27.5) return tr("Overweight");
  return tr("Obese");
}

export type Grade = "A" | "B" | "C" | "D" | "E";

export interface HealthReport {
  score: number; // 0-100
  grade: Grade;
  positives: string[];
  negatives: string[];
}

/**
 * Nutrient-density score for a portion. Rewards protein and fibre per calorie,
 * penalises sugar, saturated fat and sodium per calorie (a simplified Nutri-Score
 * that works for mixed meals as well as single foods).
 */
export function healthReport(n: Nutrients, opts: { intrinsicSugar?: boolean } = {}): HealthReport {
  const positives: string[] = [];
  const negatives: string[] = [];
  if (n.kcal < 10 && n.sugar < 1 && n.sodium < 100) return { score: 100, grade: "A", positives: [tr("Practically calorie-free")], negatives };

  // Near-zero-calorie items (salt, stock, sugar-free syrup) would divide by ~0; 10 kcal is the floor.
  const per100kcal = (v: number) => (v / Math.max(n.kcal, 10)) * 100;
  const proteinD = per100kcal(n.protein); // g per 100 kcal
  const fiberD = per100kcal(n.fiber);
  const sugarD = per100kcal(n.sugar);
  const satD = per100kcal(n.satFat);
  const sodiumD = per100kcal(n.sodium); // mg per 100 kcal

  let score = 55;
  score += Math.min(25, proteinD * 3.2);
  score += Math.min(15, fiberD * 6);
  // WHO limits *free* sugars; sugar inside whole fruit and vegetables isn't penalised.
  if (!opts.intrinsicSugar) score -= Math.min(25, Math.max(0, sugarD - 2) * 2.2);
  score -= Math.min(25, Math.max(0, satD - 1.1) * 7); // WHO: sat fat < 10% energy ≈ 1.1 g/100 kcal
  score -= Math.min(20, Math.max(0, sodiumD - 120) / 18);
  score = Math.round(Math.max(0, Math.min(100, score)));

  if (proteinD >= 6) positives.push(tr("High in protein"));
  else if (proteinD >= 3.5) positives.push(tr("Good protein source"));
  if (fiberD >= 1.5) positives.push(tr("Rich in fibre"));
  if (sugarD <= 2) positives.push(tr("Low sugar"));
  if (satD <= 1) positives.push(tr("Low saturated fat"));
  if (sugarD > 8 && !opts.intrinsicSugar) negatives.push(tr("High in sugar"));
  if (opts.intrinsicSugar && sugarD > 8) positives.push(tr("Natural fruit sugar"));
  if (satD > 2.2) negatives.push(tr("High in saturated fat"));
  if (sodiumD > 300) negatives.push(tr("High in sodium"));
  if (n.sodium > 1000) negatives.push(tr("{mg} mg sodium — half a day's limit", { mg: Math.round(n.sodium) }));
  if (proteinD < 2 && n.kcal > 150) negatives.push(tr("Low protein for the calories"));

  const grade: Grade = score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "E";
  return { score, grade, positives, negatives };
}

export interface Suitability {
  verdict: "great" | "ok" | "caution" | "avoid";
  headline: string;
  reasons: string[];
}

/** Does this portion fit what the user still has left today, given their goal? */
export function suitability(n: Nutrients, t: Targets, eatenToday: Nutrients, goal: Goal, intrinsicSugar = false): Suitability {
  const reasons: string[] = [];
  const remaining = t.kcal - eatenToday.kcal;
  const shareOfDay = n.kcal / t.kcal;
  const health = healthReport(n, { intrinsicSugar });
  let points = 0;

  if (n.kcal > remaining + 150) {
    reasons.push(tr("Puts you {kcal} kcal over today's target.", { kcal: Math.round(n.kcal - remaining) }));
    points -= goal === "lose" ? 3 : 1;
  } else if (remaining > 0) {
    reasons.push(tr("Uses {pct}% of the {left} kcal you have left.", { pct: Math.round((n.kcal / Math.max(remaining, 1)) * 100), left: Math.round(remaining) }));
  }
  if (shareOfDay > 0.45) {
    reasons.push(tr("That's a very large single portion (over 45% of your day)."));
    points -= 1;
  }

  const proteinLeft = Math.max(0, t.protein - eatenToday.protein);
  if (n.protein >= 25 || (proteinLeft > 0 && n.protein / proteinLeft > 0.3)) {
    reasons.push(tr("{g} g protein helps you reach your {goal} g goal.", { g: Math.round(n.protein), goal: t.protein }));
    points += 2;
  }
  if (goal === "gain" && n.kcal >= 500 && n.protein >= 25) {
    reasons.push(tr("Calorie-dense with solid protein — good for building muscle."));
    points += 1;
  }
  if (goal === "lose" && n.kcal > 0 && n.protein / n.kcal >= 0.08) {
    reasons.push(tr("High protein per calorie keeps you full while cutting."));
    points += 1;
  }
  if (!intrinsicSugar && eatenToday.sugar + n.sugar > t.sugarMax) {
    reasons.push(tr("Takes you past the {g} g daily sugar limit.", { g: t.sugarMax }));
    points -= 1;
  }
  if (eatenToday.sodium + n.sodium > t.sodiumMax) {
    reasons.push(tr("Takes you past the 2,000 mg daily sodium limit."));
    points -= 1;
  }
  if (health.grade === "A" || health.grade === "B") points += 1;
  if (health.grade === "E") points -= 2;
  else if (health.grade === "D") points -= 1;

  // A treat can fit the numbers, but shouldn't be called a great choice.
  if (health.grade === "E") points = Math.min(points, -1);
  else if (health.grade !== "A" && health.grade !== "B") points = Math.min(points, 1);

  if (points >= 2) return { verdict: "great", headline: tr("Great choice for your goal"), reasons };
  if (points >= 0) return { verdict: "ok", headline: tr("Fits your plan"), reasons };
  if (points >= -2) return { verdict: "caution", headline: tr("OK occasionally — watch the portion"), reasons };
  return { verdict: "avoid", headline: tr("Not a good fit today"), reasons };
}

export function searchFoods(foods: Food[], query: string, limit = 60): Food[] {
  const q = query.trim().toLowerCase();
  if (!q) return foods.slice(0, limit);
  const terms = q.split(/\s+/);
  const scored: { f: Food; s: number }[] = [];
  for (const f of foods) {
    const name = f.name.toLowerCase();
    const hay = `${name} ${f.aliases ?? ""} ${f.category.toLowerCase()} ${f.brand?.toLowerCase() ?? ""}`;
    if (!terms.every((t) => hay.includes(t))) continue;
    let s = 0;
    if (name === q) s += 100;
    if (name.startsWith(q)) s += 35;
    if (name.includes(q)) s += 20;
    // Whole words beat word fragments: "salmon" → "Salmon, raw" before "Salmonberries".
    if (new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(name)) s += 25;
    if (terms.every((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(name))) s += 10;
    // An alias only counts when it's why the food matched ("roti prata" → Roti canai).
    if (!name.includes(q) && (f.aliases ?? "").toLowerCase().split(" ").includes(q)) s += 30;
    // The name before any comma or bracket is the food itself: "Salmon, sockeye, cooked", "Nasi lemak (with sambal…)".
    const head = name.split(/[,(]/)[0].trim();
    if (head === q || head === `${q}s` || head === `${q}es`) s += 60;
    // English puts the main noun last: "rice" → "White rice" before "Rice vermicelli".
    else if (head.endsWith(` ${q}`) || head.endsWith(` ${q}s`)) s += 45;
    // Everyday staples before regional variations.
    if (f.staple) s += 20;
    // Everyday forms before processed ones.
    if (/\b(raw|cooked|boiled|steamed|roasted|grilled|baked|whole)\b/.test(name)) s += 6;
    if (/\b(dried|dehydrated|dry mix|powder|concentrate|babyfood|baby food|infant|freeze-dried|imitation)\b/.test(name) && !q.includes("dried") && !q.includes("powder")) s -= 25;
    s -= name.length / 20;
    scored.push({ f, s });
  }
  return scored.sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.f);
}

export const round = (v: number, d = 0) => {
  const p = 10 ** d;
  return Math.round(v * p) / p;
};

/** Whole fruit and vegetables carry intrinsic (not free) sugar. */
export const isWholeProduce = (f: Pick<Food, "category">) => f.category === "Fruits" || f.category === "Vegetables";
