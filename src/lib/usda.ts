import { useEffect, useState } from "react";
import type { Food } from "./types";

/**
 * The USDA Standard Reference database (SR28, ~8,800 foods) lives in public/data as JSON and is
 * loaded the first time someone searches, so it doesn't slow down opening the app. In the phone
 * apps the file ships inside the app, so it works offline.
 */
type Row = [string, string, string, number, number, number, number, number, number, number, number, string, number];

let cache: Food[] | null = null;
let pending: Promise<Food[]> | null = null;

export function toFood([ndb, name, category, kcal, protein, carbs, fat, fiber, sugar, satFat, sodium, label, grams]: Row): Food {
  return {
    id: `usda-${ndb}`,
    name,
    category,
    per100: { kcal, protein, carbs, fat, fiber, sugar, satFat, sodium },
    servings: grams !== 100 || label !== "100 g" ? [{ label, grams }, { label: "100 g", grams: 100 }] : [{ label: "100 g", grams: 100 }],
    source: "db",
    dataset: "usda",
  };
}

export function loadUsda(): Promise<Food[]> {
  if (cache) return Promise.resolve(cache);
  pending ??= fetch(`${import.meta.env.BASE_URL}data/usda-sr28.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`USDA data ${r.status}`))))
    .then((d: { rows: Row[] }) => (cache = d.rows.map(toFood)))
    .catch((e) => {
      pending = null;
      throw e;
    });
  return pending;
}

/** The USDA foods once loaded (empty until then). Starts loading on first use. */
export function useUsda(): Food[] {
  const [foods, setFoods] = useState<Food[]>(cache ?? []);
  useEffect(() => {
    if (cache) return;
    let alive = true;
    loadUsda()
      .then((f) => alive && setFoods(f))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return foods;
}

// ── More foods from around the world ────────────────────
// Thousands more dishes, brands, drinks and ingredients (public/data/world-foods.json), loaded on
// first search like the USDA list so they don't slow down opening the app. IDs are positional:
// new rows are only ever appended at the end.
type WorldRow = [string, string, number, number, number, number, number, number, number, number, string, number, string?];

let worldCache: Food[] | null = null;
let worldPending: Promise<Food[]> | null = null;

export const worldToFood = (r: WorldRow, i: number): Food => ({
  id: `x-${i}`,
  name: r[0],
  category: r[1],
  per100: { kcal: r[2], protein: r[3], carbs: r[4], fat: r[5], fiber: r[6], sugar: r[7], satFat: r[8], sodium: r[9] },
  servings: r[10] === "100 g" ? [{ label: "100 g", grams: 100 }] : [{ label: r[10], grams: r[11] }, { label: "100 g", grams: 100 }],
  aliases: r[12],
  source: "db",
  extra: true,
});

export function loadWorldFoods(): Promise<Food[]> {
  if (worldCache) return Promise.resolve(worldCache);
  worldPending ??= fetch(`${import.meta.env.BASE_URL}data/world-foods.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`World foods ${r.status}`))))
    .then((d: { rows: WorldRow[] }) => (worldCache = d.rows.map(worldToFood)))
    .catch((e) => {
      worldPending = null;
      throw e;
    });
  return worldPending;
}

/** The extra world foods once loaded (empty until then). Starts loading on first use. */
export function useWorldFoods(): Food[] {
  const [foods, setFoods] = useState<Food[]>(worldCache ?? []);
  useEffect(() => {
    if (worldCache) return;
    let alive = true;
    loadWorldFoods()
      .then((f) => alive && setFoods(f))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return foods;
}

// ── Exercise instructions (free-exercise-db, public domain) ─────────────

const steps: Record<string, Record<string, string[]>> = {};
const stepsPending: Record<string, Promise<Record<string, string[]>> | undefined> = {};

function loadSteps(lang: string) {
  const file = lang === "en" ? "exercise-instructions.json" : `exercise-instructions.${lang}.json`;
  return (stepsPending[lang] ??= fetch(`${import.meta.env.BASE_URL}data/${file}`)
    .then((r) => (r.ok ? r.json() : {}))
    .then((d: Record<string, string[]>) => (steps[lang] = d))
    .catch(() => {
      stepsPending[lang] = undefined;
      return {};
    }));
}

/** Step-by-step instructions for an exercise in the app's language (English if not translated), loaded on first use. Empty if none. */
export function useExerciseSteps(name: string | undefined, lang = "en"): string[] {
  const [, setLoaded] = useState(0);
  useEffect(() => {
    if (!name) return;
    let alive = true;
    for (const l of new Set([lang, "en"])) if (!steps[l]) void loadSteps(l).then(() => alive && setLoaded((n) => n + 1));
    return () => {
      alive = false;
    };
  }, [name, lang]);
  if (!name) return [];
  return steps[lang]?.[name] ?? steps.en?.[name] ?? [];
}
