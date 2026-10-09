import { apiConfigured, apiUrl } from "./platform";
import { t } from "../i18n";
import { getState } from "./store";
import { authHeaders } from "./account";
import type { Food, MealType, Profile } from "./types";

// ── Open Food Facts (free, no key, millions of packaged products) ──

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_quantity?: number | string;
  serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
}

const num = (v: unknown) => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : 0;
};

export async function searchOnline(query: string, signal?: AbortSignal): Promise<Food[]> {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "30");
  url.searchParams.set("fields", "code,product_name,brands,serving_quantity,serving_size,nutriments");
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(t("Search failed ({status})", { status: res.status }));
  const data = (await res.json()) as { products?: OffProduct[] };
  return (data.products ?? []).filter(hasNutrition).map(offToFood);
}

const hasNutrition = (p: OffProduct) => !!p.product_name && !!p.nutriments && p.nutriments["energy-kcal_100g"] !== undefined;

function offToFood(p: OffProduct): Food {
  const n = p.nutriments!;
  const servingG = num(p.serving_quantity);
  return {
    id: `off-${p.code}`,
    name: p.product_name!.trim(),
    brand: p.brands?.split(",")[0]?.trim(),
    category: "Packaged",
    per100: {
      kcal: num(n["energy-kcal_100g"]),
      protein: num(n.proteins_100g),
      carbs: num(n.carbohydrates_100g),
      fat: num(n.fat_100g),
      fiber: num(n.fiber_100g),
      sugar: num(n.sugars_100g),
      satFat: num(n["saturated-fat_100g"]),
      sodium: num(n.sodium_100g) * 1000,
    },
    servings: servingG > 0 ? [{ label: p.serving_size || "1 serving", grams: servingG }] : [{ label: "100 g", grams: 100 }],
    source: "online",
  };
}

/** Look up a packaged product by its barcode. Null when it isn't in Open Food Facts or has no nutrition. */
export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<Food | null> {
  const clean = code.replace(/\D/g, "");
  const url = `https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=code,product_name,brands,serving_quantity,serving_size,nutriments`;
  const res = await fetch(url, { signal });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(t("Lookup failed ({status})", { status: res.status }));
  const data = (await res.json()) as { status?: number; product?: OffProduct };
  if (data.status !== 1 || !data.product) return null;
  const p = { ...data.product, code: data.product.code ?? clean };
  return hasNutrition(p) ? offToFood(p) : null;
}

// ── Photo analysis (server → Claude vision) ──

export interface PhotoItem {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  confidence: "high" | "medium" | "low";
}

export interface PhotoAnalysis {
  isFood: boolean;
  mealName: string;
  items: PhotoItem[];
  notes: string;
}

export async function analyzePhoto(base64: string, mediaType: string, hint: string, signal?: AbortSignal): Promise<PhotoAnalysis> {
  if (!apiConfigured) throw new Error(t("Photo analysis needs a server. Rebuild the app with VITE_API_URL set to your deployed server."));
  const res = await fetch(apiUrl("/api/analyze-photo"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ image: base64, mediaType, hint }),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? t("Request failed ({status})", { status: res.status }));
  return data as PhotoAnalysis;
}

/** Downscale to ≤1280px JPEG so uploads are fast and well under API limits. */
export async function prepareImage(file: File): Promise<{ base64: string; mediaType: string; preview: string }> {
  // Honour EXIF rotation so portrait phone photos aren't sent sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const maxSide = 1280;
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const preview = canvas.toDataURL("image/jpeg", 0.85);
  return { base64: preview.split(",")[1], mediaType: "image/jpeg", preview };
}

export function defaultMeal(d = new Date(), fasting: Profile["fasting"] = getState().profile.fasting): MealType {
  const h = d.getHours() + d.getMinutes() / 60;
  if (fasting === "ramadan") return h < 6.5 ? "breakfast" : h >= 18.5 && h < 21.5 ? "dinner" : h >= 21.5 ? "snack" : "dinner";
  if (h < 10.5) return "breakfast";
  if (h < 15) return "lunch";
  if (h >= 17 && h < 21.5) return "dinner";
  return "snack";
}

export const MEALS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

const RAMADAN_LABEL: Partial<Record<MealType, string>> = { breakfast: "Sahur", dinner: "Iftar", snack: "Moreh" };

/** The name of a meal slot. During Ramadan breakfast is sahur, dinner is iftar and the snack is moreh. */
export function mealLabel(m: MealType, fasting: Profile["fasting"] = getState().profile.fasting): string {
  const label = (fasting === "ramadan" && RAMADAN_LABEL[m]) || MEALS.find((x) => x.value === m)!.label;
  return t(label);
}

/** Meal slots to offer, in the order of the day. */
export function mealOptions(fasting: Profile["fasting"] = getState().profile.fasting): { value: MealType; label: string }[] {
  const order: MealType[] = fasting === "ramadan" ? ["breakfast", "dinner", "snack"] : ["breakfast", "lunch", "dinner", "snack"];
  return order.map((value) => ({ value, label: mealLabel(value, fasting) }));
}
