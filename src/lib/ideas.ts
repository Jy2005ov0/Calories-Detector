import { FOODS } from "../data/foods";
import { t } from "../i18n";
import { dislikesIn, foodConflicts } from "./allergens";
import { healthReport, scale, sum, type Targets } from "./nutrition";
import { addDays } from "./progress";
import type {
  Food,
  LogEntry,
  MealPrefs,
  MealType,
  Nutrients,
  Profile,
} from "./types";

/**
 * Daily meal ideas: real dishes from the food list, sized to what's left of the day's
 * calories and protein, without anything the person can't or won't eat, and nudged by
 * their preferences — cuisines, style, likes, swaps and what they actually log.
 * Everything runs on the phone.
 */

export const CUISINES: {
  value: string;
  label: string;
  categories: string[];
}[] = [
  { value: "malaysian", label: "Malaysian", categories: ["Malaysian"] },
  { value: "chinese", label: "Chinese", categories: ["Chinese"] },
  { value: "indian", label: "Indian", categories: ["Indian"] },
  { value: "japanese", label: "Japanese", categories: ["Japanese"] },
  { value: "korean", label: "Korean", categories: ["Korean"] },
  {
    value: "thai",
    label: "Thai & Vietnamese",
    categories: ["Thai & Vietnamese"],
  },
  { value: "asian", label: "Other Asian", categories: ["Asian"] },
  {
    value: "western",
    label: "Western",
    categories: ["European", "American", "Italian", "Fast Food"],
  },
  {
    value: "middleEastern",
    label: "Middle Eastern",
    categories: ["Middle Eastern"],
  },
  { value: "mexican", label: "Mexican", categories: ["Mexican"] },
  {
    value: "african",
    label: "African & Caribbean",
    categories: ["African & Caribbean"],
  },
];

export const IDEA_STYLES: {
  value: MealPrefs["style"];
  label: string;
  sub: string;
}[] = [
  { value: "balanced", label: "Balanced", sub: "A bit of everything" },
  {
    value: "highProtein",
    label: "High protein",
    sub: "More protein at every meal",
  },
  {
    value: "lowCarb",
    label: "Lower carb",
    sub: "Less rice, noodles and bread",
  },
  { value: "light", label: "Light", sub: "Smaller, lighter plates" },
  {
    value: "plant",
    label: "More plants",
    sub: "Beans, tofu and vegetables first",
  },
];

export const IDEA_VARIETY: { value: MealPrefs["variety"]; label: string }[] = [
  { value: "familiar", label: "My usual foods" },
  { value: "mix", label: "A mix" },
  { value: "new", label: "Something new" },
];

const CUISINE_OF = new Map(
  CUISINES.flatMap((c) => c.categories.map((cat) => [cat, c.value] as const)),
);
/** Plain foods (chicken breast, rice, fruit) that belong to every cuisine. */
const HOME = new Set([
  "Poultry",
  "Meat",
  "Seafood",
  "Grains",
  "Eggs & Dairy",
  "Legumes & Nuts",
  "Vegetables",
  "Fruits",
]);

// Things that aren't a meal: sweets, drinks, sauces, sides and deep-fried snacks.
const NOT_A_MEAL =
  /kuih|kueh(?! chap)|cake|dessert|pudding|cendol|ais kacang|\bice\b|ice cream|gelato|sorbet|bubur cha|cha cha|tau fu fa|syrup|sweet soup|tong sui|cookie|biscuit|brownie|chocolate|candy|jelly|\bpie\b(?!.*(chicken|beef|meat|fish))|tart|donut|doughnut|churro|baklava|halwa|halva|gulab|jalebi|kheer|payasam|ladoo|laddu|barfi|mochi|dango|daifuku|bingsu|hotteok|pastry|croissant|muffin|scone|crepe|waffle|pancake|cupcake|cheesecake|tiramisu|panna cotta|flan|custard|sauce|dip\b|dressing|gravy|chutney|pickle|achar|sambal (?!udang|sotong|ikan|telur|tempeh)|sambal$|paste|\bjam\b|kaya|butter$|seasoning|stock|broth$|\bdrink|juice|tea\b|coffee|kopi|teh |\bmilk\b(?!.*(fish|chicken))|shake|smoothie|lassi|soda|beer|wine|keropok|cracker|chips|crisps|fries|popcorn|curry puff|samosa|pakora|bhaji|spring roll|popiah goreng|pisang goreng|goreng pisang|onion rings|nuggets|vadai|vada|murukku|fritter|cucur|lekor|\bbun\b(?!.*(bao|burger))|bread$|^bread|toast$|plain|\braw\b|dried|powder|flour|\boil\b/i;

