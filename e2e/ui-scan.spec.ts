import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Deep UI scan: visits every screen and sheet on small, regular and large iPhones and
 * Android phones, in light and dark mode, and checks each one for layout, touch and
 * accessibility problems. Runs once (from the "iPhone 14" project) and fans out itself.
 */

const DEVICES = ["iPhone SE", "iPhone 14", "iPhone 15 Pro Max", "Pixel 7", "Galaxy S9+"] as const;
const SCHEMES = ["light", "dark"] as const;

interface Issue {
  screen: string;
  kind: string;
  detail: string;
}

const ZERO = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, satFat: 0, sodium: 0 };

function seedState() {
  const today = new Date();
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const n = (kcal: number, p: number, c: number, f: number) => ({ ...ZERO, kcal, protein: p, carbs: c, fat: f, sugar: c / 5, sodium: kcal * 1.2, satFat: f / 3, fiber: 2 });
  const now = Date.now();
  return {
    profile: { name: "Aisyah binti Abdullah", sex: "female", age: 27, heightCm: 162, weightKg: 61, activity: 1.55, goal: "lose", experience: "intermediate", trainingDays: 5, diet: "halal", onboarded: true, cycle: { on: true, length: 28, periodDays: 5, remind: true } },
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
    days: [8200, 10400, 6100, 12850, 7300, 9900, 4300].map((steps, i) => ({ id: dayKey(i - 6), steps, waterMl: 250 * (4 + i) })),
    reminders: { meals: true, water: true, gym: true, breakfast: "08:00", lunch: "12:30", dinner: "19:00", gymTime: "18:00" },
    coach: [],
    language: "en",
    deleted: [],
    stamps: {},
  };
}

