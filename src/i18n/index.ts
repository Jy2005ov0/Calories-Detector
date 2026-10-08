import { getState, useStore } from "../lib/store";
import { DICTS, type Lang } from "./dict";

export type { Lang };

export const LANGUAGES: { value: Lang; label: string; locale: string }[] = [
  { value: "en", label: "English", locale: "en-MY" },
  { value: "ms", label: "Bahasa Melayu", locale: "ms-MY" },
  { value: "zh", label: "中文", locale: "zh-CN" },
];

/**
 * Translate an English UI string. The English text is the key, so untranslated strings
 * still read correctly. `{name}` placeholders are filled from `params`.
 */
export function t(s: string, params?: Record<string, string | number>): string {
  const lang = getState().language ?? "en";
  const out = lang === "en" ? s : (DICTS[lang]?.[s] ?? s);
  return params ? out.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : out;
}

/** Re-render the calling component when the language changes. */
export function useLanguage() {
  return useStore((s) => s.language ?? "en");
}

/** Locale for dates and numbers in the chosen language. */
export function locale() {
  return LANGUAGES.find((l) => l.value === getState().language)?.locale ?? "en-MY";
}
