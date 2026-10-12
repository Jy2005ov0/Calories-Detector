// A picture for every food: a food emoji picked from the dish's name, or from its category.
// Emoji are drawn by the phone itself (Apple on iPhone, Noto on Android), so 21,000 foods get a
// colourful picture without any image files or internet. Only emoji up to Unicode 13 are used,
// so they show on Android 11 and iOS 14 and newer.

export type FoodTone = "main" | "plant" | "drink" | "sweet" | "grain" | "protein" | "dairy" | "other";

/** First match wins, so specific dishes come before their ingredients ("chicken rice" before "chicken"). */
const RULES: [RegExp, string, FoodTone][] = [
  // Names that would otherwise match the wrong word ("teh" in bak kut teh, "lapis" in kuih lapis)
  [/bak kut teh|sup tulang|sup kambing|sup ayam/, "🍲", "main"],
  [/kuih|kueh(?! chap)|nyonya/, "🍡", "sweet"],
  // Drinks
  [/bubble|boba|pearl milk tea|milk tea/, "🧋", "drink"],
  [/teh tarik|\bteh\b|\btea\b|chai|matcha latte|chrysanthemum/, "🍵", "drink"],
  [/kopi|coffee|latte|espresso|cappuccino|americano|mocha|macchiato|frappuccino/, "☕", "drink"],
  [/\bmilo\b|chocolate drink|hot chocolate|cocoa drink/, "☕", "drink"],
  [/\bbeer\b|lager|\bale\b|stout/, "🍺", "drink"],
  [/\bwine\b|champagne|prosecco|sangria/, "🍷", "drink"],
  [/cocktail(?!.*(fruit|prawn|shrimp|seafood))|whisky|whiskey|vodka|\bgin\b|\brum\b|brandy|liqueur|soju|\bsake\b(?!.*salmon)/, "🍸", "drink"],
  [/smoothie|milkshake|\bshake\b|lassi|frappe/, "🥤", "drink"],
  [/juice|lemonade|sirap|syrup drink|bandung|soda|\bcola\b|\bcoke\b|sprite|7up|100plus|isotonic|soft drink|energy drink|barley drink|sugarcane|kombucha/, "🧃", "drink"],
  [/coconut water|air kelapa/, "🥥", "drink"],
  [/soy ?milk|soya (bean )?(drink|milk)|almond milk|oat milk|\bmilk\b(?!.*(chocolate|rice pudding))|susu/, "🥛", "drink"],
  [/^water\b|mineral water|sparkling water/, "💧", "drink"],

  // Sweets and desserts
  [/ice cream|gelato|sorbet|soft serve|sundae|ais krim|aiskrim|popsicle/, "🍦", "sweet"],
  [/cendol|ais kacang|\babc\b|bingsu|shaved ice|halo-halo|shaved/, "🍧", "sweet"],
  [/cupcake|muffin/, "🧁", "sweet"],
  [/fish ?cake|fishball|fish ball|surimi|kamaboko|narutomaki|crab stick/, "🍥", "protein"],
  [/carrot cake|yam cake|radish cake|turnip cake|rice cake|potato cake|crab cake|chai tow kway|or kuih|senbei/, "🍘", "grain"],
  [/pancake|crepe|waffle|apam balik|hotteok/, "🥞", "sweet"],
  [/cheesecake|\bcake|\bkek\b|gateau|tiramisu|swiss roll|lapis/, "🍰", "sweet"],
  [/\bpie\b(?!.*(chicken|beef|meat|fish|pork|shepherd|cottage))|tart(?!are)|egg tart/, "🥧", "sweet"],
  [/doughnut|donut/, "🍩", "sweet"],
  [/cookie|biscuit|biskut|shortbread|macaron/, "🍪", "sweet"],
  [/chocolate|brownie|cocoa|nutella/, "🍫", "sweet"],
  [/pudding|custard|flan|creme brulee|panna cotta|bubur cha|tau fu fa|douhua/, "🍮", "sweet"],
  [/candy|sweets|gummy|lollipop|marshmallow/, "🍬", "sweet"],
  [/honey|madu/, "🍯", "sweet"],
  [/kuih|kueh(?! chap)|onde|seri muka|dodol|wajik|lepat|putu|bahulu|mochi|dango|daifuku|baklava|halwa|halva|gulab|jalebi|ladoo|laddu|barfi|kheer|payasam|mooncake|tong sui|dessert/, "🍡", "sweet"],

  // Whole dishes
  [/pizza/, "🍕", "main"],
  [/burger|ramly|whopper|big mac/, "🍔", "main"],
  [/hot ?dog|sausage roll/, "🌭", "main"],
  [/sandwich|banh mi|sub\b|panini|club\b|toastie|roti john/, "🥪", "main"],
  [/burrito|wrap|shawarma|kebab roll|doner|gyro|souvlaki pita|popiah(?! goreng)/, "🌯", "main"],
  [/taco|quesadilla|nachos|tostada|enchilada|fajita/, "🌮", "main"],
  [/sushi|sashimi|maki|nigiri|onigiri|temaki|california roll|\broll\b.*(salmon|tuna)|(salmon|tuna|spicy).*\broll\b/, "🍣", "main"],
  [/bento/, "🍱", "main"],
  [/dumpling|gyoza|wonton|wantan(?! mee)|siu mai|siew mai|har gow|mandu|momo|pierogi|ravioli|manti|xiao long|jiaozi|potsticker/, "🥟", "main"],
  [/\bpau\b|\bbao\b|bun\b(?!.*(bo lo|pineapple|hot cross))|mantou|char siu bao/, "🥟", "main"],
  [/fortune cookie/, "🥠", "sweet"],
  [/spaghetti|pasta|penne|fusilli|macaroni|mac and cheese|lasagn|carbonara|bolognese|linguine|fettuccine|tagliatelle|gnocchi|risotto/, "🍝", "main"],
  [/laksa|ramen|pho\b|udon|soba|mee|noodle|kway teow|kuey teow|kueh teow|hor fun|bihun|bee hoon|mee hoon|vermicelli|pan mee|lo mein|chow mein|\bmi\b|pad thai|japchae|ramyeon|jjajang|naengmyeon|kolo|kampua|maggi|yee mee|loh mee|lor mee/, "🍜", "main"],
  [/curry|kari|rendang|masala|korma|vindaloo|tikka|dhal|\bdal\b|biryani|briyani|kandar|gulai|kurma|butter chicken|rogan josh|massaman|tagine/, "🍛", "main"],
  [/nasi lemak|nasi kerabu|nasi dagang|nasi campur|economy rice|mixed rice|nasi kukus|nasi ayam|chicken rice|duck rice|char siu rice|roast pork rice|claypot rice|bibimbap|donburi|\bdon\b|gyudon|katsudon|oyakodon|poke bowl|rice bowl/, "🍱", "main"],
  [/fried rice|nasi goreng|pilaf|pulao|paella|jollof|nasi tomato|nasi minyak|nasi briyani|arroz/, "🍚", "main"],
  [/congee|porridge|bubur|\bjuk\b|\bcháo\b/, "🥣", "main"],
  [/salad|kerabu|ulam|rojak|gado|som tam|coleslaw|poke/, "🥗", "plant"],
  [/soup|\bsup\b|stew|broth|bak kut teh|tom yum|tom kha|soto|sinigang|chowder|bisque|pozole|goulash|borscht|minestrone|jjigae|hot ?pot|steamboat|chili con carne/, "🍲", "main"],
  [/satay|sate|skewer|yakitori|kebab|kabob|lok lok|souvlaki|shashlik|anticucho/, "🍢", "protein"],
  [/fries|chips(?! ahoy)|wedges|hash brown/, "🍟", "grain"],
  [/popcorn/, "🍿", "grain"],
  [/roti canai|roti telur|roti tisu|paratha|prata|chapati|naan|\bnan\b|tortilla|pita|flatbread|thosai|dosa|appam|murtabak|lavash|bhatura|puri\b/, "🫓", "grain"],
  [/omelet|telur dadar|fried egg|telur mata|sunny side|scrambled|shakshuka|frittata|tamagoyaki|egg roll/, "🍳", "protein"],
  [/fondue|raclette/, "🫕", "dairy"],

  // Ingredients
  [/prawn|shrimp|udang|lobster|crayfish|scampi|tempura/, "🍤", "protein"],
  [/crab|ketam/, "🦀", "protein"],
  [/squid|sotong|calamari|octopus|cuttlefish/, "🦑", "protein"],
  [/oyster|clam|mussel|scallop|cockle|kerang|lala|abalone/, "🦪", "protein"],
  [/salmon|tuna|fish|ikan|cod\b|mackerel|sardine|anchov|bilis|tilapia|snapper|siakap|bawal|kembung|haddock|trout|halibut|seabass|sea bass|pomfret|catfish|keli|eel|unagi|herring|seafood/, "🐟", "protein"],
  [/bacon|\bham\b|prosciutto|salami|pepperoni|pancetta|chorizo/, "🥓", "protein"],
  [/chicken|ayam|turkey|duck|itik|wing|drumstick|nugget|karaage|poultry|quail/, "🍗", "protein"],
  [/beef|daging|steak|lamb|mutton|kambing|goat|veal|pork|babi|venison|meatball|brisket|ribs|mince|ground meat|liver|bulgogi|galbi|char siu|siu yuk|lechon/, "🥩", "protein"],
  [/\beggs?\b|telur/, "🥚", "protein"],
  [/tofu|tauhu|tempeh|bean curd|beancurd|yuba|seitan/, "🍢", "protein"],
  [/cheese|keju|paneer|halloumi|feta|mozzarella|cheddar|parmesan|ricotta|brie/, "🧀", "dairy"],
  [/yogurt|yoghurt|kefir|labneh|curd\b|dadih|skyr/, "🥛", "dairy"],
  [/butter|ghee|margarine|cream\b/, "🧈", "dairy"],
  [/coconut|kelapa|santan/, "🥥", "plant"],
  [/peanut|kacang tanah|groundnut/, "🥜", "protein"],
  [/chestnut|almond|cashew|walnut|pistachio|hazelnut|pecan|macadamia|nuts?\b|seeds?\b|chia|flax|sesame|pumpkin seed|sunflower seed/, "🌰", "protein"],
  [/\bbeans?\b(?! ?sprout)|lentil|chickpea|kacang(?! panjang)|edamame|hummus|falafel|\bpeas?\b/, "🥜", "plant"],
  [/protein powder|whey|protein shake|mass gainer|casein/, "🥤", "drink"],
  [/creatine|supplement|vitamin|capsule|tablet|multivitamin|fish oil|collagen|omega/, "💊", "other"],
  [/protein bar|granola bar|cereal bar|energy bar/, "🍫", "grain"],
  [/\boats?\b|oatmeal|muesli|granola|cereal|cornflake|weetabix/, "🥣", "grain"],
  [/\brice\b|nasi|beras|ketupat|lontong|lemang|pulut|glutinous/, "🍚", "grain"],
  [/bread|roti|toast|bagel|baguette|croissant|brioche|bun|scone|crumpet|focaccia|ciabatta|sourdough|loaf/, "🍞", "grain"],
  [/cracker|keropok|crisps|pretzel|rice cake|senbei|kerepek/, "🍘", "grain"],

  // Fruit
  [/pineapple|nanas/, "🍍", "plant"],
  [/apple|epal/, "🍎", "plant"],
  [/banana|pisang|plantain/, "🍌", "plant"],
  [/mango|mangga|mangosteen|manggis/, "🥭", "plant"],
  [/watermelon|tembikai/, "🍉", "plant"],
  [/melon|rock melon|cantaloupe|honeydew|papaya|betik/, "🍈", "plant"],
  [/grape|anggur|raisin|kismis/, "🍇", "plant"],
  [/orange|oren|mandarin|tangerine|limau|clementine|grapefruit|pomelo|citrus/, "🍊", "plant"],
  [/lemon|lime\b|calamansi/, "🍋", "plant"],
  [/strawberr|raspberr|cranberr|goji/, "🍓", "plant"],
  [/blueberr|blackberr|acai|bilberr/, "🫐", "plant"],
  [/cherr|lychee|laici|longan|rambutan|dragon ?fruit|pitaya|ciku|sapodilla|durian|jackfruit|nangka|cempedak|guava|jambu|starfruit|belimbing|salak|persimmon|pomegranate|date|kurma|fig\b|passion ?fruit/, "🍒", "plant"],
  [/peach|apricot|nectarine|plum|prune/, "🍑", "plant"],
  [/pear\b|pears|nashi/, "🍐", "plant"],
  [/kiwi/, "🥝", "plant"],
  [/avocado/, "🥑", "plant"],
  [/olive/, "🫒", "plant"],

  // Vegetables
  [/broccoli|brokoli|kai ?lan|kailan|cauliflower/, "🥦", "plant"],
  [/carrot|lobak merah/, "🥕", "plant"],
  [/corn|jagung|maize|polenta/, "🌽", "plant"],
  [/sweet potato|ubi keledek|yam|keladi|taro|cassava|ubi kayu|tapioca/, "🍠", "plant"],
  [/potato|kentang/, "🥔", "plant"],
  [/tomato/, "🍅", "plant"],
  [/eggplant|brinjal|terung|aubergine/, "🍆", "plant"],
  [/cucumber|timun|zucchini|courgette|pickle/, "🥒", "plant"],
  [/bell pepper|capsicum|paprika/, "🫑", "plant"],
  [/chil+i|cili|jalape|pepper(?!oni)/, "🌶️", "plant"],
  [/mushroom|cendawan|shiitake|enoki|truffle/, "🍄", "plant"],
  [/garlic|bawang putih/, "🧄", "plant"],
  [/onion|bawang|shallot|leek|scallion|spring onion/, "🧅", "plant"],
  [/lettuce|spinach|bayam|kangkung|cabbage|kubis|kale|bok choy|pak choy|choy sum|sawi|greens|vegetable|sayur|veg\b|veggie|celery|herb|basil|mint|coriander|parsley|asparagus|okra|bendi|bean ?sprout|taugeh|bitter gourd|peria|seaweed|nori|pucuk|sprout/, "🥬", "plant"],
  [/ginger|halia|turmeric|kunyit|lemongrass|serai/, "🌿", "plant"],

  // Condiments and the rest
  [/\bsalt\b|garam|seasoning|stock cube|msg|pepper powder|spice/, "🧂", "other"],
  [/sauce|kicap|ketchup|mayo|dressing|dip\b|sambal|gravy|chutney|paste|belacan|jam\b|kaya|spread|vinegar|\boil\b|minyak\b/, "🥫", "other"],
  [/sugar|gula/, "🍬", "sweet"],
  [/canned|tin\b|tinned/, "🥫", "other"],
];