function dayKey(offset: number) {
  const d = new Date(Date.now() + offset * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function audit(page: Page, screen: string, issues: Issue[]) {
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
        const chrome = (el: Element) => !!el.closest(".tabbar, .help-btn, .sheet-cta, .coach-input, .rest-bar");
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

async function scan(browser: Browser, device: (typeof DEVICES)[number], scheme: (typeof SCHEMES)[number]) {
  const issues: Issue[] = [];
  const ctx = await browser.newContext({ ...devices[device], colorScheme: scheme, locale: "en-MY", timezoneId: "Asia/Kuala_Lumpur", baseURL: test.info().project.use.baseURL });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => issues.push({ screen: "runtime", kind: "page-error", detail: e.message }));
  page.on("console", (m) => {
    if (m.type() === "error" && !/openfoodfacts|ERR_TUNNEL|Failed to load resource: the server responded with a status of 503/.test(m.text())) issues.push({ screen: "runtime", kind: "console-error", detail: m.text().slice(0, 200) });
  });
  await page.route("https://world.openfoodfacts.org/**", (r) => r.fulfill({ json: { products: [] } }));
  const tab = (name: string) => page.getByRole("navigation").getByRole("button", { name, exact: true }).click();
  const dialog = () => page.getByRole("dialog").last();
  const close = async () => {
    await dialog().getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  };

  // ── First launch ───────────────────────────────────
  await page.goto("/");
  await audit(page, "Intro guide · page 1", issues);
  for (let i = 2; i <= 5; i++) {
    await page.getByRole("button", { name: "Next" }).click();
    await audit(page, `Intro guide · page ${i}`, issues);
  }
  await page.getByRole("button", { name: "Get started" }).click();
  await audit(page, "Welcome", issues);
  await page.getByRole("button", { name: "Sign up with email" }).click();
  await audit(page, "Create account sheet", issues);
  await dialog().getByRole("tab", { name: "Log in" }).click();
  await audit(page, "Log in sheet", issues);
  await close();
  await page.getByRole("button", { name: "Continue without an account" }).click();
  await audit(page, "Onboarding · welcome", issues);
  await page.getByRole("button", { name: "Get started" }).click();
  await audit(page, "Onboarding · about you", issues);
  for (const s of ["goal", "activity", "training"]) {
    await page.getByRole("button", { name: "Continue" }).click();
    await audit(page, `Onboarding · ${s}`, issues);
  }
  await page.getByRole("button", { name: "Build my plan" }).click();
  await audit(page, "Guided tour · step 1", issues);
  await page.getByRole("button", { name: "Show me" }).click();
  await audit(page, "Guided tour · step 2", issues);
  await page.getByRole("button", { name: "Skip" }).click();

  // ── A real user's data, signed in ──────────────────
  const reg = await page.request.post("/api/auth/register", {
    data: { email: `scan.${device.replace(/\W/g, "")}.${scheme}.${Date.now()}@example.com`, password: "scan-password-1", name: "Aisyah Abdullah" },
  });
  const { token, user } = await reg.json();
  await page.evaluate(
    ([state, account]) => {
      localStorage.setItem("calories-detector:v1", JSON.stringify(state));
      localStorage.setItem("calories-detector:account", JSON.stringify(account));
    },
    [seedState(), { token, user, guest: false, version: 0, lastSyncedAt: null }] as const,
  );
  await page.reload();

  // ── Today ──────────────────────────────────────────
  await audit(page, "Today", issues);
  await page.getByRole("button", { name: /Body check · BMI/ }).click();
  await audit(page, "Body check", issues);
  await page.locator(".sheet-body").evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await audit(page, "Body check · recommendations", issues);
  await close();
  await page.getByRole("button", { name: /Scan meal/ }).click();
  await audit(page, "Scan a meal", issues);
  await page.route("**/api/analyze-photo", (r) =>
    r.fulfill({
      json: {
        isFood: true,
        mealName: "Chicken rice with soup, chilli sauce and cucumber",
        notes: "Assumed roasted chicken thigh with skin and rice cooked in chicken fat.",
        items: [
          { name: "Hainanese chicken rice (rice cooked in chicken stock and fat)", grams: 250, calories: 420, protein: 8, carbs: 60, fat: 15, fiber: 1, sugar: 1, confidence: "high" },
          { name: "Roasted chicken", grams: 120, calories: 280, protein: 28, carbs: 2, fat: 18, fiber: 0, sugar: 1, confidence: "medium" },
        ],
      },
    }),
  );
  await page.locator('input[type=file]:not([capture])').setInputFiles({
    name: "meal.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
  });
  await audit(page, "Scan a meal · preview", issues);
  await page.getByRole("button", { name: "Analyse" }).click();
  await expect(dialog()).toContainText("Chicken rice with soup");
  await audit(page, "Scan a meal · result", issues);
  await close();

  // Barcode (no camera in the test browser → the typed-number fallback)
  await page.route("https://world.openfoodfacts.org/api/v2/product/**", (r) =>
    r.fulfill({
      json: {
        status: 1,
        product: {
          code: "9556001234567",
          product_name: "Milo 3in1 Activ-Go Kurang Manis with an extra long product name",
          brands: "Nestlé",
          serving_quantity: 33,
          serving_size: "1 sachet (33 g)",
          nutriments: { "energy-kcal_100g": 412, proteins_100g: 7.5, carbohydrates_100g: 74, fat_100g: 9, sugars_100g: 50, fiber_100g: 3, "saturated-fat_100g": 5, sodium_100g: 0.2 },
        },
      },
    }),
  );
  await page.getByRole("button", { name: /Scan barcode/ }).click();
  await audit(page, "Barcode scanner", issues);
  await dialog().getByLabel("Barcode number").fill("9556001234567");
  await dialog().getByRole("button", { name: "Look up" }).click();
  await expect(dialog()).toContainText("Milo 3in1");
  await audit(page, "Barcode · product", issues);
  await close();

  // Water, progress and coach
  await page.getByRole("button", { name: "Add a glass of water" }).click();
  await page.getByRole("button", { name: /steps Progress$/ }).click();
  await audit(page, "Progress · weight", issues);
  await page.locator(".sheet-body").evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await audit(page, "Progress · steps & water", issues);
  await close();
  await page.route("**/api/coach", (r) =>
    r.fulfill({
      status: 200,
      contentType: "text/plain; charset=utf-8",
      body: "You have about **490 kcal** left:\n\n- **Ikan bakar** with ½ cup rice and ulam — about 420 kcal, 38 g protein\n- Or chicken soup with bihun and extra vegetables\n- Skip the sweet drink; https://example.com/a-very-long-link-that-should-wrap-inside-the-bubble-and-not-overflow",
    }),
  );
  await page.getByRole("button", { name: /Ask coach/ }).click();
  await audit(page, "Coach · empty", issues);
  await dialog().getByRole("button", { name: /dinner/ }).click();
  await expect(dialog().locator(".bubble.assistant li")).toHaveCount(3);
  await audit(page, "Coach · answer", issues);
  await close();

  await page.getByRole("button", { name: "Switch person" }).click();
  await audit(page, "Switch person", issues);
  await close();

  // ── Food ───────────────────────────────────────────
  await tab("Food");
  await audit(page, "Food · recent", issues);
  for (const v of ["My Meals", "My Foods", "Browse"]) {
    await page.getByRole("tab", { name: v }).click();
    await audit(page, `Food · ${v}`, issues);
  }
  await page.getByLabel("Search foods").fill("chicken");
  await audit(page, "Food · search results", issues);
  await page.getByLabel("Search foods").fill("general tso");
  await page.locator(".row", { hasText: "General Tso's chicken" }).first().click();
  await audit(page, "Food detail", issues);
  await page.locator(".sheet-body").evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await audit(page, "Food detail · nutrition", issues);
  await close();
  await page.getByLabel("Search foods").fill("nasi lemak");
  await page.locator(".row", { hasText: "Nasi lemak ayam goreng" }).first().click();
  await audit(page, "Dish editor (What's in it)", issues);
  await page.getByTestId("dish-parts").getByRole("button", { name: "More Fried egg" }).click();
  await page.getByTestId("dish-parts").getByRole("button", { name: "Add an ingredient" }).click();
  await audit(page, "Dish editor · add ingredient", issues);
  await page.getByRole("dialog", { name: "Add food" }).locator(".row").first().click();
  await audit(page, "Dish editor · customised", issues);
  await close();
  // Halal: pork dishes are hidden until shown, then flagged
  await page.getByLabel("Search foods").fill("pork");
  await audit(page, "Food · avoid filter", issues);
  await page.getByRole("button", { name: /Hiding foods you avoid/ }).click();
  await audit(page, "Food · avoid flags", issues);
  await page.locator(".row", { hasText: "Char siu" }).first().click();
  await audit(page, "Food detail · not halal", issues);
  await close();
  await page.getByRole("button", { name: /Showing all foods/ }).click();
  await page.getByLabel("Clear search").click();
  await page.getByRole("button", { name: "Build meal" }).click();
  await page.getByRole("button", { name: "Add food" }).first().click();
  await audit(page, "Food picker", issues);
  await dialog().locator(".row").first().click();
  await audit(page, "Meal builder", issues);
  await close();
  await page.getByRole("button", { name: "New food" }).first().click();
  await audit(page, "New food", issues);
  await dialog().getByRole("button", { name: "Cancel" }).click();

  // ── Train ──────────────────────────────────────────
  await tab("Train");
  await audit(page, "Train", issues);
  await page.getByRole("button", { name: /Exercise library/ }).click();
  await audit(page, "Exercise library · strength", issues);
  await dialog().getByRole("tab", { name: "Cardio & Sports" }).click();
  await audit(page, "Exercise library · cardio", issues);
  await dialog().locator(".row").first().click();
  await audit(page, "Exercise detail", issues);
  await dialog().getByRole("button", { name: "Close" }).click();
  await close();
  await page.locator('[data-tour="clock-in"]').click();
  await page.getByRole("button", { name: "Add exercise" }).click();
  await dialog().locator(".row", { hasText: "Barbell squat" }).or(dialog().locator(".row").first()).first().click();
  await dialog().getByRole("button", { name: /Add to workout/ }).click();
  await audit(page, "Workout · live", issues);
  await page.getByRole("button", { name: "Mark set done" }).first().click();
  await audit(page, "Workout · rest timer", issues);
  await page.getByRole("timer", { name: "Rest timer" }).getByRole("button", { name: "Skip" }).click();
  await page.getByRole("button", { name: "Clock out" }).click();
  await audit(page, "Clock out", issues);
  await page.getByRole("button", { name: "Finish workout" }).click();
  await audit(page, "Train · done, records", issues);

  // ── Plan ───────────────────────────────────────────
  await tab("Plan");
  await audit(page, "Plan · training", issues);
  await page.getByRole("button", { name: "Body-part split" }).click();
  await audit(page, "Plan · body-part split", issues);
  await page.getByRole("tab", { name: "Nutrition" }).click();
  await audit(page, "Plan · nutrition", issues);

  // ── Profile ────────────────────────────────────────
  await tab("Profile");
  await audit(page, "Profile · signed in", issues);
  for (const section of ["Allergies", "Reminders", "Language", "Data"]) {
    await page.locator(".section-header", { hasText: section }).first().scrollIntoViewIfNeeded();
    await audit(page, `Profile · ${section}`, issues);
  }
  await page.getByRole("tab", { name: "Ramadan" }).click();
  await audit(page, "Profile · Ramadan times", issues);
  await tab("Today");
  await audit(page, "Today · Ramadan", issues);
  await tab("Plan");
  await page.getByRole("tab", { name: "Nutrition" }).click();
  await audit(page, "Plan · Ramadan nutrition", issues);

  // Other languages: longer words must still fit
  const nav = page.getByRole("navigation").getByRole("button");
  for (const [lang, label] of [["Malay", "Bahasa Melayu"], ["Chinese", "中文"]] as const) {
    await nav.last().click();
    await page.getByRole("button", { name: label }).click();
    await audit(page, `${lang} · Profile`, issues);
    for (let i = 0; i < 4; i++) {
      await nav.nth(i).click();
      await audit(page, `${lang} · tab ${i + 1}`, issues);
    }
  }
  await nav.last().click();
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("tab", { name: "Off" }).click();

  await page.getByRole("button", { name: "Sign out" }).click();
  await audit(page, "Profile · guest", issues);

  await ctx.close();
  return issues;
}

for (const device of DEVICES) {
  for (const scheme of SCHEMES) {
    test(`UI scan · ${device} · ${scheme}`, async ({ browser }, info) => {
      test.skip(info.project.name !== "iPhone 14", "the scan covers every device itself");
      test.setTimeout(600_000);
      const issues = await scan(browser, device, scheme);
      const blocking = issues.filter((i) => i.kind !== "tap-target-small");
      await info.attach("ui-issues.json", { body: JSON.stringify(issues, null, 2), contentType: "application/json" });
      if (process.env.SCAN_REPORT) {
        const fs = await import("node:fs");
        fs.mkdirSync(process.env.SCAN_REPORT, { recursive: true });
        fs.writeFileSync(`${process.env.SCAN_REPORT}/${device.replace(/\W/g, "")}-${scheme}.json`, JSON.stringify(issues, null, 2));
      }
      expect(blocking, blocking.map((i) => `[${i.screen}] ${i.kind}: ${i.detail}`).join("\n")).toEqual([]);
    });
  }
}
