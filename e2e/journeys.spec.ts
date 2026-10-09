import { expect, test, type Page } from "@playwright/test";

// A Monday morning in Kuala Lumpur, so "today's plan" is deterministic.
// 1x1 PNG used as a profile picture.
const PHOTO = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const MONDAY_8AM = new Date("2026-10-12T08:00:00+08:00");


// ── helpers ──────────────────────────────────────────────

async function start(page: Page, { fakeClock = true, skipIntro = true } = {}) {
  // The fake clock pins "today" to a Monday. It stalls animation frames after a reload,
  // so journeys that reload and then animate run on the real clock instead.
  if (fakeClock) {
    await page.clock.install({ time: MONDAY_8AM });
    await page.clock.resume();
  }
  // Keep the suite hermetic: no real calls to Open Food Facts.
  await page.route("https://world.openfoodfacts.org/**", (r) => r.fulfill({ json: { products: [] } }));
  await page.goto("/");
  if (skipIntro) await page.getByRole("region", { name: "Welcome guide" }).getByRole("button", { name: "Skip" }).click();
}

/** Move the phone's wall clock forward; timers keep running normally. */
async function advance(page: Page, ms: number) {
  const now = await page.evaluate(() => Date.now());
  await page.clock.setSystemTime(new Date(now + ms));
}

const tab = (page: Page, name: string) => page.getByRole("navigation").getByRole("button", { name, exact: true }).click();

async function statValue(page: Page, label: string) {
  const text = await page.locator(".stat", { hasText: label }).first().locator(".stat-value").innerText();
  return Number(text.replace(/[^\d.-]/g, ""));
}

/** The page must never be wider than the phone — that zooms out and hides the tab bar. */
async function expectNoHorizontalScroll(page: Page) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(sw, "page wider than the screen").toBeLessThanOrEqual(cw);
  if (await page.getByRole("navigation").count()) await expect(page.getByRole("navigation")).toBeInViewport();
}

async function onboard(
  page: Page,
  p: { name: string; sex: "Male" | "Female"; age: string; height: string; weight: string; goal: RegExp; activity: RegExp; experience: RegExp; days: number; diet: string },
) {
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByLabel("Name").fill(p.name);
  await page.getByRole("tab", { name: p.sex, exact: true }).click();
  await page.getByLabel("Age").fill(p.age);
  await page.getByLabel("Height").fill(p.height);
  await page.getByLabel("Weight").fill(p.weight);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: p.goal }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: p.activity }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: p.experience }).click();
  const days = page.locator(".field", { hasText: "Days per week" });
  while (Number(await days.locator(".stepper span").innerText()) !== p.days) {
    const now = Number(await days.locator(".stepper span").innerText());
    await days.getByRole("button", { name: now < p.days ? "Increase" : "Decrease" }).click();
  }
  await page.locator(".chip", { hasText: p.diet }).click();
  await page.getByRole("button", { name: "Build my plan" }).click();
  // The guide opens once after onboarding; these journeys skip it.
  await expect(page.getByRole("dialog", { name: "Welcome to W 👋" })).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`Good \\w+, ${p.name}`) })).toBeVisible();
}

async function searchAndOpen(page: Page, query: string, exactName: string) {
  await tab(page, "Food");
  const search = page.getByLabel("Search foods");
  await search.fill(query);
  await page.locator(".row", { has: page.locator(".row-title", { hasText: new RegExp(`^${escape(exactName)}$`) }) }).first().click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: exactName })).toBeVisible();
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const mealHeader = (page: Page, meal: string) => page.locator(".section-header", { hasText: new RegExp(`^${meal}`) });

// ── Journey 1 ────────────────────────────────────────────

