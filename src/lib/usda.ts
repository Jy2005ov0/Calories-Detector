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

let steps: Record<string, string[]> | null = null;
let stepsPending: Promise<Record<string, string[]>> | null = null;

/** Step-by-step instructions for an exercise, loaded on first use. Empty if none. */
export function useExerciseSteps(name: string | undefined): string[] {
  const [map, setMap] = useState(steps);
  useEffect(() => {
    if (steps || !name) return;
    stepsPending ??= fetch(`${import.meta.env.BASE_URL}data/exercise-instructions.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => (steps = d))
      .catch(() => {
        stepsPending = null;
        return {};
      });
    let alive = true;
    stepsPending.then((d) => alive && setMap(d));
    return () => {
      alive = false;
    };
  }, [name]);
  return (name && map?.[name]) || [];
}
