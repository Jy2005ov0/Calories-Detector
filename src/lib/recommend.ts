import { t as tr } from "../i18n";
import { recommendedFoods } from "./diet";
import type { SplitId } from "./fitness";
import { bmi, targets, type Targets } from "./nutrition";
import type { Goal, Profile } from "./types";

// BMI bands use the WHO Asia-Pacific cut-offs (2004), which the Malaysian
// Clinical Practice Guidelines on obesity also use.
export const BMI_BANDS = [
  { key: "under", label: "Underweight", from: 0, to: 18.5, color: "var(--blue)", fill: "var(--accent-fill)" },
  { key: "healthy", label: "Healthy", from: 18.5, to: 23, color: "var(--green)", fill: "var(--green-fill)" },
  { key: "over", label: "Overweight", from: 23, to: 27.5, color: "var(--orange)", fill: "var(--orange-fill)" },
  { key: "obese", label: "Obese", from: 27.5, to: Infinity, color: "var(--red)", fill: "var(--red-fill)" },
] as const;

export type BmiBand = (typeof BMI_BANDS)[number];

export function bmiBand(value: number): BmiBand {
  return BMI_BANDS.find((b) => value < b.to) ?? BMI_BANDS[BMI_BANDS.length - 1];
}

/** Weight range (kg) that gives a healthy BMI at this height. */
export function healthyWeightRange(heightCm: number) {
  const m2 = (heightCm / 100) ** 2;
  return { min: Math.ceil(18.5 * m2), max: Math.floor(22.9 * m2) };
}

export interface BodyCheck {
  bmi: number;
  band: BmiBand;
  range: { min: number; max: number };
  /** kg to lose (negative) or gain (positive) to reach the healthy range; 0 if already inside. */
  toHealthy: number;
  weeksToHealthy: number;
  goal: Goal;
  goalReason: string;
  training: {
    days: number;
    split: Exclude<SplitId, "auto">;
    headline: string;
    points: string[];
  };
  nutrition: {
    targets: Targets;
    headline: string;
    eat: string[];
    limit: string[];
    points: string[];
  };
  caveat: string;
}

/**
 * Turns height and weight (plus the rest of the profile for calorie maths) into a
 * starting recommendation: which goal to pick, how to train, and what to eat.
 */