test("Aiman: cutting, logs a hawker breakfast and lunch, trains, comes back tomorrow", async ({ page }) => {
  await start(page);

  // 1. Onboarding — male, 28, 178 cm, 85 kg, lose fat, moderately active, new to the gym, 3 days, halal.
  await onboard(page, {
    name: "Aiman",
    sex: "Male",
    age: "28",
    height: "178",
    weight: "85",
    goal: /Lose fat/,
    activity: /Moderately active/,
    experience: /New to the gym/,
    days: 3,
    diet: "Halal",
  });
  // Mifflin-St Jeor: 10×85 + 6.25×178 − 5×28 + 5 = 1827.5; ×1.55 = 2832.6; −20% = 2266 → 2270.
  expect(await statValue(page, "Daily target")).toBe(2270);
  expect(await statValue(page, "Eaten")).toBe(0);
  await expectNoHorizontalScroll(page);

  // 2. Breakfast: 2 roti canai with dhal (2 × [95 g roti + 60 g dhal] = 698 kcal) and a teh tarik (250 ml × 74 = 185).
  await searchAndOpen(page, "roti prata", "Roti canai");
  await page.getByRole("dialog").getByRole("button", { name: "More servings" }).click();
  await expect(page.getByRole("dialog").locator(".big-number")).toHaveText("698");
  await page.getByRole("dialog").getByRole("tab", { name: "Breakfast" }).click();
  await page.getByRole("button", { name: "Add to Breakfast" }).click();
  await expect(page.getByRole("status").filter({ hasText: "698 kcal" })).toBeVisible();

  await searchAndOpen(page, "teh tarik", "Teh tarik");
  await expect(page.getByRole("dialog")).toContainText(/High in sugar/);
  await page.getByRole("dialog").getByRole("tab", { name: "Breakfast" }).click();
  await page.getByRole("button", { name: "Add to Breakfast" }).click();

  await tab(page, "Today");
  await expect(mealHeader(page, "Breakfast")).toContainText("883 kcal");

  // 3. Slip and undo: delete the teh tarik, then undo.
  await page.getByRole("button", { name: "Remove Teh tarik" }).click();
  await expect(mealHeader(page, "Breakfast")).toContainText("698 kcal");
  await page.getByRole("status").getByRole("button", { name: "Undo" }).click();
  await expect(mealHeader(page, "Breakfast")).toContainText("883 kcal");

  // 4. Lunch: a plate of nasi lemak, built from its parts (506 kcal).
  await searchAndOpen(page, "nasi lemak", "Nasi lemak (with sambal, egg, anchovies, peanuts)");
  await expect(page.getByRole("dialog").locator(".big-number")).toHaveText("506");
  await page.getByRole("dialog").getByRole("tab", { name: "Lunch" }).click();
  await page.getByRole("button", { name: "Add to Lunch" }).click();
  await tab(page, "Today");
  await expect(mealHeader(page, "Lunch")).toContainText("506 kcal");
  expect(await statValue(page, "Eaten")).toBe(1389);

  // 5. Monday is Full Body A for a 3-day beginner. Clock in from the plan, do 3 sets, train 45 min.
  await tab(page, "Train");
  await expect(page.locator(".card", { hasText: "Today's plan" })).toContainText("Full Body A");
  await page.getByRole("button", { name: /Clock in & start Full Body A/ }).click();
  await expect(page.getByText("LIVE")).toBeVisible();
  await expect(page.getByRole("navigation").locator(".live-dot")).toBeVisible();
  const firstExercise = page.locator(".card", { hasText: "Goblet squat" });
  for (let set = 1; set <= 3; set++) {
    await firstExercise.getByLabel(`Set ${set} weight`).fill("20");
    await firstExercise.getByLabel(`Set ${set} reps`).fill("12");
    await firstExercise.getByRole("button", { name: "Mark set done" }).first().click();
  }
  expect(await statValue(page, "Volume")).toBe(720);
  // Jump the wall clock 45 minutes (timers keep running normally, like a real phone).
  await advance(page, 45 * 60_000);
  await expect(page.locator(".stat", { hasText: "Time" }).locator(".stat-value")).toHaveText(/^45:/);

  // Leaving the screen mid-workout keeps the session running.
  await tab(page, "Today");
  await expect(page.locator(".live-banner")).toContainText("Full Body A · clocked in");
  await page.locator(".live-banner").click();

  await page.getByRole("button", { name: "Clock out" }).click();
  // 3 sets × 2 min × 5.0 MET + 39 min × 2.0 MET, at 85 kg ≈ 153 kcal.
  const burned = Number((await page.getByRole("dialog").locator(".big-number").innerText()).trim());
  expect(burned).toBeGreaterThanOrEqual(150);
  expect(burned).toBeLessThanOrEqual(158);
  await page.getByRole("button", { name: "Finish workout" }).click();
  await expect(page.getByRole("status").filter({ hasText: `Workout saved · ${burned} kcal` })).toBeVisible();
  await expect(page.locator(".row", { hasText: "Full Body A" })).toContainText(`${burned} kcal`);

  // 6. Today adds the workout back to the budget: left = target − eaten + burned.
  await tab(page, "Today");
  expect(await statValue(page, "Burned")).toBe(burned);
  await expect(page.locator(".card").first()).toContainText(String(2270 - 1389 + burned));
  await expectNoHorizontalScroll(page);

  // 7. Close and reopen the app: everything is still there.
  await page.reload();
  expect(await statValue(page, "Eaten")).toBe(1389);
  expect(await statValue(page, "Burned")).toBe(burned);

  // 8. Leave the app open overnight. When it comes back to the foreground, it shows the new day.
  await page.clock.setSystemTime(new Date("2026-10-13T07:30:00+08:00")); // Tuesday morning
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect.poll(() => statValue(page, "Eaten")).toBe(0);
  await expect(mealHeader(page, "Breakfast")).not.toContainText("kcal");
});

