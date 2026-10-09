import { useSyncExternalStore } from "react";
import { getState, useStore } from "../lib/store";

// Exercise names, categories, muscles and equipment in Malay and Chinese. There are almost 2,000
// names, so each language is its own file, loaded only when that language is chosen.

type Pack = { names: Record<string, string>; labels: Record<string, string>; tips?: Record<string, string> };

const LOADERS: Record<string, () => Promise<{ default: Pack }>> = {
  ms: () => import("./exercises/ms.json"),
  zh: () => import("./exercises/zh.json"),
};

const packs: Record<string, Pack | undefined> = {};
const loading: Record<string, Promise<void> | undefined> = {};
const listeners = new Set<() => void>();
let version = 0;

function load(lang: string) {
  if (packs[lang] || loading[lang] || !LOADERS[lang]) return;
  loading[lang] = LOADERS[lang]()
    .then((m) => {
      packs[lang] = m.default;
      version++;
      listeners.forEach((l) => l());
    })
    .catch(() => {
      loading[lang] = undefined;
    });
}

const pack = () => {
  const lang = getState().language ?? "en";
  if (lang === "en") return undefined;
  load(lang);
  return packs[lang];
};

/** An exercise (or workout title that is an exercise name) in the app's language. */
export function exName(name: string): string {
  return pack()?.names[name] ?? name;
}

/** A form tip in the app's language. */
export function exTip(tip: string): string {
  return pack()?.tips?.[tip] ?? tip;
}

/** A category, muscle or equipment label in the app's language. */
export function exLabel(label: string | undefined): string {
  if (!label) return "";
  return pack()?.labels[label] ?? label;
}

/** Re-render when the language changes or its exercise names finish loading. */
export function useExerciseNames() {
  const lang = useStore((s) => s.language ?? "en");
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
  );
  if (lang !== "en") load(lang);
  return lang;
}

/** Preload the names for a language (e.g. right after it's chosen). */
export async function loadExerciseNames(lang: string) {
  load(lang);
  await loading[lang];
}