const BREAKFAST =
  /\boats?\b|porridge|congee|bubur(?! cha)|\bjuk\b|^eggs?\b|half-boiled|boiled eggs?|poached egg|scrambled|omelet|telur dadar|roti canai|roti telur|chapati|thosai|dosa|idli|appam|uttapam|upma|poha|paratha|toast|egg sandwich|egg salad sandwich|tuna sandwich|bagel|granola|muesli|cereal|yogurt|yoghurt|nasi lemak(?! ayam| paru)|lontong|nasi dagang|nasi kerabu|siu mai|siew mai|har gow|char siu bao|\bpau\b|chee cheong fun|wantan mee|pan mee|kaya|soy milk|smoothie bowl|acai|shakshuka|breakfast|ful medames|foul|onigiri|tamagoyaki|natto|youtiao|you tiao|kolo mee|kampua|bihun sup|beans on toast|baked beans|tofu scramble|overnight/i;
/** Heavy or odd first thing in the morning. */
const NOT_BREAKFAST =
  /lamb|mutton|baked|stew|mujadara|kosi|casserole|curry|kari|brisket|burger|steak|roast|crab|prawn|lobster|kandar|paru|rendang|briyani|biryani|pizza|lasagn|fried chicken|bbq|barbecue|pork belly|duck/i;

/** Vegetarian and vegan ideas come only from dishes whose name says they're plant-based (names don't always mention the meat). */
const VEG_DISH =
  /tofu|tempeh|dhal|\bdal\b|lentil|chickpea|chana|\bbeans?\b|edamame|vegetable|veggie|vegan|vegetarian|sayur|mushroom|paneer|aloo|gobi|palak|saag|falafel|hummus|ful medames|\boats?\b|muesli|granola|porridge|idli|dosa|thosai|upma|poha|chapati|paratha|roti canai|quinoa|buddha bowl|rajma|eggplant|brinjal|pumpkin|cauliflower|spinach|yogurt|yoghurt|soy milk|omelet|scrambled|boiled egg|^eggs?\b|half-boiled|cheese|margherita/i;
const MEATY =
  /chicken|beef|pork|lamb|mutton|goat|veal|fish|prawn|shrimp|crab|\bham\b|bacon|sausage|anchov|squid|calamari|meat|duck|turkey|tuna|salmon|sardine|mackerel|seafood|lobster|oyster|clam|mussel|keema|kheema|ikan|ayam|daging|udang|sotong|bilis|char siu|siu yuk|kambing|lembu|babi|brisket|steak|chorizo|pepperoni|salami|liver|gizzard|tripe|oxtail|bone|anchovy|belacan|fish sauce|dashi|bonito|katsuobushi|cuban|texas chili|chili con carne|pachamanca|lomo|carne|asado|cassoulet|salteña|empanada|haggis|kebab|kabob|satay|sate|shawarma|gyro|souvlaki|bulgogi|galbi|yakitori|tonkatsu|katsu|ramen|pho|laksa|rendang|nasi lemak|kandar|briyani|biryani|mee rebus|mee siam|soto|bak kut teh|lor|kway teow|hokkien|wantan|wonton|dumpling|siu mai|siew mai|har gow|bao|pau|kolo|kampua|pan mee|chee cheong fun/i;
const NOT_VEGAN =
  /roti canai|roti telur|paratha|egg|telur|omelet|cheese|paneer|yogurt|yoghurt|milk|butter|ghee|cream|honey|scrambled|half-boiled|margherita|quesadilla|labneh|feta/i;