// ── Journey 2 ────────────────────────────────────────────

test("Mei Ling: vegetarian bulking, custom food and meal, body-part split, logs futsal", async ({ page }) => {
  await start(page);
  await onboard(page, {
    name: "Mei Ling",
    sex: "Female",
    age: "24",
    height: "160",
    weight: "52",
    goal: /Build muscle/,
    activity: /Moderately active/,
    experience: /Intermediate/,
    days: 5,
    diet: "Vegetarian",
  });
  // 10×52 + 6.25×160 − 5×24 − 161 = 1239; ×1.55 = 1920; +10% = 2112 → 2110.
  expect(await statValue(page, "Daily target")).toBe(2110);

  // 1. Nutrition plan respects the vegetarian diet.
  await tab(page, "Plan");
  await page.getByRole("tab", { name: "Nutrition" }).click();
  const nutrition = page.locator("main");
  await expect(nutrition).toContainText("Lean protein");
  await expect(nutrition.locator(".card", { hasText: "Lean protein" })).not.toContainText(/chicken|fish|beef|tuna|salmon/i);
  await expect(nutrition.locator(".card", { hasText: "Easy to over-eat" })).not.toContainText(/chicken/i);
  await expect(nutrition.locator(".card", { hasText: "Breakfast" })).toBeVisible();
  for (const meal of await nutrition.locator(".card", { hasText: /am|pm/ }).allInnerTexts()) {
    expect(meal, "sample day must be vegetarian").not.toMatch(/chicken|fish|beef|tuna|salmon|prawn|pork/i);
  }
  await expectNoHorizontalScroll(page);

  // 2. She wants a classic chest/back/legs/shoulders/arms split, 5 days.
  await page.getByRole("tab", { name: "Training" }).click();
  await page.getByRole("button", { name: "Body-part split" }).click();
  for (const day of ["Chest Day", "Back Day", "Leg Day", "Shoulder Day", "Arm Day"]) {
    await expect(page.locator(".card", { hasText: day }).first()).toBeVisible();
  }
  await page.getByRole("button", { name: /Arm Day/ }).click();
  await expect(page.locator(".card", { hasText: "Arm Day" })).toContainText("Barbell curl");
  // Bulking: compounds 6–8 reps, 4 sets for an intermediate.
  await expect(page.locator(".card", { hasText: "Arm Day" })).toContainText("4 sets × 6–8 reps");

  // 3. Her mum's tempeh sambal isn't in any database — add it from the recipe card.
  await tab(page, "Food");
  await page.getByRole("button", { name: "New food" }).first().click();
  await page.getByPlaceholder("Food name").fill("Mum's tempeh sambal");
  for (const [label, value] of [["Serving size", "150"], ["Calories", "320"], ["Protein", "18"], ["Carbohydrate", "12"], ["Fat", "22"]] as const) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status").filter({ hasText: "added to My Foods" })).toBeVisible();
  await searchAndOpen(page, "tempeh sambal", "Mum's tempeh sambal");
  await expect(page.getByRole("dialog").locator(".big-number")).toHaveText("320");
  await page.getByRole("dialog").getByRole("tab", { name: "Dinner" }).click();
  await page.getByRole("button", { name: "Add to Dinner" }).click();

  // 4. Build and save a breakfast she'll repeat: oats 60 g + Greek yogurt 170 g + blueberries 148 g = 412 kcal.
  await page.getByLabel("Clear search").click();
  await page.getByRole("button", { name: "Build meal" }).click();
  await page.getByPlaceholder(/Meal name/).fill("Overnight oats");
  const add = async (q: string, name: string) => {
    await page.getByRole("button", { name: /Add (another )?food/ }).first().click();
    const picker = page.getByRole("dialog", { name: "Add food" });
    await picker.getByPlaceholder("Search foods").fill(q);
    await picker.locator(".row", { hasText: name }).first().click();
  };
  await add("oats dry", "Oats (dry)");
  await page.getByLabel("Oats (dry) grams").fill("60");
  await add("greek yogurt", "Greek yogurt (plain, nonfat)");
  await add("blueberries", "Blueberries");
  const builder = page.getByRole("dialog", { name: "Build a meal" });
  await expect(builder.locator(".big-number")).toHaveText("412");
  await expect(builder).toContainText(/Health score/);
  await builder.getByRole("button", { name: "Save meal" }).click();
  await builder.getByRole("button", { name: "Close" }).click();
  await page.getByRole("tab", { name: "My Meals" }).click();
  await expect(page.locator(".row", { hasText: "Overnight oats" })).toContainText("3 items · 412 kcal");
  await page.locator(".row", { hasText: "Overnight oats" }).getByRole("button", { name: /Log/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Overnight oats → Breakfast · 412 kcal" })).toBeVisible();

  // 5. Futsal with friends last night — log it without clocking in. 9.0 MET × 52 kg × 1 h = 468 kcal.
  await tab(page, "Train");
  await page.getByRole("button", { name: /Log activity/ }).click();
  await page.getByPlaceholder(/Search \d+ exercises/).fill("futsal");
  await page.locator(".row", { has: page.locator(".row-title", { hasText: /^Futsal$/ }) }).click();
  const activity = page.getByRole("dialog", { name: "Sports" });
  const duration = activity.locator(".row", { hasText: "Duration" });
  for (let i = 0; i < 6; i++) await duration.getByRole("button", { name: "Increase" }).click();
  await expect(duration).toContainText("60 min");
  await expect(duration).toContainText("468 kcal");
  await activity.getByRole("button", { name: "Log activity" }).click();
  const futsal = page.locator(".row.with-icon", { hasText: "Futsal" });
  await expect(futsal).toContainText("468 kcal");
  await expect(futsal).toContainText("1:00:00 · 1 exercise");
  await expect(futsal).not.toContainText("1 exercises");

  await tab(page, "Today");
  expect(await statValue(page, "Burned")).toBe(468);
  expect(await statValue(page, "Eaten")).toBe(732); // 320 + 412
  await expectNoHorizontalScroll(page);

  // 6. Start over: delete all data returns to onboarding.
  await tab(page, "Profile");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete all data" }).click();
  await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();
});

// ── When things go wrong ────────────────────────────────

test("Failures are explained, not silent", async ({ page }) => {
  await start(page);

  // Onboarding blocks impossible numbers.
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByLabel("Age").fill("");
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await page.getByLabel("Age").fill("30");
  await page.getByLabel("Weight").fill("5");
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await page.getByLabel("Weight").fill("70");
  await page.getByRole("button", { name: "Continue" }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: /Continue|Build my plan/ }).click();
  await page.getByRole("button", { name: "Skip" }).click();

  // Online search down → clear message, local results still work.
  await page.unroute("https://world.openfoodfacts.org/**");
  await page.route("https://world.openfoodfacts.org/**", (r) => r.abort());
  await tab(page, "Food");
  await page.getByLabel("Search foods").fill("milo");
  await expect(page.locator(".row-title", { hasText: /^Milo/ }).first()).toBeVisible();
  await expect(page.getByText("Online search unavailable right now.")).toBeVisible();

  // Online search up → packaged products appear and can be opened.
  await page.unroute("https://world.openfoodfacts.org/**");
  await page.route("https://world.openfoodfacts.org/**", (r) =>
    r.fulfill({
      json: {
        products: [
          {
            code: "9556001",
            product_name: "Milo 3in1 Activ-Go",
            brands: "Nestlé",
            serving_quantity: 33,
            serving_size: "1 sachet (33 g)",
            nutriments: { "energy-kcal_100g": 424, proteins_100g: 7, carbohydrates_100g: 74, fat_100g: 11, sugars_100g: 45, sodium_100g: 0.2 },
          },
        ],
      },
    }),
  );
  await page.getByLabel("Search foods").fill("milo 3in1");
  await page.locator(".row", { hasText: "Milo 3in1 Activ-Go" }).click();
  await expect(page.getByRole("dialog").locator(".big-number")).toHaveText("140"); // 33 g × 424 / 100
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
});

// ── Journey 3 ────────────────────────────────────────────

test("Farid: first-timer follows the guide, then uses Body check to set his plan", async ({ page }) => {
  await start(page, { fakeClock: false });
  await onboardWithoutSkipping(page);

  // 1. The guide opens by itself and walks through every part of the app.
  const guide = (title: string | RegExp) => page.getByRole("dialog", { name: title });
  await expect(guide("Welcome to W 👋")).toBeVisible();
  await page.getByRole("button", { name: "Show me" }).click();

  const expected: [string, string, string][] = [
    ["Your day at a glance", "Today", "summary"],
    ["Scan a barcode", "Today", "barcode"],
    ["Body check & BMI", "Today", "body-check"],
    ["Search any food", "Food", "food-search"],
    ["Build your own meals", "Food", "food-tools"],
    ["Clock in at the gym", "Train", "clock-in"],
    ["Log other activities", "Train", "log-activity"],
    ["Your training plan", "Plan", "split"],
    ["What to eat", "Plan", "plan-tabs"],
    ["Keep your profile up to date", "Profile", "field-weight"],
    ["Need help again?", "Today", "help"],
  ];
  for (const [i, [title, tabName, target]] of expected.entries()) {
    await expect(guide(title)).toBeVisible();
    await expect(guide(title)).toContainText(`Step ${i + 2} of 12`);
    await expect(page.getByRole("navigation").getByRole("button", { name: tabName, exact: true })).toHaveAttribute("aria-current", "page");
    // The highlighted feature is on screen, not scrolled away.
    await expect(page.locator(`[data-tour="${target}"]`)).toBeInViewport({ ratio: 0.5 });
    // The card never covers the feature it is pointing at.
    const [card, spot] = await Promise.all([guide(title).boundingBox(), page.locator(`[data-tour="${target}"]`).boundingBox()]);
    const overlap = Math.max(0, Math.min(card!.y + card!.height, spot!.y + spot!.height) - Math.max(card!.y, spot!.y));
    expect(overlap, `guide card covers "${target}"`).toBeLessThan(4);
    await expectNoHorizontalScroll(page);
    if (i === 3) {
      // Back goes to the previous step (and tab).
      await page.getByRole("button", { name: "Back" }).click();
      await expect(guide("Body check & BMI")).toBeVisible();
      await page.getByRole("button", { name: "Next" }).click();
      await expect(guide(title)).toBeVisible();
    }
    await page.getByRole("button", { name: i === expected.length - 1 ? "Done" : "Next" }).click();
  }
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // 2. It doesn't come back by itself…
  await page.reload();
  await expect(page.getByRole("heading", { name: /Good \w+, Farid/ })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // …but the ? button replays it any time.
  await page.getByRole("button", { name: "How to use the app" }).click();
  await expect(guide("Welcome to W 👋")).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // 3. Body check: 170 cm, 95 kg → BMI 32.9, obese; healthy range 54–66 kg.
  await page.getByRole("button", { name: /Body check · BMI/ }).click();
  const sheet = page.getByRole("dialog", { name: "Body check" });
  await sheet.getByLabel("Height").fill("170");
  await sheet.getByLabel("Weight").fill("95");
  await expect(sheet.getByTestId("bmi-value")).toHaveText("32.9");
  await expect(sheet).toContainText("Obese");
  await expect(sheet).toContainText("Healthy weight for 170 cm: 54–66 kg");
  await expect(sheet).toContainText("lose 29 kg");
  await expect(sheet).toContainText("Lose fat");
  await expect(sheet).toContainText(/low-impact cardio/);
  await expect(sheet).toContainText(/Full body/);

  // Typing nonsense explains the valid range instead of showing a wrong BMI.
  await sheet.getByLabel("Height").fill("17");
  await expect(sheet.getByRole("alert")).toContainText("between 120 and 230 cm");
  await expect(sheet.getByTestId("bmi-value")).toHaveCount(0);
  await sheet.getByLabel("Height").fill("170");

  // 4. Apply it: profile, Today and the training plan all update.
  await sheet.getByRole("button", { name: "Use this plan" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Plan updated" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Body check · BMI 32\.9/ })).toContainText("Obese");
  await tab(page, "Plan");
  await expect(page.locator(".chip.active", { hasText: "Full body" })).toBeVisible();
  await expect(page.locator(".field, .row", { hasText: "Days per week" }).locator(".stepper span")).toHaveText("3");
  await tab(page, "Profile");
  await expect(page.getByLabel("Weight")).toHaveValue("95");
  await expect(page.getByRole("button", { name: /Lose fat/ })).toHaveAttribute("aria-pressed", "true");

  // 5. Mid-workout the guide still works: it points at Clock out and skips "Log other activities".
  await tab(page, "Train");
  await page.locator('[data-tour="clock-in"]').click();
  await page.getByRole("button", { name: "How to use the app" }).click();
  await page.getByRole("button", { name: "Show me" }).click();
  for (let i = 0; i < 5; i++) await page.getByRole("button", { name: "Next" }).click();
  await expect(guide("Clock in at the gym")).toBeVisible();
  await expect(page.locator('[data-tour="clock-out"]')).toBeInViewport({ ratio: 0.5 });
  await page.getByRole("button", { name: "Next" }).click();
  await expect(guide("Your training plan")).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(guide("Clock in at the gym")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

async function onboardWithoutSkipping(page: Page) {
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByLabel("Name").fill("Farid");
  await page.getByLabel("Age").fill("30");
  await page.getByLabel("Height").fill("170");
  await page.getByLabel("Weight").fill("80");
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: /Continue|Build my plan/ }).click();
}

// ── Journey 4 ────────────────────────────────────────────

test("Nadia: no sign-up — adds a profile photo, backs up to a file and restores it on a new phone", async ({ page, browser }, info) => {
  await start(page, { fakeClock: false });

  // 1. No sign-in screen: straight from the guide to setting up a profile, with an optional photo.
  await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Sign up|Log in|Continue with/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByLabel("Profile photo", { exact: true }).setInputFiles({ name: "me.png", mimeType: "image/png", buffer: PHOTO });
  await expect(page.locator("img.avatar")).toBeVisible();
  await page.getByLabel("Name").fill("Nadia");
  await page.getByRole("tab", { name: "Female", exact: true }).click();
  await page.getByLabel("Age").fill("26");
  await page.getByLabel("Height").fill("158");
  await page.getByLabel("Weight").fill("55");
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: /Continue|Build my plan/ }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("heading", { name: /Good \w+, Nadia/ })).toBeVisible();
  // Her photo shows on Today.
  await expect(page.locator(".title-actions img.avatar")).toBeVisible();

  // 2. Log breakfast.
  await searchAndOpen(page, "teh tarik", "Teh tarik");
  await page.getByRole("dialog").getByRole("tab", { name: "Breakfast" }).click();
  await page.getByRole("button", { name: "Add to Breakfast" }).click();
  await tab(page, "Today");
  await expect(mealHeader(page, "Breakfast")).toContainText("185 kcal");

  // 3. Profile: change the photo is there; back up to a file.
  await tab(page, "Profile");
  await expect(page.getByRole("button", { name: "Change photo" })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Back up to a file/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^W-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const backup = (await file.path())!;
  await expectNoHorizontalScroll(page);

  // 4. A new phone: restore from the first setup page — no need to fill in a profile again.
  const phone2 = await browser.newContext({ ...info.project.use, baseURL: info.project.use.baseURL });
  const page2 = await phone2.newPage();
  await page2.route("https://world.openfoodfacts.org/**", (r) => r.fulfill({ json: { products: [] } }));
  await page2.goto("/");
  await page2.getByRole("button", { name: "Skip" }).click();
  page2.once("dialog", (d) => d.accept());
  await page2.getByLabel("Backup file").setInputFiles(backup);
  await expect(page2.getByRole("heading", { name: /Good \w+, Nadia/ })).toBeVisible();
  await expect(mealHeader(page2, "Breakfast")).toContainText("185 kcal");
  await expect(page2.locator(".title-actions img.avatar")).toBeVisible();

  // 5. Something that isn't a backup is refused, and nothing changes.
  await tab(page2, "Profile");
  await page2.getByLabel("Backup file").setInputFiles({ name: "notes.json", mimeType: "application/json", buffer: Buffer.from('{"hello":1}') });
  await expect(page2.getByRole("status").filter({ hasText: "That isn't a W backup file." })).toBeVisible();

  // 6. Removing the photo goes back to the initial.
  await page2.getByRole("button", { name: "Remove photo" }).click();
  await expect(page2.getByRole("button", { name: "Add a photo" })).toBeVisible();
  await phone2.close();
});

// ── Journey 5 ────────────────────────────────────────────

test("First launch: the step-by-step guide comes first and can be swiped, stepped through or skipped", async ({ page }) => {
  await start(page, { fakeClock: false, skipIntro: false });
  const guide = page.getByRole("region", { name: "Welcome guide" });
  await expect(guide).toBeVisible();
  await expect(guide.getByRole("button", { name: "Skip" })).toBeVisible();
  await expectNoHorizontalScroll(page);

  const titles = ["Search or scan your food", "Know if it's good for you", "Clock in at the gym", "A plan made for your body", "For you and your family"];
  const current = (i: number) => guide.getByRole("heading", { name: titles[i] });

  // Next walks through every page; the visible page is fully on screen.
  for (let i = 0; i < titles.length; i++) {
    await expect(guide).toContainText(`${i + 1} of ${titles.length}`);
    await expect(current(i)).toBeInViewport({ ratio: 0.9 });
    await expect(guide.getByRole("tab", { name: `Page ${i + 1}: ${titles[i]}` })).toHaveAttribute("aria-selected", "true");
    if (i < titles.length - 1) await guide.getByRole("button", { name: "Next" }).click();
  }
  await expect(guide.getByRole("button", { name: "Get started" })).toBeVisible();

  // Back, dots, and swiping all move between pages.
  await guide.getByRole("button", { name: "Back" }).click();
  await expect(current(3)).toBeInViewport({ ratio: 0.9 });
  await guide.getByRole("tab", { name: /Page 1:/ }).click();
  await expect(current(0)).toBeInViewport({ ratio: 0.9 });
  const box = (await page.locator(".intro-viewport").boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(current(1)).toBeInViewport({ ratio: 0.9 });
  await expect(guide).toContainText("2 of 5");

  // Finishing goes to setting up a profile; the guide doesn't come back after a reload.
  await guide.getByRole("tab", { name: /Page 5:/ }).click();
  await guide.getByRole("button", { name: "Get started" }).click();
  await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Welcome guide" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();
});

test("First launch: Skip goes straight to setting up a profile", async ({ page }) => {
  await start(page, { fakeClock: false, skipIntro: false });
  await page.getByRole("region", { name: "Welcome guide" }).getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Restore it" })).toBeVisible();
});

// ── Journey 6 ────────────────────────────────────────────

test("Hafiz: customises his nasi lemak — extra egg, no peanuts, add rendang", async ({ page }) => {
  await start(page);
  await onboard(page, { name: "Hafiz", sex: "Male", age: "31", height: "175", weight: "80", goal: /Build muscle/, activity: /Moderately active/, experience: /Intermediate/, days: 4, diet: "Halal" });

  await searchAndOpen(page, "nasi lemak", "Nasi lemak (with sambal, egg, anchovies, peanuts)");
  const sheet = page.getByRole("dialog").first();
  const parts = sheet.getByTestId("dish-parts");
  // The standard plate and what's in it.
  await expect(sheet.locator(".big-number")).toHaveText("506");
  for (const part of ["Coconut rice", "Sambal", "Boiled egg", "Ikan bilis", "Peanuts", "Cucumber"]) await expect(parts).toContainText(part);
  await expect(parts.locator(".row", { hasText: "Sambal" })).toContainText("2 tbsp");
  await expect(parts.locator(".row", { hasText: "Boiled egg" })).toContainText("½ egg");

  // Whole egg instead of half, no peanuts, plus a portion of beef rendang.
  await parts.getByRole("button", { name: "More Boiled egg" }).click();
  await expect(parts.locator(".row", { hasText: "Boiled egg" })).toContainText("1 egg");
  await parts.getByRole("button", { name: "Less Peanuts" }).click();
  await parts.getByRole("button", { name: "Less Peanuts" }).click();
  await expect(parts.locator(".row", { hasText: "Peanuts" })).toContainText("Not included");
  await parts.getByRole("button", { name: "Add an ingredient" }).click();
  const picker = page.getByRole("dialog", { name: "Add food" });
  await picker.getByPlaceholder("Search foods").fill("rendang");
  await picker.locator(".row", { hasText: "Beef rendang" }).click();
  await expect(parts).toContainText("Beef rendang");
  await expect(sheet.locator(".big-number")).toHaveText("715");
  await expect(sheet).toContainText("Changed: Boiled egg: 1 egg · no Peanuts · + Beef rendang");

  // Two plates for a big day; Reset puts the standard recipe back.
  await sheet.getByRole("button", { name: "More servings" }).click();
  await expect(sheet.locator(".big-number")).toHaveText("1430");
  await sheet.getByRole("button", { name: "Less servings" }).click();
  await sheet.getByRole("tab", { name: "Lunch" }).click();
  await sheet.getByRole("button", { name: "Add to Lunch" }).click();

  // Today shows the customised dish and what changed.
  await tab(page, "Today");
  const row = page.locator(".row", { hasText: "Nasi lemak (with sambal, egg, anchovies, peanuts) (customised)" });
  await expect(row).toContainText("Boiled egg: 1 egg · no Peanuts · + Beef rendang");
  await expect(row).toContainText("715");
  await expect(mealHeader(page, "Lunch")).toContainText("715 kcal");

  // Reset restores the standard plate.
  await searchAndOpen(page, "nasi lemak", "Nasi lemak (with sambal, egg, anchovies, peanuts)");
  await page.getByTestId("dish-parts").getByRole("button", { name: "Less Sambal" }).click();
  await expect(page.getByRole("dialog").first().locator(".big-number")).not.toHaveText("506");
  await page.getByRole("dialog").first().getByRole("button", { name: /Reset/ }).click();
  await expect(page.getByRole("dialog").first().locator(".big-number")).toHaveText("506");
  await expectNoHorizontalScroll(page);
});

// ── Journey 7 ────────────────────────────────────────────

test("Appearance: phone setting, light or dark, chosen with symbols only", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await start(page, { fakeClock: false });
  await onboard(page, { name: "Wei", sex: "Female", age: "26", height: "158", weight: "50", goal: /Maintain/, activity: /Lightly active/, experience: /New to the gym/, days: 3, diet: "Anything" });
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  // Follows the phone by default (dark here).
  expect(await bg()).toBe("rgb(0, 0, 0)");
  await tab(page, "Profile");
  const control = page.getByRole("tablist", { name: "Appearance" });
  await expect(control.getByRole("tab", { name: "Match phone setting" })).toHaveAttribute("aria-selected", "true");
  // Symbols only: no words on the buttons.
  expect((await control.innerText()).trim()).toBe("");

  await control.getByRole("tab", { name: "Light" }).click();
  await expect.poll(bg).toBe("rgb(242, 242, 247)");
  await page.reload();
  await expect.poll(bg).toBe("rgb(242, 242, 247)"); // remembered

  await page.emulateMedia({ colorScheme: "light" });
  await tab(page, "Profile");
  await page.getByRole("tablist", { name: "Appearance" }).getByRole("tab", { name: "Dark" }).click();
  await expect.poll(bg).toBe("rgb(0, 0, 0)");
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute("content", "#000000");

  await page.getByRole("tablist", { name: "Appearance" }).getByRole("tab", { name: "Match phone setting" }).click();
  await expect.poll(bg).toBe("rgb(242, 242, 247)");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(bg).toBe("rgb(0, 0, 0)"); // switches live with the phone
  await expectNoHorizontalScroll(page);
});

test("A dish can take your own custom food as an extra (regression: used to crash)", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page, { fakeClock: false });
  await onboard(page, { name: "Siti", sex: "Female", age: "30", height: "160", weight: "55", goal: /Maintain/, activity: /Lightly active/, experience: /New to the gym/, days: 3, diet: "Halal" });
  await tab(page, "Food");
  await page.getByRole("button", { name: "New food" }).first().click();
  await page.getByPlaceholder("Food name").fill("Mak's sambal sotong");
  await page.getByLabel("Serving size", { exact: true }).fill("100");
  await page.getByLabel("Calories", { exact: true }).fill("180");
  await page.getByRole("button", { name: "Save" }).click();

  await searchAndOpen(page, "nasi lemak", "Nasi lemak (with sambal, egg, anchovies, peanuts)");
  await page.getByTestId("dish-parts").getByRole("button", { name: "Add an ingredient" }).click();
  const picker = page.getByRole("dialog", { name: "Add food" });
  await picker.getByPlaceholder("Search foods").fill("sotong");
  await picker.locator(".row", { hasText: "Mak's sambal sotong" }).click();
  await expect(page.getByTestId("dish-parts")).toContainText("Mak's sambal sotong");
  await expect(page.getByRole("dialog").first().locator(".big-number")).toHaveText("686"); // 506 + 180
  expect(errors).toEqual([]);
});
