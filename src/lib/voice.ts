import { SpeechRecognition } from "@capgo/capacitor-speech-recognition";
import { isNative } from "./platform";
import { searchFoods } from "./nutrition";
import type { Food, MealType } from "./types";

// "Dua roti canai dan teh tarik" → 2 × Roti canai, 1 × Teh tarik. Understands English, Malay and
// Chinese number words, grams ("200 g rice") and meal words; everything runs on the phone.

const NUMBERS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, half: 0.5, couple: 2,
  satu: 1, se: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, lapan: 8, sembilan: 9, sepuluh: 10, separuh: 0.5, setengah: 0.5, suku: 0.25,
};
const ZH_NUMBERS: Record<string, number> = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 半: 0.5 };
// Counting words that sit between the number and the food: "two plates of", "dua pinggan", "两碗".
const UNITS = /^(pieces?|pcs|plates?|bowls?|cups?|glass(es)?|slices?|servings?|portions?|cans?|packs?|of|a|an|the|biji|keping|pinggan|mangkuk|cawan|gelas|tin|bungkus|potong|ketul|batang|helai|cucuk)\b\s*/i;
const ZH_UNITS = /^[个碗杯份块片条只盘包罐根串粒颗]\s*/;
const FILLER =
  /\b(i|i've|i have|had|ate|eat|eaten|drank|drink|just|for|my|some|with|and then|then|also|saya|aku|makan|minum|sudah|dah|tadi|untuk|pagi|ini|hari ini|today)\b/gi;
const MEALS: [RegExp, MealType][] = [
  [/\b(breakfast|sarapan|morning)\b|早餐|早饭/i, "breakfast"],
  [/\b(lunch|tengah ?hari)\b|午餐|午饭/i, "lunch"],
  [/\b(dinner|supper|makan malam)\b|晚餐|晚饭/i, "dinner"],
  [/\b(snack|minum petang|tea ?time)\b|点心|零食/i, "snack"],
];

export interface Spoken {
  query: string;
  qty: number;
  grams?: number;
}

/** Split what was said into foods with amounts, and the meal if one was mentioned. */
export function parseSpoken(text: string): { meal?: MealType; items: Spoken[] } {
  let s = ` ${text.toLowerCase()} `;
  let meal: MealType | undefined;
  for (const [re, m] of MEALS) {
    if (re.test(s)) {
      meal ??= m;
      s = s.replace(re, " ");
    }
  }
  const parts = s
    .split(/,|;|\+|\n|、|，|\band\b|\bdan\b|\bdengan\b|\bserta\b|\bplus\b|和|跟|还有|以及|加/)
    .map((p) => p.replace(/[:.!?。！？：]/g, " ").replace(FILLER, " ").replace(/我|吃了|喝了|吃|喝|了/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const items: Spoken[] = [];
  for (let p of parts) {
    let qty = 1;
    let grams: number | undefined;
    const g = p.match(/(\d+(?:[.,]\d+)?)\s*(g|gram|grams|gm|克|ml|毫升)\b/);
    if (g) {
      grams = parseFloat(g[1].replace(",", "."));
      p = p.replace(g[0], " ");
    } else {
      const lead = p.match(/^(\d+(?:[.,]\d+)?|[a-z]+|[一两二三四五六七八九十半])\s*/);
      if (lead) {
        const word = lead[1];
        const n = /^\d/.test(word) ? parseFloat(word.replace(",", ".")) : (NUMBERS[word] ?? ZH_NUMBERS[word]);
        if (n !== undefined && n > 0 && n <= 20) {
          qty = n;
          p = p.slice(lead[0].length);
        }
      }
    }
    for (let i = 0; i < 4 && UNITS.test(p); i++) p = p.replace(UNITS, "");
    p = p.replace(ZH_UNITS, "").replace(/\s+/g, " ").trim();
    if (p.length >= 2) items.push({ query: p, qty, ...(grams ? { grams } : {}) });
  }
  return { meal, items };
}

// Everyday Chinese food words, so "两碗白饭和一杯咖啡" finds white rice and coffee.
const ZH_FOODS: [string, string][] = [
  ["白饭", "white rice"], ["米饭", "white rice"], ["炒饭", "fried rice"], ["椰浆饭", "nasi lemak"], ["鸡饭", "chicken rice"], ["粥", "congee"],
  ["炒面", "fried noodles"], ["面包", "white bread"], ["面", "noodles"], ["奶茶", "teh tarik"], ["拉茶", "teh tarik"], ["咖啡", "kopi"], ["茶", "tea"],
  ["牛奶", "full cream milk"], ["豆浆", "soy milk"], ["鸡蛋", "egg"], ["蛋", "egg"], ["鸡肉", "chicken"], ["鸡", "chicken"], ["牛肉", "beef"],
  ["鱼", "fish"], ["虾", "prawns"], ["豆腐", "tofu"], ["香蕉", "banana"], ["苹果", "apple"], ["橙", "orange"], ["榴莲", "durian"], ["青菜", "vegetables"],
  ["包子", "bao"], ["饺子", "dumplings"], ["美禄", "milo"], ["水", "water"],
];

function toSearch(query: string): string[] {
  if (/[\u4e00-\u9fff]/.test(query)) {
    for (const [zh, en] of ZH_FOODS) if (query.includes(zh)) return [en, query];
    return [query];
  }
  // "eggs" → "egg", "tomatoes" → "tomato" when the plural finds nothing better.
  const singular = query.replace(/(?<=\w{3})(es|s)$/, "");
  return singular !== query ? [singular, query] : [query];
}

/** The best food for each spoken item, with the grams to log. */
export function matchSpoken(items: Spoken[], foods: Food[]): { item: Spoken; food: Food | null; grams: number }[] {
  return items.map((item) => {
    let food: Food | null = null;
    for (const q of toSearch(item.query)) if ((food = searchFoods(foods, q, 1)[0] ?? null)) break;
    const grams = item.grams ?? Math.round((food?.servings[0]?.grams ?? 100) * item.qty);
    return { item, food, grams };
  });
}

type WebSpeech = { new (): { lang: string; interimResults: boolean; maxAlternatives: number; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onerror: (e: { error: string }) => void; onend: () => void; start: () => void; stop: () => void } };

const webSpeech = (): WebSpeech | undefined =>
  typeof window === "undefined" ? undefined : ((window as unknown as Record<string, WebSpeech | undefined>).SpeechRecognition ?? (window as unknown as Record<string, WebSpeech | undefined>).webkitSpeechRecognition);

/** Whether this phone can listen (otherwise the user types instead). */
export async function canListen(): Promise<boolean> {
  if (isNative) {
    try {
      return (await SpeechRecognition.available()).available;
    } catch {
      return false;
    }
  }
  return !!webSpeech();
}

const LANG = { en: "en-MY", ms: "ms-MY", zh: "zh-CN" } as const;

/** Listen once and return what was said (empty if nothing was understood). Uses the phone's own speech recognition. */
export async function listenOnce(language: keyof typeof LANG): Promise<string> {
  if (isNative) {
    const perm = await SpeechRecognition.requestPermissions();
    if (perm.speechRecognition !== "granted") throw new Error("permission");
    const onDevice = await SpeechRecognition.isOnDeviceRecognitionAvailable({ language: LANG[language] }).catch(() => ({ available: false }));
    const res = await SpeechRecognition.start({ language: LANG[language], maxResults: 1, partialResults: false, popup: false, useOnDeviceRecognition: onDevice.available });
    return res.matches?.[0] ?? "";
  }
  const Ctor = webSpeech();
  if (!Ctor) throw new Error("unavailable");
  return new Promise((resolve, reject) => {
    const r = new Ctor();
    r.lang = LANG[language];
    r.interimResults = false;
    r.maxAlternatives = 1;
    let text = "";
    r.onresult = (e) => (text = e.results[0]?.[0]?.transcript ?? "");
    r.onerror = (e) => reject(new Error(e.error));
    r.onend = () => resolve(text);
    r.start();
  });
}
