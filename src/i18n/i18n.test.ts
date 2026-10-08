import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DICTS } from "./dict";

/** Every literal string passed to t() / tr() in the app. */
function sourceStrings() {
  const root = path.resolve(__dirname, "..");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== "i18n") walk(p);
      } else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".test.ts")) files.push(p);
    }
  };
  walk(root);
  const found = new Map<string, string>();
  const re = /\b(?:t|tr)\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(re)) {
      if (m[1] === "`" && m[2].includes("${")) continue;
      const s = m[2].replace(/\\(["'`\\])/g, "$1").replace(/\\n/g, "\n");
      if (!found.has(s)) found.set(s, path.relative(root, f));
    }
  }
  return found;
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("translations", () => {
  const strings = sourceStrings();

  it("finds the app's strings", () => {
    expect(strings.size).toBeGreaterThan(100);
  });

  for (const lang of ["ms", "zh"] as const) {
    it(`${lang}: every UI string is translated`, () => {
      const missing = [...strings].filter(([s]) => !DICTS[lang][s]).map(([s, f]) => `${f}: ${JSON.stringify(s)}`);
      expect(missing, `Missing ${lang} translations:\n${missing.join("\n")}`).toEqual([]);
    });

    it(`${lang}: placeholders match the English`, () => {
      const wrong = Object.entries(DICTS[lang])
        .filter(([en, tr]) => placeholders(en).join() !== placeholders(tr).join())
        .map(([en, tr]) => `${JSON.stringify(en)} → ${JSON.stringify(tr)}`);
      expect(wrong, wrong.join("\n")).toEqual([]);
    });
  }
});
