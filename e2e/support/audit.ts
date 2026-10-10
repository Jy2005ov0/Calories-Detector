import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

// Shared by the UI scan and the robustness journeys: a realistic user's data, and a check of one
// screen for layout, touch and accessibility problems.

export interface Issue {
  screen: string;
  kind: string;
  detail: string;
}

export const ZERO = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, satFat: 0, sodium: 0 };

// A tiny square image standing in for a profile picture.
export const PHOTO_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export function seedState() {
  const today = new Date();
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const n = (kcal: number, p: number, c: number, f: number) => ({ ...ZERO, kcal, protein: p, carbs: c, fat: f, sugar: c / 5, sodium: kcal * 1.2, satFat: f / 3, fiber: 2 });
  const now = Date.now();
  return {
    profile: { name: "Aisyah binti Abdullah", sex: "female", age: 27, heightCm: 162, weightKg: 61, activity: 1.55, goal: "lose", experience: "intermediate", trainingDays: 5, diet: "halal", onboarded: true, cycle: { on: true, length: 28, periodDays: 5, remind: true }, photo: PHOTO_URL },
    periods: [-53, -25].map((d, i) => ({ id: `p${i}`, date: dayKey(d), createdAt: i })),
    personId: "me",
    people: [
      { id: "mum", data: { profile: { name: "Puan Rohana binti Ismail (Mum)", sex: "female", age: 56, heightCm: 154, weightKg: 68, activity: 1.375, goal: "lose", experience: "beginner", trainingDays: 3, diet: "halal", onboarded: true }, stamps: {} } },
    ],
    removedPeople: [],
    log: [
      { id: "l1", date: key, meal: "breakfast", name: "Nasi lemak ayam goreng with extra sambal and telur mata", grams: 400, nutrients: n(860, 38, 80, 44), source: "db", createdAt: now - 5e6 },
      { id: "l2", date: key, meal: "breakfast", name: "Teh tarik", grams: 250, nutrients: n(185, 4, 31, 5), source: "db", createdAt: now - 4.9e6 },
      { id: "l3", date: key, meal: "lunch", name: "Chicken tikka masala", grams: 250, nutrients: n(375, 28, 15, 22), source: "photo", createdAt: now - 3e6 },
      { id: "l4", date: key, meal: "snack", name: "Greek yogurt (plain, nonfat)", grams: 170, nutrients: n(100, 17, 6, 1), source: "db", createdAt: now - 1e6 },
    ],
    customFoods: [
      { id: "custom-1", name: "Mum's rendang with extra-long name to test wrapping", category: "My Foods", per100: n(230, 19, 5, 15), servings: [{ label: "1 serving", grams: 150 }], source: "custom" },
    ],
    customMeals: [
      { id: "m1", name: "Post-gym bowl", items: [{ foodId: "x", name: "Chicken breast", grams: 150, per100: n(165, 31, 0, 3.6) }, { foodId: "y", name: "Brown rice", grams: 180, per100: n(123, 2.7, 25.6, 1) }] },
    ],
    sessions: [
      { id: "s1", date: key, title: "Upper A", startedAt: now - 9e6, endedAt: now - 5.4e6, exercises: [{ id: "e1", exerciseId: "s-0", name: "Barbell bench press", kind: "strength", met: 6, sets: [{ reps: 8, weightKg: 50, done: true }] }], kcal: 312 },
    ],
    activeSessionId: null,
    split: "auto",
    recentFoodIds: ["db-0", "db-150", "db-300"],
    tourDone: true,
    introDone: true,
    weights: [64.2, 63.8, 63.1, 62.6, 62.0, 61.4, 61.0].map((kg, i) => ({ id: `w${i}`, date: dayKey(-(6 - i) * 5), kg, createdAt: i })),
    days: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ id: dayKey(i - 6), waterMl: 250 * (4 + i) })),
    reminders: { meals: true, water: true, gym: true, breakfast: "08:00", lunch: "12:30", dinner: "19:00", gymTime: "18:00" },
    language: "en",
    deleted: [],
    stamps: {},
  };
}

