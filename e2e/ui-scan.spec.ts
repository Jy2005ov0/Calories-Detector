import { devices, expect, test, type Browser } from "@playwright/test";
import { audit, seedState, type Issue } from "./support/audit";

/**
 * Deep UI scan: visits every screen and sheet on small, regular and large iPhones and
 * Android phones, in light and dark mode, and checks each one for layout, touch and
 * accessibility problems. Runs once (from the "iPhone 14" project) and fans out itself.
 */

const DEVICES = ["iPhone SE", "iPhone 14", "iPhone 15 Pro Max", "Pixel 7", "Galaxy S9+"] as const;
const SCHEMES = ["light", "dark"] as const;

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
    await dialog().getByRole("button", { name: "Close", exact: true }).click();
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

  // ── A real user's data ─────────────────────────────
  // Seeded before the app starts: the app saves its own state when the page is left, which would
  // overwrite anything written into storage behind its back.
  await page.addInitScript((state) => {
    try {
      if (location.protocol.startsWith("http") && !sessionStorage.getItem("seeded")) {
        localStorage.setItem("calories-detector:v1", state);
        sessionStorage.setItem("seeded", "1");
      }
    } catch {
      // about:blank has no storage
    }
  }, JSON.stringify(seedState()));
  await page.goto("about:blank");
  await page.goto("/");

  // ── Today ──────────────────────────────────────────
  await audit(page, "Today", issues);
  await page.getByRole("button", { name: /Body check · BMI/ }).click();
  await audit(page, "Body check", issues);
  await page.locator(".sheet-body").evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await audit(page, "Body check · recommendations", issues);
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

  // Water and progress
  await page.getByRole("button", { name: /^Add \d+ ml of water$/ }).click();
  await page.getByRole("button", { name: /steps Progress$/ }).click();
  await audit(page, "Progress · weight", issues);
  await page.locator(".sheet-body").evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await audit(page, "Progress · steps & water", issues);
  await close();
  await page.getByRole("button", { name: /^Cup size \d+ ml, change$/ }).click();
  await audit(page, "Water · cup size", issues);
  await close();
  await page.getByTestId("cycle-card").getByRole("button", { name: "Period calendar" }).click();
  await audit(page, "Period calendar", issues);
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
  await dialog().getByRole("button", { name: "Close", exact: true }).click();
  // A gym exercise's page, with its photos.
  await dialog().getByRole("tab", { name: "Strength" }).click();
  await dialog().locator(".row").first().click();
  await expect(page.getByTestId("exercise-picture")).toBeVisible();
  await audit(page, "Exercise detail · photos", issues);
  await dialog().getByRole("button", { name: "Close", exact: true }).click();
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
  await audit(page, "Profile", issues);
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

  // Profile with a photo, and the backup rows.
  await page.locator(".section-header", { hasText: "Data" }).scrollIntoViewIfNeeded();
  await audit(page, "Profile · data and backup", issues);

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