export function bodyCheck(p: Profile, heightCm: number, weightKg: number): BodyCheck {
  const value = bmi({ heightCm, weightKg });
  const band = bmiBand(value);
  const range = healthyWeightRange(heightCm);
  const toHealthy = weightKg > range.max ? range.max - weightKg : weightKg < range.min ? range.min - weightKg : 0;
  // Sustainable rates: lose ~0.5 kg/week, gain ~0.25 kg/week (lean gain).
  const weeksToHealthy = toHealthy === 0 ? 0 : Math.ceil(Math.abs(toHealthy) / (toHealthy < 0 ? 0.5 : 0.25));

  let goal: Goal;
  let goalReason: string;
  switch (band.key) {
    case "under":
      goal = "gain";
      goalReason = tr("Gaining about {kg} kg, mostly muscle, would bring you into the healthy range.", { kg: Math.abs(Math.round(toHealthy)) });
      break;
    case "healthy":
      goal = p.goal === "lose" ? "maintain" : p.goal;
      goalReason =
        goal === "gain"
          ? tr("You're in the healthy range, so you can focus on building muscle with a small surplus.")
          : tr("You're in the healthy range. Keep your weight steady and build strength to tone up.");
      break;
    default:
      goal = "lose";
      goalReason = tr("Losing about {kg} kg would bring you into the healthy range. At 0.5 kg a week that's around {weeks} weeks.", {
        kg: Math.abs(Math.round(toHealthy)),
        weeks: weeksToHealthy,
      });
  }

  const training: BodyCheck["training"] =
    band.key === "obese"
      ? {
          days: 3,
          split: "fullbody",
          headline: tr("Full-body strength 3× a week + daily low-impact cardio"),
          points: [
            tr("Start with low-impact cardio that's easy on the knees: brisk walking, cycling or swimming, building to 150–300 minutes a week."),
            tr("Lift 3× a week with full-body sessions (machines and dumbbells are fine) to keep muscle while you lose fat."),
            tr("Aim for 7,000–10,000 steps a day. Everyday movement burns more than most workouts."),
            tr("Increase intensity slowly; if you have joint pain or a medical condition, check with a doctor first."),
          ],
        }
      : band.key === "over"
        ? {
            days: 4,
            split: "upperlower",
            headline: tr("Upper / Lower 4× a week + 150 min cardio"),
            points: [
              tr("Lift 4× a week on an upper/lower split, keeping the weights heavy so your body holds on to muscle."),
              tr("Add 150 minutes of moderate cardio a week: a 20–30 min incline walk or bike after lifting works well."),
              tr("One or two HIIT sessions a week (sprints, rowing intervals) help if you enjoy them; they aren't required."),
              tr("Keep 8,000–10,000 steps a day."),
            ],
          }
        : band.key === "under"
          ? {
              days: 3,
              split: "fullbody",
              headline: tr("Heavy full-body lifting 3× a week, light cardio only"),
              points: [
                tr("Focus on big compound lifts (squat, bench press, row, deadlift, overhead press) in the 6–10 rep range."),
                tr("Add a little weight or a rep every week; that progression is what builds muscle."),
                tr("Keep cardio light (walks, sport for fun) so you don't burn the calories you need to grow."),
                tr("Sleep 7–9 hours; most muscle is built while you recover."),
              ],
            }
          : goal === "gain"
            ? {
                days: 5,
                split: "bodypart",
                headline: tr("Body-part split 5× a week (Chest · Back · Legs · Shoulders · Arms)"),
                points: [
                  tr("Train each muscle with 10–20 hard sets a week, stopping 1–2 reps short of failure."),
                  tr("Use progressive overload: add weight once you hit the top of the rep range on every set."),
                  tr("Keep cardio to 2 short sessions a week for heart health."),
                ],
              }
            : {
                days: 4,
                split: "upperlower",
                headline: tr("Upper / Lower 4× a week + 2 cardio sessions"),
                points: [
                  tr("Four lifting sessions a week build strength and a toned, athletic look."),
                  tr("Add two 20–30 min cardio sessions for heart health and recovery."),
                  tr("Track your lifts; getting stronger at the same body weight means you're recomposing."),
                ],
              };

  const t = targets({ ...p, heightCm, weightKg, goal });
  const groups = recommendedFoods(goal, p.diet, p.allergies);
  const strip = (n: string) => n.replace(/ \(.*\)$/, "");
  const eat = groups.filter((g) => g.title !== "Limit").flatMap((g) => g.foods.slice(0, 3).map(strip));
  const limit = groups.find((g) => g.title === "Limit")!.foods.map(strip);

  const nutrition: BodyCheck["nutrition"] = {
    targets: t,
    headline: tr("{kcal} kcal a day · {protein} g protein", { kcal: t.kcal.toLocaleString(), protein: t.protein }),
    eat,
    limit,
    points:
      goal === "lose"
        ? [
            tr("Fill half your plate with vegetables and a quarter with lean protein, and keep rice or noodles to a fist-sized portion."),
            tr("Swap sweet drinks for kosong / kurang manis; a teh tarik is about 185 kcal."),
            tr("Choose soup or grilled dishes over fried and santan-heavy ones at the hawker stall."),
          ]
        : goal === "gain"
          ? [
              tr("Eat 4–5 times a day; add an extra scoop of rice and a glass of milk to meals."),
              tr("Have 20–40 g protein at every meal, plus a shake after training if you're short."),
              tr("Calorie-dense healthy snacks help: nuts, peanut butter toast, bananas, dates."),
            ]
          : [
              tr("Build meals around protein and vegetables; adjust carbs to how active the day is."),
              tr("Follow the 80/20 rule: whole foods most of the time, your favourite hawker meals in moderation."),
              tr("Spread protein across the day, 3–4 meals with 25–40 g each."),
            ],
  };

  return {
    bmi: value,
    band,
    range,
    toHealthy,
    weeksToHealthy,
    goal,
    goalReason,
    training,
    nutrition,
    caveat: tr(
      "BMI doesn't separate muscle from fat. If you lift seriously, a high BMI may be muscle, so waist size and how you look and feel are better guides.",
    ),
  };
}