export function dayKey(offset: number) {
  const d = new Date(Date.now() + offset * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function audit(page: Page, screen: string, issues: Issue[]) {
  await page.waitForTimeout(800); // let springs and page transitions settle
  // The greeting depends on the time of day; check the longest one ("Good afternoon") whenever the scan runs.
  await page.evaluate(() => {
    const greet = document.querySelector(".title-row .large-title")?.firstChild;
    if (greet && /^Good (morning|evening)$/.test(greet.textContent ?? "")) greet.textContent = "Good afternoon";
  });
  // Don't judge a toast mid-fade.
  await page
    .waitForFunction(() => Array.from(document.querySelectorAll(".toast")).every((t) => getComputedStyle(t).opacity === "1"), null, { timeout: 3000 })
    .catch(() => {});
  const found = await page.evaluate(() => {
    const out: { kind: string; detail: string }[] = [];
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const desc = (el: Element) => {
      const name = (el.getAttribute("aria-label") || (el as HTMLElement).innerText || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 40);
      return `<${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : ""}> "${name}"`;
    };
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return false;
      if (el.closest('[aria-hidden="true"]')) return false;
      return r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
    };
    // Areas that scroll sideways on purpose.
    const sideScroll = (el: Element) => !!el.closest(".chips, .intro-viewport");

    if (document.documentElement.scrollWidth > vw + 1) out.push({ kind: "page-overflow", detail: `page is ${document.documentElement.scrollWidth}px wide on a ${vw}px screen` });

    const all = Array.from(document.querySelectorAll("body *"));
    for (const el of all) {
      if (!visible(el) || sideScroll(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.left < -1) out.push({ kind: "cut-off", detail: `${desc(el)} spans ${Math.round(r.left)}–${Math.round(r.right)}px` });
      // Text or children spilling out of a box that doesn't clip.
      const he = el as HTMLElement;
      const cs = getComputedStyle(el);
      // (≤10px is a deliberately extended tap area; .chips scroll edge-to-edge on purpose.)
      if (he.scrollWidth > he.clientWidth + 10 && !el.querySelector(".chips") && cs.overflowX === "visible" && he.clientWidth > 0 && !["svg", "path", "circle"].includes(el.tagName.toLowerCase())) {
        out.push({ kind: "spills", detail: `${desc(el)} content ${he.scrollWidth}px in ${he.clientWidth}px box` });
      }
    }

    // Only controls a finger can actually reach: on top at their centre (not under a sheet or the tab bar).
    const onTop = (el: Element) => {
      const r = el.getBoundingClientRect();
      const x = Math.min(Math.max(r.left + r.width / 2, 0), vw - 1);
      const y = Math.min(Math.max(r.top + r.height / 2, 0), vh - 1);
      const hit = document.elementFromPoint(x, y);
      return !!hit && (hit === el || el.contains(hit));
    };
    const interactive = all.filter(
      (el) =>
        el.matches('button, a[href], input, select, textarea, [role="tab"], [role="button"]') &&
        visible(el) &&
        !sideScroll(el) &&
        !(el as HTMLButtonElement).disabled &&
        onTop(el),
    );
    // WCAG 2.5.8 exempts links inside a sentence.
    const inSentence = (el: Element) => {
      const p = el.closest("p");
      return !!p && (p.textContent ?? "").trim().length > (el.textContent ?? "").trim().length + 3;
    };
    for (const el of interactive) {
      const r = el.getBoundingClientRect();
      const inlineLink = el.classList.contains("link") && inSentence(el);
      if (inlineLink) continue;
      if (r.width < 24 || r.height < 24) out.push({ kind: "tap-target-too-small", detail: `${desc(el)} is ${Math.round(r.width)}×${Math.round(r.height)}px (min 24)` });
      else if (!inlineLink && (r.width < 32 || r.height < 32)) out.push({ kind: "tap-target-small", detail: `${desc(el)} is ${Math.round(r.width)}×${Math.round(r.height)}px` });
    }
    for (let i = 0; i < interactive.length; i++) {
      for (let j = i + 1; j < interactive.length; j++) {
        const a = interactive[i], b = interactive[j];
        if (a.contains(b) || b.contains(a)) continue;
        // Content scrolling under the floating tab bar or ? button is by design.
        // Floating bars that content scrolls under by design (and can scroll clear of).
        const chrome = (el: Element) => !!el.closest(".tabbar, .help-btn, .sheet-cta, .rest-bar");
        if (chrome(a) !== chrome(b)) continue;
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (ox > 4 && oy > 4) out.push({ kind: "overlap", detail: `${desc(a)} overlaps ${desc(b)} by ${Math.round(ox)}×${Math.round(oy)}px` });
      }
    }
    return out;
  });
  for (const f of found) issues.push({ screen, ...f });

  // Content must be reachable above the tab bar.
  const tabbar = page.locator(".tabbar");
  if ((await tabbar.count()) && !(await page.getByRole("dialog").count())) {
    const hidden = await page.evaluate(async () => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise((r) => setTimeout(r, 120));
      const bar = document.querySelector(".tabbar")!.getBoundingClientRect();
      const items = Array.from(document.querySelectorAll(".screen button, .screen .row, .screen .card, .screen .footnote"));
      const lastBottom = Math.max(...items.map((e) => e.getBoundingClientRect().bottom));
      window.scrollTo(0, 0);
      return lastBottom > bar.top + 1 ? Math.round(lastBottom - bar.top) : 0;
    });
    if (hidden) issues.push({ screen, kind: "behind-tab-bar", detail: `last content is ${hidden}px under the tab bar at the bottom of the page` });
  }

  // Toasts come and go on timers; their steady-state colours are the main text on a solid surface.
  const axe = await new AxeBuilder({ page }).exclude(".toast").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  // Controls that scroll under a floating bar (tab bar, sheet action bar) are reachable by scrolling;
  // anything else that's obscured or too small still counts.
  const underFloatingBar = async (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => {
        const r = el.getBoundingClientRect();
        return Array.from(document.querySelectorAll(".sheet-cta, .tabbar")).some((bar) => {
          const b = bar.getBoundingClientRect();
          return r.bottom > b.top && r.top < b.bottom;
        });
      })
      .catch(() => false);
  for (const v of axe.violations) {
    if (v.id === "target-size") {
      const real = [];
      for (const n of v.nodes) if (!(await underFloatingBar(n.target.join(" ")))) real.push(n);
      if (!real.length) continue;
      v.nodes = real;
    }
    issues.push({ screen, kind: `a11y:${v.id}`, detail: `${v.impact} · ${v.nodes.length} element(s) · e.g. ${v.nodes[0]?.target.join(" ")} · ${v.nodes[0]?.failureSummary?.split("\n")[1]?.trim() ?? ""}` });
  }
}