/** What a food's category looks like when its name says nothing more specific. */
const BY_CATEGORY: Record<string, [string, FoodTone]> = {
  Vegetables: ["🥬", "plant"],
  Fruits: ["🍎", "plant"],
  Drinks: ["🥤", "drink"],
  "Eggs & Dairy": ["🥛", "dairy"],
  Grains: ["🍚", "grain"],
  "Legumes & Nuts": ["🥜", "protein"],
  Meat: ["🥩", "protein"],
  Poultry: ["🍗", "protein"],
  Seafood: ["🐟", "protein"],
  Snacks: ["🍘", "grain"],
  Condiments: ["🥫", "other"],
  Supplements: ["💊", "other"],
  "Fast Food": ["🍔", "main"],
  Malaysian: ["🍛", "main"],
  Chinese: ["🥢", "main"],
  Japanese: ["🍱", "main"],
  Korean: ["🍲", "main"],
  "Thai & Vietnamese": ["🍜", "main"],
  Indian: ["🍛", "main"],
  Asian: ["🥢", "main"],
  Italian: ["🍝", "main"],
  Mexican: ["🌮", "main"],
  "Middle Eastern": ["🧆", "main"],
  European: ["🥘", "main"],
  American: ["🥘", "main"],
  "African & Caribbean": ["🍲", "main"],
};

const cache = new Map<string, { emoji: string; tone: FoodTone }>();

/** The picture for a food, from its name (and category as a fallback). */
export function foodIcon(name: string, category?: string): { emoji: string; tone: FoodTone } {
  const key = `${name}|${category ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const n = ` ${name.toLowerCase()} `;
  let out: { emoji: string; tone: FoodTone } = { emoji: "🍽️", tone: "other" };
  const rule = RULES.find(([re]) => re.test(n));
  if (rule) out = { emoji: rule[1], tone: rule[2] };
  else if (category && BY_CATEGORY[category]) out = { emoji: BY_CATEGORY[category][0], tone: BY_CATEGORY[category][1] };
  if (cache.size > 5000) cache.clear();
  cache.set(key, out);
  return out;
}

/** Every emoji the rules can return, for tests. */
export const ALL_FOOD_EMOJI = [...new Set([...RULES.map((r) => r[1]), ...Object.values(BY_CATEGORY).map((c) => c[0]), "🍽️"])];
