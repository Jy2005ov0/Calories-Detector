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
