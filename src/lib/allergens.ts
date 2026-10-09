import { FOOD_BY_NAME } from "../data/foods";
import { t } from "../i18n";
import type { Allergen, Food, Profile } from "./types";

/**
 * What a food contains, inferred from its name and (for mixed dishes) its parts.
 * Based on how the dish is usually made — recipes vary, so the app always says "usually contains".
 */
/** "seafood" = fish or shellfish you can see on the plate; the fish/shellfish allergen tags also
 *  catch trace sources such as belacan in sambal, fish sauce and oyster sauce. */
export type Tag = Allergen | "pork" | "alcohol" | "meat" | "honey" | "seafood";

const RULES: Record<Tag, { include: RegExp; exclude?: RegExp }> = {
  pork: {
    include:
      /\bpork|bacon|\bham\b|char siu|prosciutto|pepperoni|bak kut teh|chashu|samgyeopsal|siu mai|xiaolongbao|jiaozi|\blard|bratwurst|banh mi|vindaloo|tamales|al pastor|gyro|croque monsieur|quiche lorraine|bangers|hot dog|club sandwich|\bblt\b|carbonara|sinigang|hawaiian pizza|ribs|feijoada|lumpia|katsudon|hokkien mee|wantan mee|lo mee|siu yuk|pork buns/i,
    // Beef and lamb ribs, and chicken versions of usually-pork dishes.
    exclude: /(beef|lamb|mutton) (short )?ribs|galbi|asado|chicken bak kut teh|banh mi \((chicken|tofu|beef)/i,
  },
  alcohol: { include: /\bbeer\b|\bwine\b|bourguignon|\bsake\b|soju|whisk(e)?y|vodka|\brum\b|cocktail/i },
  meat: {
    include:
      /chicken|beef|pork|lamb|mutton|duck|turkey|bacon|\bham\b|sausage|meat|rendang|kambing|ayam|daging|venison|jerky|pepperoni|prosciutto|kebab|kofta|shawarma|gyro|satay|suya|bulgogi|steak|patty|burger|char siu|bak kut teh|liver|doner|souvlaki|yakitori|chicken rice|nasi kandar|nasi campur|nasi padang|mansaf|kabsa|bobotie|bunny chow|chili con carne|goulash|lasagna|bolognese|moussaka|shepherd|cornish pasty|empanada|tacos|burrito|enchilada|fajitas|quesadilla|philly|cheesesteak|schnitzel|meatball|bratwurst|bangers|hot dog|katsu|oyakodon|gyudon|tamales|feijoada|nuggets|wings|ramly|murtabak|roti john|siu mai|xiaolongbao|dumplings|jiaozi|wonton|wantan|gyoza|pho\b|bun cha|banh mi|larb|adobo|sinigang|bakso|tom kha gai|green curry|red curry|massaman|pad kra pao|kung pao|general tso|orange chicken|sesame chicken|mongolian|dakgalbi|galbi|samgyeopsal|lo mai kai|claypot|soto|congee with|dan dan|bao\b|mapo tofu|hainanese|biryani|briyani|korma|tikka|tandoori|vindaloo|rogan josh|chicken 65|doro wat|jollof|couscous royale|tagine|jerk|club sandwich|blt|cobb|caesar wrap|full english|steamboat|yong tau foo|ramen|tonkotsu/i,
    exclude: /veggie burger|vegetable biryani|plant protein|mushroom soup|paneer|lai wong bao|dou sha bao|custard bun|red bean bun/i,
  },
  fish: {
    exclude: /coconut rice/i,
    include:
      /fish|salmon|tuna|mackerel|\bikan\b|anchov|sardine|\bcod\b|trout|sashimi|sushi|nigiri|keropok lekor|asam laksa|caesar|ceviche|nasi kerabu|nasi dagang|laksam|onigiri|poke bowl|kimbap|som tam|larb|pad thai|otak|gulai ikan|smoked salmon|sambal ikan bilis|nasi lemak|bonito|tom yum|yong tau foo|fish ball|fish cake/i,
  },
  shellfish: {
    include:
      /prawn|shrimp|crab|lobster|mussel|oyster|scallop|squid|calamari|sotong|\bclam|udang|har gow|belacan|sambal|keropok(?! lekor)|tom yum|paella|seafood|takoyaki|hokkien mee|char kway teow|laksa|prawn mee|tempura|pad thai|nasi goreng|kangkung belacan|mee siam|popiah|rojak/i,
    exclude: /sambal ikan bilis$/i,
  },
  peanuts: {
    exclude: /coconut rice/i,
    include: /peanut|satay|kacang tanah|gado-gado|rojak|kung pao|pad thai|apam balik|nasi lemak|trail mix|mixed nuts|massaman|ais kacang|mee siam/i,
  },
  treeNuts: {
    include: /almond|cashew|walnut|pistachio|hazelnut|pecan|mixed nuts|trail mix|nutella|baklava|pesto|kunafa|macaron\b|korma|butter chicken|granola|muesli|praline/i,
  },
  dairy: {
    include:
      /milk|cheese|yogurt|yoghurt|butter|cream|ghee|paneer|latte|cappuccino|macchiato|frappuccino|\bmilo\b|kopi c|kopi \(with|teh tarik|condensed|evaporated|kefir|skyr|halloumi|feta|parmesan|brie|mozzarella|cheddar|raita|tzatziki|lassi|chai|carbonara|alfredo|lasagna|pizza|quesadilla|nachos|tiramisu|panna cotta|gelato|whey|casein|mass gainer|croissant|pain au chocolat|scone|makhani|naan|gulab jamun|kunafa|moussaka|spanakopita|quiche|croque|french toast|pancake|waffle|muffin|cake|brownie|doughnut|cookie|egg tart|kaya toast|mashed potato|chowder|crêpe|pão de queijo|arepa|thai iced tea|vietnamese iced coffee|bubble milk tea|matcha latte|cendol|ais kacang|apam balik|cobb|greek salad|philly|grilled cheese|air bandung|sirap bandung|korma|tikka masala|caesar|chocolate|pastry|risotto|bechamel|mac and/i,
    exclude: /soy milk|oat milk|almond milk|coconut milk|peanut butter|butternut|kopi o|teh o|dark chocolate|kosong|cocoa butter|rice cakes|fish cake|carrot cake|kuih/i,
  },
  egg: {
    include:
      /\begg(?!plant)|omelette|telur|mayo|scrambled|quiche|carbonara|custard|pancake|waffle|cake|muffin|brownie|cookie|egg tart|kaya|french toast|meringue|macaron\b|tiramisu|murtabak|oyakodon|okonomiyaki|bibimbap|shakshuka|kuih bahulu|kek lapis|apam balik|caesar|egg noodles|wantan mee|full english|ramly|roti john|katsu|tempura|schnitzel|lai wong bao|nasi goreng|fried rice|char kway teow|mee goreng|maggi goreng|mie goreng|pad thai|carrot cake|ramen|brioche|pastry|churros|soufflé|aioli|tartar|kimbap|gado-gado|lontong|mee rebus|nasi lemak/i,
    exclude: /rice cakes|fish cake|coconut rice/i,
  },
  gluten: {
    include:
      /bread|toast|\bbun\b|bagel|croissant|wrap|pasta|spaghetti|penne|fettuccine|noodle|\bmee\b|\bmie\b|udon|ramen|ramyeon|couscous|chapati|naan|roti|paratha|pancake|waffle|cracker|cake|muffin|cookie|doughnut|brownie|\bpie\b|pizza|burger|sandwich|pretzel|seitan|barley|bulgur|\brye\b|baguette|granola|muesli|soy sauce|teriyaki|oyster sauce|hoisin|gyoza|dumpling|jiaozi|wonton|wantan|xiaolongbao|siu mai|\bbao\b|samosa|curry puff|spring roll|popiah|murtabak|tempura|katsu|schnitzel|nuggets|breaded|fried chicken|fish and chips|fish fingers|calamari|lasagna|ravioli|gnocchi|focaccia|bruschetta|croque|quiche|crêpe|pain au chocolat|churros|empanada|pierogi|pasty|scone|baklava|kunafa|spanakopita|pita|kebab|gyro|shawarma \(|falafel wrap|banh mi|philly|club sandwich|\bblt\b|hot dog|bunny chow|egg tart|mooncake|\bbeer\b|chow mein|lo mein|dan dan|okonomiyaki|takoyaki|maggi|gochujang|tteokbokki|sweet soy|kicap|tortilla wrap|quesadilla|enchilada|fajitas|burrito \(|tacos|biscuit|pastry|lontong|pakora|pav bhaji|pani puri|gulab jamun|pancit|lumpia|japchae|oats|overnight oats|oatmeal|macaroni|mac and|cornish|french toast|eclair|\btarts?\b/i,
    exclude: /rice cakes|corn tortilla|mee hoon|bihun|rice noodles|tortilla chips|gluten-free|pancit bihon|glass noodles|rice vermicelli|fish cake|carrot cake|kuih/i,
  },
  soy: {
    include: /\bsoy|tofu|tempeh|edamame|tauhu|tau fu fa|miso|bean curd|teriyaki|hoisin|natto|soya|yong tau foo|mapo|veggie burger|plant protein|kicap|oyster sauce|sundubu|gyoza|chow mein|lo mein|fried rice|nasi goreng|char kway teow|mee goreng|bulgogi|japchae|kimbap|claypot|sushi|onigiri|poke|steamed fish with ginger|chinese bbq|char siu|peking duck|general tso|orange chicken|sesame chicken|mongolian|beef and broccoli|kung pao|dan dan|twice-cooked|gado-gado|adobo/i,
  },
  sesame: { include: /sesame|tahini|hummus|baba ganoush|halva|bibimbap|dan dan|japchae|kimbap|bagel|sushi roll|gomasio/i },
  honey: { include: /honey|baklava/i, exclude: /honeydew/i },
  seafood: {
    include:
      /fish(?! sauce)|salmon|tuna|mackerel|\bikan\b|anchov|sardine|\bcod\b|trout|sashimi|sushi|nigiri|prawn|shrimp|crab|lobster|mussel|oyster(?! sauce)|scallop|squid|calamari|sotong|\bclam|udang|seafood|takoyaki|keropok lekor|ceviche|poke bowl|unagi|eel|octopus|caviar|roe/i,
    exclude: /coconut rice|fish sauce|oyster sauce/i,
  },
};

const TAGS = Object.keys(RULES) as Tag[];

/** Foods someone just doesn't eat (not allergies): matched on the dish name only, so a few slices of
 *  cucumber in nasi lemak don't rule it out, but "Stir-fried kangkung" does. */
export type Dislike = "vegetables" | "beef" | "chicken" | "pork" | "lamb" | "seafood" | "mushrooms" | "spicy";

const DISLIKE_RULES: Record<Exclude<Dislike, "pork" | "seafood">, { include: RegExp; exclude?: RegExp }> = {
  vegetables: {
    include:
      /vegetable|\bveg(e|gie)?s?\b|sayur|salad|broccoli|spinach|bayam|kangkung|cabbage|kubis|lettuce|kale|bok choy|pak choy|choy sum|kai ?lan|carrot|eggplant|brinjal|terung|okra|bendi|bean ?sprouts|taugeh|tauge|cucumber|timun|tomato|capsicum|bell pepper|green beans|long beans|kacang panjang|french beans|asparagus|cauliflower|zucchini|courgette|pumpkin|labu|celery|\bpeas\b|ulam|pegaga|petai|bitter gourd|peria|gado-gado|rojak|ratatouille|coleslaw|kimchi|leek|beetroot|radish|lobak|sweet potato leaves|pucuk|cendawan|mushroom|onion|corn on the cob|edamame|seaweed|nori|ladyfinger/i,
    exclude: /carrot cake|vegetable oil|tomato sauce|ketchup|onion rings|veggie burger|plant protein|seaweed snack|tomato juice|carrot juice|beetroot juice|abc juice|pumpkin seeds|sweet potato(?! leaves)/i,
  },
  beef: { include: /\bbeef|daging|steak|bulgogi|gyudon|galbi|brisket|wagyu|pho bo|bolognese|cheeseburger|hamburger|corned|pastrami|bak kwa|meatball|chili con carne|philly|cheesesteak|beef rendang|sup tulang|oxtail/i, exclude: /chicken (steak|meatball)|pork meatball|chicken bak kwa/i },
  chicken: { include: /chicken|\bayam\b|nuggets|wings|yakitori|oyakodon|karaage|tandoori|tikka|hainanese|dakgalbi|kfc|popcorn chicken|lo mai kai|chicken rice|turkey/i },
  lamb: { include: /\blamb|mutton|kambing|rogan josh|mansaf|souvlaki \(lamb/i },
  mushrooms: { include: /mushroom|shiitake|enoki|cendawan|truffle|portobello|oyster mushroom|king oyster/i },
  spicy: {
    include:
      /sambal|chil(l)?i|cili|spicy|pedas|curry|\bkari\b|tom yum|rendang|vindaloo|kimchi|tteokbokki|gochujang|\bmala\b|jalape|buffalo|laksa|pad kra pao|kung pao|mapo|sriracha|\bjerk\b|harissa|asam pedas|masak merah|phaal|nasi lemak|mee siam|mee rebus|som tam|larb|buldak|ramyeon|maggi kari|szechuan|sichuan/i,
    exclude: /sweet chilli sauce|chili-free|mild/i,
  },
};

export const DISLIKES: { value: Dislike; label: string }[] = [
  { value: "vegetables", label: "Vegetables" },
  { value: "beef", label: "Beef" },
  { value: "chicken", label: "Chicken" },
  { value: "pork", label: "Pork" },
  { value: "lamb", label: "Lamb & mutton" },
  { value: "seafood", label: "Seafood" },
  { value: "mushrooms", label: "Mushrooms" },
  { value: "spicy", label: "Spicy food" },
];

const DISLIKE_VALUES = new Set<string>(DISLIKES.map((d) => d.value));

/** Everyday ways people say a food group, in the three languages, so "vege" or "sayur" becomes the Vegetables chip. */
const DISLIKE_WORDS: Record<string, Dislike> = {
  vege: "vegetables", veg: "vegetables", veges: "vegetables", veggie: "vegetables", veggies: "vegetables", vegetable: "vegetables", vegetables: "vegetables", greens: "vegetables", sayur: "vegetables", "sayur-sayuran": "vegetables", sayuran: "vegetables", 蔬菜: "vegetables", 青菜: "vegetables", 菜: "vegetables",
  beef: "beef", "daging lembu": "beef", lembu: "beef", 牛肉: "beef", 牛: "beef",
  chicken: "chicken", ayam: "chicken", 鸡肉: "chicken", 鸡: "chicken",
  pork: "pork", babi: "pork", 猪肉: "pork", 猪: "pork",
  lamb: "lamb", mutton: "lamb", kambing: "lamb", 羊肉: "lamb", 羊: "lamb",
  seafood: "seafood", fish: "seafood", "makanan laut": "seafood", 海鲜: "seafood",
  mushroom: "mushrooms", mushrooms: "mushrooms", cendawan: "mushrooms", 蘑菇: "mushrooms", 菇: "mushrooms",
  spicy: "spicy", pedas: "spicy", chilli: "spicy", chili: "spicy", 辣: "spicy", 辣的: "spicy",
};

/**
 * Turn what someone typed ("I don't eat vege", "tak makan sayur", "不吃蔬菜", "durian")
 * into a food group or a plain word to avoid. Empty when nothing is left.
 */
export function parseDislike(text: string): string {
  const cleaned = text
    .trim()
    .toLowerCase()
    .replace(/^(i\s+)?(don'?t|do not|dont|never|can'?t|cannot|won'?t)\s+(eat|like|have)(\s+any)?(\s+|$)/, "")
    .replace(/^(no|without|avoid)\s+/, "")
    .replace(/^(saya\s+)?(tak|tidak|x)\s+(makan|suka)(\s+|$)/, "")
    .replace(/^(我)?(不吃|不喝|不要|不爱吃|不喜欢吃?)/, "")
    .replace(/[.!。！]+$/, "")
    .trim();
  return DISLIKE_WORDS[cleaned] ?? cleaned;
}

export function dislikeLabel(d: string) {
  const preset = DISLIKES.find((x) => x.value === d);
  return preset ? t(preset.label) : d;
}

function dislikeHit(d: string, name: string): boolean {
  if (d === "pork") return tagsOfText(name).has("pork");
  if (d === "seafood") return tagsOfText(name).has("seafood");
  const rule = DISLIKE_RULES[d as keyof typeof DISLIKE_RULES];
  if (rule) return rule.include.test(name) && !(rule.exclude && rule.exclude.test(name));
  // A word the person typed, e.g. "durian" or "bitter gourd".
  return d.length > 1 && name.toLowerCase().includes(d.toLowerCase());
}

/** The foods this person doesn't eat that are in this dish (by name). */
export function dislikesIn(name: string, dislikes: readonly string[] = []): string[] {
  return dislikes.filter((d) => dislikeHit(d, name));
}

export const isPresetDislike = (d: string) => DISLIKE_VALUES.has(d);

function tagsOfText(text: string): Set<Tag> {
  const out = new Set<Tag>();
  for (const t of TAGS) {
    const r = RULES[t];
    if (r.include.test(text) && !(r.exclude && r.exclude.test(text))) out.add(t);
  }
  return out;
}

const cache = new Map<string, Set<Tag>>();

/** Everything a food usually contains. Dishes also inherit what their parts contain. */
export function foodTags(f: Pick<Food, "id" | "name" | "aliases" | "recipe">): Set<Tag> {
  const hit = cache.get(f.id);
  if (hit) return hit;
  // Names only: aliases are search words (e.g. "wantan mee" on plain egg noodles) and would mislead.
  const tags = tagsOfText(f.name);
  for (const part of f.recipe ?? []) {
    if (part.qty === 0) continue; // optional extras, not in the dish by default
    const pf = part.food === f.name ? undefined : FOOD_BY_NAME.get(part.food);
    if (pf) for (const t of foodTags(pf)) tags.add(t);
  }
  // Pork is meat; meat dishes aren't vegetarian.
  if (tags.has("pork")) tags.add("meat");
  cache.set(f.id, tags);
  return tags;
}

export function nameTags(name: string): Set<Tag> {
  return tagsOfText(name);
}

export const ALLERGENS: { value: Allergen; label: string }[] = [
  { value: "peanuts", label: "Peanuts" },
  { value: "treeNuts", label: "Tree nuts" },
  { value: "shellfish", label: "Shellfish" },
  { value: "fish", label: "Fish" },
  { value: "dairy", label: "Milk" },
  { value: "egg", label: "Egg" },
  { value: "gluten", label: "Gluten" },
  { value: "soy", label: "Soy" },
  { value: "sesame", label: "Sesame" },
];

const ALLERGEN_LABEL = Object.fromEntries(ALLERGENS.map((a) => [a.value, a.label])) as Record<Allergen, string>;

export interface Conflict {
  kind: "allergy" | "halal" | "diet";
  text: string;
}

/** Why this food doesn't fit the person's allergies, halal or vegetarian/vegan diet. Empty = fine. */
export function conflicts(tags: Set<Tag>, p: Pick<Profile, "allergies" | "diet">): Conflict[] {
  const out: Conflict[] = [];
  for (const a of p.allergies ?? []) if (tags.has(a)) out.push({ kind: "allergy", text: t("Usually contains {allergen}", { allergen: t(ALLERGEN_LABEL[a]).toLowerCase() }) });
  if (p.diet === "halal") {
    if (tags.has("pork")) out.push({ kind: "halal", text: t("Not halal · contains pork") });
    if (tags.has("alcohol")) out.push({ kind: "halal", text: t("Not halal · contains alcohol") });
  }
  // Vegetarian and vegan rule out meat and seafood you can see; trace sources (belacan in
  // sambal, fish sauce) are flagged for allergies only, so tempeh sambal isn't hidden.
  if ((p.diet === "vegetarian" || p.diet === "vegan") && (tags.has("meat") || tags.has("seafood"))) {
    out.push({ kind: "diet", text: t("Not {diet} · contains meat or seafood", { diet: t(p.diet === "vegan" ? "vegan" : "vegetarian") }) });
  }
  if (p.diet === "vegan" && (tags.has("dairy") || tags.has("egg") || tags.has("honey"))) {
    out.push({ kind: "diet", text: t("Not vegan · contains milk, egg or honey") });
  }
  return out;
}

export function foodConflicts(f: Pick<Food, "id" | "name" | "aliases" | "recipe">, p: Pick<Profile, "allergies" | "diet">) {
  return conflicts(foodTags(f), p);
}

/** True when the person has anything to filter on. */
export function hasRestrictions(p: Pick<Profile, "allergies" | "diet">) {
  return (p.allergies?.length ?? 0) > 0 || p.diet !== "anything";
}

/** A food that clashes with someone's allergies or diet is never "a great choice", whatever its numbers. */
export function withConflicts<S extends { verdict: string; headline: string; reasons: string[] }>(s: S, found: Conflict[]): S {
  if (!found.length) return s;
  return { ...s, verdict: "avoid", headline: t("Not suitable for you"), reasons: [...found.map((c) => c.text), ...s.reasons] };
}