/** Halal: names that often hide pork or alcohol. */
const NOT_HALAL =
  /\bham\b|bacon|lard|chorizo|prosciutto|pancetta|salami|pepperoni|carnitas|lechon|char siu|siu yuk|babi|tonkatsu|katsudon|chashu|cuban|cochinita|al pastor|sisig|adobo|jam[oó]n|wine|beer|\bsake\b|mirin|\brum\b|brandy|bourguignon|coq au vin|vodka|sherry|marsala|lap cheong|lup cheong|bak kwa|siew yoke|bak kut|zhu|loh bak|kway chap|kueh chap|kolo|kampua|choucroute|schnitzel|bratwurst|wurst|pozole|tamale|pupusa|feijoada|cachupa/i;

const SNACK_CATS = new Set([
  "Fruits",
  "Eggs & Dairy",
  "Legumes & Nuts",
  "Snacks",
]);
const NOT_SNACK =
  /cracker|rempeyek|flour|butter|raw|slivered|blanched|in shell|salted|full fat|coconut flesh|durian|avocado|dates|raisins|salad/i;
const SNACK_OK =
  /yogurt|yoghurt|cottage|cheese stick|string cheese|egg \(boiled|boiled egg|edamame|almond|cashew|walnut|pistachio|peanut(?! butter cookie)|mixed nuts|protein bar|hummus|chickpeas \(roasted|roasted chickpeas|kacang|soy milk|milk \(low|low fat milk|skim|fresh/i;
const SWEET_SNACK =
  /candied|syrup|in syrup|dried|sweetened|chocolate|honey|coated|caramel|glazed|jam/i;

const DESSERT_DRINK_CATS = new Set([
  "Drinks",
  "Condiments",
  "Supplements",
  "Snacks",
]);

const VEG_SIDES = [
  "Stir-fried mixed vegetables",
  "Broccoli",
  "Kailan (Chinese broccoli)",
  "Bok choy",
  "Spinach",
  "Kangkung (water spinach)",
  "Cucumber",
  "Carrot",
];
const BASES: Record<string, string[]> = {
  default: ["White rice (cooked)", "Brown rice (cooked)"],
  indian: ["Chapati", "Brown rice (cooked)", "White rice (cooked)"],
  western: ["Potato (boiled)", "Sweet potato (baked)", "Wholemeal bread"],
  middleEastern: ["Chapati", "Brown rice (cooked)"],
  mexican: ["Brown rice (cooked)", "Corn tortilla"],
  salad: ["Wholemeal bread"],
};
/** Most of a base anyone would have with one meal. */
const BASE_MAX: Record<string, number> = {
  "Wholemeal bread": 120,
  "Corn tortilla": 100,
  Chapati: 120,
  "White rice (cooked)": 300,
  "Brown rice (cooked)": 300,
};
const FRUITS = [
  "Apple",
  "Banana",
  "Papaya",
  "Guava",
  "Orange",
  "Watermelon",
  "Blueberries",
  "Pear",
];
const PROTEIN_TOPUPS: Record<"breakfast" | "meal", string[]> = {
  breakfast: [
    "Egg (boiled)",
    "Greek yogurt (plain, nonfat)",
    "Low fat milk",
    "Soy milk (unsweetened)",
  ],
  meal: ["Egg (boiled)", "Tofu (firm)"],
};

const byName = new Map(FOODS.map((f) => [f.name, f]));
const named = (names: string[]) =>
  names.map((n) => byName.get(n)).filter((f): f is Food => !!f);

/** A food's usual portion in grams (its first serving). */
const portion = (f: Food) => f.servings[0]?.grams ?? 100;
const per = (f: Food, g = portion(f)) => scale(f.per100, g);
const share = (n: Nutrients, macro: "protein" | "carbs" | "fat") =>
  (n[macro] * (macro === "fat" ? 9 : 4)) / Math.max(1, n.kcal);

type Kind = "dish" | "protein" | "breakfast" | "snack";
interface Candidate {
  food: Food;
  kind: Kind;
  cuisine: string | null;
}

let pools: Record<Kind, Candidate[]> | null = null;

/** Sort the food list into whole dishes, protein mains (to have with rice or bread), breakfasts and snacks. Built once. */
function candidatePools(): Record<Kind, Candidate[]> {
  if (pools) return pools;
  const out: Record<Kind, Candidate[]> = {
    dish: [],
    protein: [],
    breakfast: [],
    snack: [],
  };
  for (const f of FOODS) {
    if (f.source !== "db") continue;
    const n = per(f);
    const cuisine = CUISINE_OF.get(f.category) ?? null;
    const home = HOME.has(f.category);
    const sweetOrSnacky = NOT_A_MEAL.test(f.name);

    if (SNACK_CATS.has(f.category) && n.kcal >= 50 && n.kcal <= 320) {
      const fruit =
        f.category === "Fruits" &&
        !SWEET_SNACK.test(f.name) &&
        !NOT_SNACK.test(f.name) &&
        f.staple;
      const good =
        SNACK_OK.test(f.name) &&
        !SWEET_SNACK.test(f.name) &&
        !NOT_SNACK.test(f.name) &&
        healthReport(n).score >= 55;
      if (fruit || good)
        out.snack.push({ food: f, kind: "snack", cuisine: null });
    }
    if (DESSERT_DRINK_CATS.has(f.category) || f.category === "Fruits") continue;

    if (
      BREAKFAST.test(f.name) &&
      !NOT_BREAKFAST.test(f.name) &&
      !sweetOrSnacky &&
      n.kcal >= 140 &&
      n.kcal <= 750 &&
      (cuisine || home)
    ) {
      // Plain cooked eggs, tofu and oats count; raw ingredients and sweets don't.
      out.breakfast.push({ food: f, kind: "breakfast", cuisine });
    }
    if (sweetOrSnacky) continue;
    if (
      cuisine &&
      n.kcal >= 300 &&
      n.kcal <= 1100 &&
      n.protein >= 10 &&
      share(n, "carbs") >= 0.25
    ) {
      out.dish.push({ food: f, kind: "dish", cuisine });
    } else if (
      (cuisine || (home && f.staple)) &&
      n.kcal >= 120 &&
      n.kcal <= 650 &&
      n.protein >= 14 &&
      share(n, "protein") >= 0.25 &&
      share(n, "carbs") < 0.25
    ) {
      // Curries, grilled fish, tofu dishes: eaten with rice, bread or vegetables.
      out.protein.push({ food: f, kind: "protein", cuisine });
    }
  }
  pools = out;
  return out;
}

/** Slots and the share of the day's food each one usually takes. */
const SHARES: Record<MealType, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.1,
};
const RAMADAN_SHARES: Record<MealType, number> = {
  breakfast: 0.4,
  lunch: 0,
  dinner: 0.45,
  snack: 0.15,
};
/** Until when (minutes after midnight) a meal is still ahead. */
const UNTIL: Record<MealType, number> = {
  breakfast: 11 * 60,
  lunch: 15 * 60 + 30,
  dinner: 21 * 60 + 30,
  snack: 23 * 60 + 59,
};

export interface IdeaItem {
  food: Food;
  grams: number;
  nutrients: Nutrients;
}
export interface Idea {
  /** The main dish's name: what likes, swaps and "never" refer to. */
  key: string;
  meal: MealType;
  items: IdeaItem[];
  total: Nutrients;
  /** Calories this meal was sized for. */
  budget: number;
  reasons: string[];
}

export interface IdeaContext {
  profile: Pick<
    Profile,
    "diet" | "allergies" | "dislikes" | "goal" | "fasting"
  >;
  targets: Pick<Targets, "kcal" | "protein">;
  /** Everything logged, for what's been eaten today and what the person usually has. */
  log: Pick<LogEntry, "date" | "meal" | "name" | "nutrients">[];
  today: string;
  /** Calories burned today (workouts, steps) that count toward the budget. */
  burned?: number;
  prefs: MealPrefs;
  /** Minutes after midnight now. */
  minutes: number;
}

/** Meals still ahead today that have nothing logged, and how many calories and grams of protein each one gets. */
export function mealBudgets(
  ctx: IdeaContext,
  meals: MealType[],
): { meal: MealType; kcal: number; protein: number }[] {
  const todays = ctx.log.filter((e) => e.date === ctx.today);
  const eaten = sum(todays.map((e) => e.nutrients));
  const shares = ctx.profile.fasting === "ramadan" ? RAMADAN_SHARES : SHARES;
  const open = meals.filter(
    (m) => !todays.some((e) => e.meal === m) && shares[m] > 0,
  );
  // A meal whose time has passed is skipped, unless it's the only one left.
  const ahead = open.filter((m) => ctx.minutes <= UNTIL[m]);
  const list = ahead.length ? ahead : open.slice(-1);
  const weight = list.reduce((a, m) => a + shares[m], 0) || 1;
  const kcalLeft = Math.max(
    0,
    ctx.targets.kcal + (ctx.burned ?? 0) - eaten.kcal,
  );
  const proteinLeft = Math.max(0, ctx.targets.protein - eaten.protein);
  return list.map((m) => ({
    meal: m,
    kcal: (kcalLeft * shares[m]) / weight,
    protein: (proteinLeft * shares[m]) / weight,
  }));
}

const roundG = (g: number) =>
  g < 30 ? Math.max(5, Math.round(g)) : Math.round(g / 5) * 5;
const item = (food: Food, grams: number): IdeaItem => {
  const g = roundG(grams);
  return { food, grams: g, nutrients: scale(food.per100, g) };
};

/** Build a plate around one candidate, sized to the meal's calories. */
function buildPlate(
  c: Candidate,
  meal: MealType,
  budget: number,
  proteinGoal: number,
  ok: (f: Food) => boolean,
  prefs: MealPrefs,
  seed: number,
): IdeaItem[] {
  const pickFrom = (names: string[]) => {
    const list = named(names).filter(ok);
    return list.length ? list[seed % list.length] : undefined;
  };
  const style = prefs.style;
  const target = ideaTarget(meal, budget, prefs);

  if (c.kind === "snack") {
    const f = Math.min(
      2,
      Math.max(0.5, target / Math.max(1, per(c.food).kcal)),
    );
    // One bar, a glass of milk; nuts and fruit can stretch a little.
    const most = /milk|bar\b|egg/i.test(c.food.name) ? 1 : 1.5;
    return [item(c.food, portion(c.food) * Math.min(f, most))];
  }

  if (c.kind === "protein") {
    // Protein main + a base (rice, bread or potato; extra vegetables for lower carb) + vegetables.
    const main = item(
      c.food,
      portion(c.food) *
        Math.min(
          1.5,
          Math.max(
            0.75,
            (proteinGoal * 0.8) / Math.max(1, per(c.food).protein),
          ),
        ),
    );
    const salad = /salad|salat|ensalada|insalata/i.test(c.food.name);
    const veg = salad ? undefined : pickFrom(VEG_SIDES);
    const vegItem = veg
      ? item(veg, style === "lowCarb" ? 200 : 120)
      : undefined;
    const used = main.nutrients.kcal + (vegItem?.nutrients.kcal ?? 0);
    const baseNames =
      style === "lowCarb"
        ? []
        : salad
          ? BASES.salad
          : (BASES[c.cuisine ?? ""] ?? BASES.default);
    const base = pickFrom(baseNames);
    const items = [main];
    if (base && target - used > 60) {
      const grams = Math.min(
        BASE_MAX[base.name] ?? 350,
        Math.max(50, ((target - used) / Math.max(1, base.per100.kcal)) * 100),
      );
      items.push(item(base, grams));
    }
    if (vegItem) items.push(vegItem);
    return items;
  }

  // A whole dish (or a breakfast): sized within reason — nobody orders 0.6 of a plate.
  const n = per(c.food);
  const f = Math.min(1.3, Math.max(0.75, target / Math.max(1, n.kcal)));
  const items = [item(c.food, portion(c.food) * f)];
  let total = items[0].nutrients;
  // Short of protein: an egg, yogurt or a glass of milk on the side.
  const wantProtein = style === "highProtein" ? proteinGoal : proteinGoal * 0.6;
  if (total.protein < wantProtein && meal !== "snack") {
    const top = pickFrom(
      PROTEIN_TOPUPS[meal === "breakfast" ? "breakfast" : "meal"],
    );
    if (top) {
      const it = item(top, portion(top));
      if (total.kcal + it.nutrients.kcal <= target * 1.15) {
        items.push(it);
        total = sum([total, it.nutrients]);
      }
    }
  }
  // Room left and few vegetables: add some (or fruit at breakfast).
  if (target - total.kcal > 80 && total.fiber < 5) {
    const side = meal === "breakfast" ? pickFrom(FRUITS) : pickFrom(VEG_SIDES);
    if (side)
      items.push(
        item(
          side,
          meal === "breakfast"
            ? Math.min(
                portion(side),
                ((target - total.kcal) / Math.max(1, side.per100.kcal)) * 100,
              )
            : 120,
        ),
      );
  }
  return items;
}

/** Safe for this person: no allergens, nothing they avoid, and for vegetarians, vegans and halal, a stricter name check. */
export function fits(f: Food, profile: IdeaContext["profile"]): boolean {
  if (
    foodConflicts(f, profile).length ||
    dislikesIn(f.name, profile.dislikes).length
  )
    return false;
  const plain = HOME.has(f.category) || f.category === "Drinks";
  if (profile.diet === "vegetarian" || profile.diet === "vegan") {
    if (MEATY.test(f.name)) return false;
    if (!plain && !VEG_DISH.test(f.name)) return false;
    if (profile.diet === "vegan" && NOT_VEGAN.test(f.name)) return false;
  }
  if (profile.diet === "halal" && NOT_HALAL.test(f.name)) return false;
  return true;
}

/** Calories to aim for: a little less for "light", and snacks stay snack-sized even when lots is left. */
function ideaTarget(meal: MealType, budget: number, prefs: MealPrefs) {
  const t = budget * (prefs.style === "light" ? 0.85 : 1);
  return meal === "snack" ? Math.min(t, 300) : t;
}

/** Small deterministic random numbers, so the same day shows the same ideas until something changes. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** How often each dish was logged in the last 30 days, and when last (days ago). */
function history(log: IdeaContext["log"], today: string) {
  const from = addDays(today, -30);
  const out = new Map<string, { count: number; lastDays: number }>();
  for (const e of log) {
    if (e.date < from || e.date > today) continue;
    const days = Math.round(
      (Date.parse(today) - Date.parse(e.date)) / 86_400_000,
    );
    const h = out.get(e.name) ?? { count: 0, lastDays: 99 };
    out.set(e.name, {
      count: h.count + 1,
      lastDays: Math.min(h.lastDays, days),
    });
  }
  return out;
}

/** Share of the last 30 days' logged dishes from each cuisine. */
function cuisineTaste(log: IdeaContext["log"], today: string) {
  const from = addDays(today, -30);
  const counts = new Map<string, number>();
  let total = 0;
  for (const e of log) {
    if (e.date < from || e.date > today) continue;
    const f = byName.get(e.name);
    const c = f && CUISINE_OF.get(f.category);
    if (!c) continue;
    counts.set(c, (counts.get(c) ?? 0) + 1);
    total++;
  }
  return new Map([...counts].map(([c, n]) => [c, n / Math.max(1, total)]));
}

const PLANT =
  /tofu|tempeh|lentil|dhal|dal\b|chickpea|bean|edamame|vegetable|sayur|salad|mushroom|vegan|vegetarian|chana|rajma|paneer/i;

/**
 * Ideas for one meal, best first. `exclude` holds dishes already shown (after "Another idea").
 */
export function mealIdeas(
  ctx: IdeaContext,
  meal: MealType,
  budget: { kcal: number; protein: number },
  exclude: string[] = [],
  count = 1,
): Idea[] {
  const { profile, prefs } = ctx;
  const ok = (f: Food) => fits(f, profile);
  const p = candidatePools();
  const pool: Candidate[] =
    meal === "snack" || budget.kcal < 180
      ? p.snack
      : meal === "breakfast"
        ? p.breakfast
        : [...p.dish, ...p.protein];
  const chosen = new Set(prefs.cuisines);
  const seen = history(ctx.log, ctx.today);
  const skippedCount = new Map<string, number>();
  for (const n of prefs.skipped)
    skippedCount.set(n, (skippedCount.get(n) ?? 0) + 1);
  const hidden = new Set([...prefs.hidden, ...exclude]);
  const daySeed = hash(`${ctx.today}|${meal}`);
  const taste = cuisineTaste(ctx.log, ctx.today);

  const scored: { idea: Idea; score: number }[] = [];
  for (const c of pool) {
    const name = c.food.name;
    if (hidden.has(name) || !ok(c.food)) continue;
    // Only the cuisines picked (plain home foods always fit).
    if (chosen.size && c.cuisine && !chosen.has(c.cuisine)) continue;
    if (
      prefs.style === "plant" &&
      c.kind !== "snack" &&
      (!PLANT.test(name) || MEATY.test(name))
    )
      continue;

    const seed = hash(name) ^ daySeed;
    const items = buildPlate(
      c,
      meal,
      budget.kcal,
      budget.protein,
      ok,
      prefs,
      seed,
    );
    const total = sum(items.map((i) => i.nutrients));
    const target = ideaTarget(meal, budget.kcal, prefs);

    let score = 0;
    const reasons: string[] = [];
    // Fit: close to the meal's calories; for gaining, being under is worse than over.
    const miss = (total.kcal - target) / Math.max(150, target);
    score -= Math.abs(miss) * (profile.goal === "gain" && miss < 0 ? 70 : 45);
    // Protein towards the day's goal.
    const proteinFit = Math.min(
      1.2,
      total.protein / Math.max(5, budget.protein),
    );
    score += proteinFit * (prefs.style === "highProtein" ? 34 : 20);
    // Nutrient quality matters more when losing weight.
    const health = healthReport(total).score;
    score +=
      health *
      (profile.goal === "lose" || prefs.style === "light" ? 0.45 : 0.3);
    if (prefs.style === "lowCarb")
      score -= Math.max(0, share(total, "carbs") - 0.35) * 80;
    if (prefs.style === "plant" && PLANT.test(name)) score += 10;
    if (chosen.size) score += c.cuisine ? 8 : -6;
    // Everyday local staples first; then the cuisines this person actually logs.
    else if (c.food.staple) score += 8;
    if (c.cuisine) score += Math.min(12, (taste.get(c.cuisine) ?? 0) * 24);

    // Learned from the person.
    const liked = prefs.liked.includes(name);
    if (liked) score += 22;
    const h = seen.get(name);
    if (h) {
      if (h.lastDays <= 1) score -= prefs.variety === "familiar" ? 4 : 18; // had it today or yesterday
      if (prefs.variety === "familiar") score += Math.min(24, h.count * 6);
      else if (prefs.variety === "mix") score += Math.min(10, h.count * 3);
      else score -= 8;
    } else if (prefs.variety === "new") score += 6;
    score -= Math.min(30, (skippedCount.get(name) ?? 0) * 10);
    // A little day-to-day variety among equally good options.
    score += ((seed % 1000) / 1000) * 8;

    if (liked) reasons.push(t("You liked this before"));
    else if (h && h.count >= 2 && prefs.variety !== "new")
      reasons.push(t("You often have this"));
    else if (!h && prefs.variety === "new")
      reasons.push(t("Something new to try"));
    if (total.protein >= Math.max(20, budget.protein * 0.9))
      reasons.push(
        t("{g} g protein towards your {goal} g goal", {
          g: Math.round(total.protein),
          goal: ctx.targets.protein,
        }),
      );
    else if (health >= 70) reasons.push(t("A nutritious choice"));
    if (Math.abs(miss) < 0.15)
      reasons.push(
        t("Fits the {kcal} kcal you have for this meal", {
          kcal: Math.round(target),
        }),
      );

    scored.push({
      idea: {
        key: name,
        meal,
        items,
        total,
        budget: Math.round(target),
        reasons: reasons.slice(0, 2),
      },
      score,
    });
  }
  scored.sort((a, b) => b.score - a.score);
  // Different main dishes only (two curries with rice look alike).
  const out: Idea[] = [];
  for (const s of scored) {
    if (out.some((o) => o.key === s.idea.key)) continue;
    out.push(s.idea);
    if (out.length >= count) break;
  }
  return out;
}

/** Plain-language summary of the preferences in force, for the card's subtitle. */
export function prefsSummary(prefs: MealPrefs): string {
  const parts: string[] = [];
  const style = IDEA_STYLES.find((s) => s.value === prefs.style);
  if (style && prefs.style !== "balanced") parts.push(t(style.label));
  if (prefs.cuisines.length)
    parts.push(
      prefs.cuisines
        .map((c) => CUISINES.find((x) => x.value === c)?.label)
        .filter((x): x is string => !!x)
        .map((l) => t(l))
        .join(", "),
    );
  if (prefs.variety !== "mix")
    parts.push(t(IDEA_VARIETY.find((v) => v.value === prefs.variety)!.label));
  return parts.join(" · ");
}

/** For tests. */
export const _pools = () => candidatePools();
