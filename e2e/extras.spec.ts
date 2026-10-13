import { expect, test, type Page } from "@playwright/test";
import { PHOTO_URL, dayKey, seedState } from "./support/audit";

// Journeys for the on-phone extras: faster logging, steps, check-in, supplements, weekly report,
// training tools, GPS runs, meal planner, body tracking, pregnancy mode, badges and text size.
// Runs on iPhone 14, iPhone SE and Pixel 7, and fails on any page error.

const IGNORED_CONSOLE = /openfoodfacts|ERR_TUNNEL|ERR_INTERNET|Failed to load resource/;

async function open(page: Page, state: object = seedState(), opts: { steps?: number } = {}) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`page error: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !IGNORED_CONSOLE.test(m.text()) && errors.push(`console: ${m.text().slice(0, 200)}`));
  await page.route("https://world.openfoodfacts.org/**", (r) => r.fulfill({ json: { products: [] } }));
  await page.addInitScript(
    ({ s, steps }) => {
      if (typeof steps === "number") (globalThis as { __wSteps?: number }).__wSteps = steps;
      try {
        if (location.protocol.startsWith("http") && !sessionStorage.getItem("seeded")) {
          localStorage.setItem("calories-detector:v1", s);
          sessionStorage.setItem("seeded", "1");
        }
      } catch {
        // about:blank has no storage
      }
    },
    { s: JSON.stringify(state), steps: opts.steps },
  );
  await page.goto("/");
  await expect(page.getByRole("navigation")).toBeVisible();
  return errors;
}

const tab = (page: Page, name: string) => page.getByRole("navigation").getByRole("button", { name, exact: true }).click();
const sheet = (page: Page, name: string) => page.getByRole("dialog", { name });
const close = async (page: Page) => {
  await page.getByRole("dialog").last().getByRole("button", { name: "Close", exact: true }).click();
};
const kcalLeft = async (page: Page) => Number((await page.locator("[data-tour=summary] .stat-value").first().innerText()).replace(/\D/g, ""));

test("Faster logging: quick add, saying a meal, copying yesterday's breakfast and favourites", async ({ page }) => {
  const state = seedState();
  state.log.push({ id: "y1", date: dayKey(-1), meal: "dinner", name: "Roti canai", grams: 120, nutrients: { kcal: 360, protein: 8, carbs: 46, fat: 16, fiber: 2, sugar: 2, satFat: 6, sodium: 450 }, source: "db", createdAt: 1 });
  const errors = await open(page, state);

  // Quick add: just a number.
  await page.getByRole("button", { name: /Quick add/ }).click();
  const qa = sheet(page, "Quick add");
  await qa.getByLabel("Name").fill("Office kuih");
  await qa.getByLabel("Calories").fill("230");
  await qa.getByRole("tab", { name: "Snack" }).click();
  await qa.getByRole("button", { name: "Add to Snack" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Added Office kuih · 230 kcal" })).toBeVisible();
  await expect(page.getByText("Office kuih", { exact: true })).toBeVisible();

  // Say (type) a meal in Malay: two foods with amounts.
  await page.getByRole("button", { name: /Say it/ }).click();
  const voice = sheet(page, "Say what you ate");
  await voice.getByPlaceholder("Or type it here").fill("dua roti canai dan teh tarik");
  await voice.getByRole("button", { name: "Find foods" }).click();
  const matches = voice.getByTestId("voice-matches");
  await expect(matches.locator(".row")).toHaveCount(2);
  await expect(matches).toContainText("Roti canai");
  await expect(matches).toContainText("Teh tarik");
  await voice.getByRole("tab", { name: "Lunch" }).click();
  await voice.getByRole("button", { name: "Log 2 foods" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Logged 2 foods to Lunch/ })).toBeVisible();

  // Yesterday's dinner, copied in one tap, and undone.
  const copy = page.getByRole("button", { name: "Copy yesterday's Dinner" });
  await copy.scrollIntoViewIfNeeded();
  await copy.click();
  await expect(page.getByRole("status").filter({ hasText: "Copied yesterday's Dinner · 1 foods" })).toBeVisible();
  await page.getByRole("status").getByRole("button", { name: "Undo" }).click();
  await expect(copy).toBeVisible();

  // Star a food and find it under Favourites.
  await tab(page, "Food");
  await page.getByLabel("Search foods").fill("teh tarik");
  await page.locator(".row", { hasText: "Teh tarik" }).first().click();
  await page.getByRole("button", { name: "Add to favourites" }).click();
  await expect(page.getByRole("button", { name: "Remove from favourites" })).toHaveAttribute("aria-pressed", "true");
  await close(page);
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByRole("tab", { name: "Favourites" }).click();
  await expect(page.getByTestId("favorites")).toContainText("Teh tarik");
  expect(errors).toEqual([]);
});

test("Daily habits: steps add to the budget, morning check-in, supplements ticked off", async ({ page }) => {
  const errors = await open(page, seedState(), { steps: 8234 });
  // Steps: turn the counter on, then let walking count toward the budget.
  const steps = page.getByTestId("steps-card");
  await steps.getByRole("button", { name: "Turn on" }).click();
  await expect(steps).toContainText("8,234 steps");
  const before = await kcalLeft(page);
  await tab(page, "Profile");
  await page.getByRole("switch", { name: "Add walking to my budget" }).click();
  await tab(page, "Today");
  // 8,234 steps × 61 kg × 0.0005 ≈ 251 kcal more to eat.
  await expect.poll(() => kcalLeft(page)).toBe(before + 251);

  // Morning check-in.
  const checkin = page.getByTestId("checkin");
  await checkin.getByRole("button", { name: "More sleep" }).click();
  await checkin.getByRole("radio", { name: "Mood 4 of 5" }).click();
  await checkin.getByRole("radio", { name: "Energy 3 of 5" }).click();
  await checkin.getByRole("button", { name: "Save check-in" }).click();
  await expect(page.getByTestId("checkin")).toContainText("Slept 7.5 h");
  await expect(page.getByTestId("checkin")).toContainText("energy 3/5");

  // Supplements: added in Profile, ticked off on Today.
  await tab(page, "Profile");
  await page.getByRole("button", { name: /Supplements & medicine/ }).click();
  const sup = sheet(page, "Supplements & medicine");
  await sup.getByLabel("Name").fill("Vitamin D");
  await sup.getByLabel("Dose").fill("1 capsule");
  await sup.getByLabel("Time").fill("08:00");
  await sup.getByRole("button", { name: "Add" }).click();
  await expect(sup).toContainText("Vitamin D");
  await close(page);
  await tab(page, "Today");
  const today = page.getByTestId("supplements-today");
  await expect(today).toContainText("Vitamin D");
  await today.getByRole("checkbox", { name: /Vitamin D/ }).click();
  await expect(today.getByRole("checkbox", { name: /Vitamin D/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Supplements & medicine · 1/1")).toBeVisible();
  expect(errors).toEqual([]);
});

test("Weekly report: averages against targets, best and toughest day, and a tip", async ({ page }) => {
  const state = seedState();
  for (let i = 1; i <= 5; i++)
    state.log.push({ id: `w${i}`, date: dayKey(-i), meal: "lunch", name: "Nasi goreng", grams: 400, nutrients: { kcal: 700 + i * 150, protein: 20, carbs: 100, fat: 25, fiber: 3, sugar: 8, satFat: 6, sodium: 1400 }, source: "db", createdAt: i });
  const errors = await open(page, state);
  await page.getByRole("button", { name: /Weekly report/ }).click();
  const report = sheet(page, "Weekly report");
  await expect(report).toContainText("6 of 7 days logged");
  await expect(report.getByTestId("report-tip")).toContainText("Next week");
  await expect(report).toContainText("Best day");
  await expect(report).toContainText("Toughest day");
  await expect(report).toContainText("Daily average");
  await expect(report.getByTestId("sleep-insight")).toContainText("morning check-in");
  expect(errors).toEqual([]);
});

test("Training tools: plates, 1-rep max, a superset routine with warm-ups, strength chart and calendar", async ({ page }) => {
  const state = seedState();
  const set = (kg: number, reps: number) => ({ reps, weightKg: kg, done: true });
  state.sessions.push(
    ...[40, 45, 50].map((kg, i) => ({
      id: `b${i}`,
      date: dayKey(-21 + i * 7),
      title: "Push",
      startedAt: Date.now() - (21 - i * 7) * 86400000,
      endedAt: Date.now() - (21 - i * 7) * 86400000 + 3600000,
      exercises: [{ id: `be${i}`, exerciseId: "s-0", name: "Barbell bench press", kind: "strength" as const, met: 6, sets: [set(kg, 8), set(kg, 8)] }],
      kcal: 250,
    })),
  );
  const errors = await open(page, state);
  await tab(page, "Train");

  // Plates for 100 kg on a 20 kg bar: 25 + 15 a side.
  await page.getByRole("button", { name: /Gym tools/ }).click();
  const tools = sheet(page, "Gym tools");
  await tools.getByLabel("Working weight").fill("100");
  await expect(tools.getByTestId("plates")).toContainText("Each side: 25 + 15 kg");
  await tools.getByRole("tab", { name: "1-rep max" }).click();
  await tools.getByLabel("Weight lifted").fill("100");
  await tools.getByRole("button", { name: "More reps" }).click(); // 6 reps
  // 100 kg × 6: Epley 120, Brzycki 116.1 → 118.1 kg.
  await expect(tools.getByTestId("one-rm")).toHaveText("118.1 kg");
  await tools.getByRole("tab", { name: "Warm-up" }).click();
  await expect(tools.getByTestId("warmups")).toContainText("20 kg × 10");
  await close(page);

  // A routine with a superset.
  await page.getByTestId("routines").scrollIntoViewIfNeeded();
  await page.locator(".section-header", { hasText: "My routines" }).getByRole("button", { name: "New" }).click();
  const editor = sheet(page, "New routine");
  await editor.getByLabel("Name").fill("Arms superset");
  for (const q of ["barbell curl", "triceps pushdown"]) {
    await editor.getByRole("button", { name: "Add exercise" }).click();
    const lib = page.getByRole("dialog").last();
    await lib.getByPlaceholder(/Search .* exercises/).fill(q);
    await lib.locator(".row").first().click();
    await page.getByRole("dialog").last().getByRole("button", { name: "Add to routine" }).click();
  }
  await editor.getByRole("switch", { name: /Superset .* with the one above/ }).click();
  await editor.getByRole("button", { name: "Save routine" }).click();
  await expect(page.getByTestId("routines")).toContainText("Arms superset");
  await expect(page.getByTestId("routines")).toContainText("A·");

  // Start it: both exercises are in superset A; finishing a set of the first moves on with no rest timer.
  await page.getByTestId("routines").getByRole("button", { name: "Start" }).click();
  await expect(page.locator(".superset-tag").first()).toHaveText("Superset A");
  await expect(page.locator(".superset-tag")).toHaveCount(2);
  const first = page.locator(".card", { has: page.locator(".superset-tag") }).first();
  await first.getByLabel("Set 1 weight").fill("30");
  await first.getByRole("button", { name: "Add 2 warm-up sets" }).click();
  await expect(first.locator(".set-grid").getByText("W", { exact: true })).toHaveCount(2);
  await first.getByRole("button", { name: "Mark set done" }).nth(2).click();
  await expect(page.getByRole("status").filter({ hasText: /Superset: on to/ })).toBeVisible();
  await expect(page.locator(".rest-bar")).toHaveCount(0);
  await page.getByRole("button", { name: "Clock out" }).click();
  await sheet(page, "Clock out").getByRole("button", { name: "Finish workout" }).click();

  // Strength chart and the workout calendar.
  await tab(page, "Train");
  await expect(page.getByTestId("workout-calendar")).toContainText(/\d+ training days in 12 weeks/);
  await page.getByRole("button", { name: /Strength progress/ }).click();
  await expect(sheet(page, "Strength progress").getByTestId("strength-chart").locator("svg")).toBeVisible();
  expect(errors).toEqual([]);
});

test("GPS run: start, move, pause, finish, and it's saved with distance and pace", async ({ page, context }) => {
  test.setTimeout(120_000);
  await context.grantPermissions(["geolocation"]);
  const start = { latitude: 3.139, longitude: 101.6869 };
  await context.setGeolocation({ ...start, accuracy: 5 });
  const errors = await open(page);
  await tab(page, "Train");
  await page.getByRole("button", { name: /Track a run/ }).click();
  const run = sheet(page, "Track a run");
  await run.getByRole("button", { name: "Start" }).click();
  // About 25 m north every 3 seconds: a brisk jog.
  for (let i = 1; i <= 12; i++) {
    await page.waitForTimeout(3000);
    await context.setGeolocation({ latitude: start.latitude + i * 0.000225, longitude: start.longitude, accuracy: 5 });
  }
  await expect.poll(async () => Number((await run.getByTestId("run-stats").locator(".stat-value").first().innerText()).replace(/[^\d.]/g, ""))).toBeGreaterThan(0.15);
  // Closing the sheet mid-run doesn't stop or lose the run.
  await close(page);
  await expect(page.getByRole("status").filter({ hasText: "Your run keeps going" })).toBeVisible();
  await page.getByRole("button", { name: /Track a run/ }).click();
  await expect(run.getByRole("button", { name: "Pause" })).toBeVisible();
  await run.getByRole("button", { name: "Pause" }).click();
  // About 40 seconds, not decades (a pause once added the time since 1970).
  const time = run.getByTestId("run-stats").locator(".stat-value").nth(1);
  await expect(time).toHaveText(/^0:[3-5]\d$|^1:[0-2]\d$/);
  await page.waitForTimeout(2500);
  await expect(time).toHaveText(/^0:[3-5]\d$|^1:[0-2]\d$/);
  await run.getByRole("button", { name: "Finish and save" }).click();
  const saved = page.getByRole("status").filter({ hasText: /Saved 0\.\d\d km/ });
  await expect(saved).toBeVisible();
  expect(Number((await saved.innerText()).match(/(\d+) kcal/)![1])).toBeLessThan(60);
  await expect(page.locator(".row", { hasText: "Run" }).first()).toContainText("km");
  expect(errors).toEqual([]);
});

test("Meal planner: plan two days, log a planned meal, and tick off the grocery list", async ({ page }) => {
  const errors = await open(page);
  await tab(page, "Plan");
  await page.getByRole("tab", { name: "Meal planner" }).click();
  const addTo = async (meal: string, food: string) => {
    await page.getByRole("button", { name: `Plan a food for ${meal}` }).click();
    const picker = sheet(page, "Add food");
    await picker.getByPlaceholder("Search foods").fill(food);
    await picker.locator(".row").first().click();
  };
  await addTo("Breakfast", "oats");
  await addTo("Lunch", "chicken rice");
  await expect(page.locator(".plan-total")).toContainText("kcal");
  // Log today's planned breakfast.
  await page.locator(".section-header", { hasText: "Breakfast" }).getByRole("button", { name: "Log it" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Logged Breakfast from your plan/ })).toBeVisible();
  // Tomorrow (or Monday's next day) gets oats too: the grocery list adds them up.
  const days = page.locator(".day-strip button");
  const sel = await days.evaluateAll((els) => els.findIndex((e) => e.getAttribute("aria-selected") === "true"));
  await days.nth(sel < 6 ? sel + 1 : sel - 1).click();
  await addTo("Breakfast", "oats");
  await page.getByRole("button", { name: "Grocery list for the week" }).click();
  const list = sheet(page, "Grocery list").getByTestId("grocery");
  await expect(list.getByRole("checkbox")).toHaveCount(2);
  const oats = list.getByRole("checkbox").first();
  await oats.click();
  await expect(oats).toHaveAttribute("aria-checked", "true");
  expect(errors).toEqual([]);
});

test("Body: measurements give a body-fat estimate, and two progress photos can be compared", async ({ page }) => {
  const state = seedState();
  state.profile = { ...state.profile, sex: "male", name: "Arif", cycle: { on: false, length: 28, periodDays: 5, remind: true } } as typeof state.profile;
  const errors = await open(page, state);
  await page.getByRole("button", { name: /streaks Progress$/ }).click();
  const progress = sheet(page, "Progress");
  await progress.getByLabel("Waist").fill("84");
  await progress.getByLabel("Neck").fill("38");
  await progress.getByRole("button", { name: "Save measurements" }).click();
  await expect(progress.getByTestId("body-fat")).toContainText(/Body fat about 1\d(\.\d)?%/);
  // Two photos (a tiny PNG each), then the before/after slider appears.
  const png = Buffer.from(PHOTO_URL.split(",")[1], "base64");
  for (let i = 0; i < 2; i++) await progress.getByLabel("Progress photo").setInputFiles({ name: `p${i}.png`, mimeType: "image/png", buffer: png });
  await expect(progress.locator(".photo-thumb")).toHaveCount(2);
  await expect(progress.getByTestId("photo-compare")).toBeVisible();
  await progress.getByLabel("Slide to compare before and after").fill("20");
  expect(errors).toEqual([]);
});

test("Pregnancy mode raises the targets and pauses cycle tracking; badges and a challenge", async ({ page }) => {
  const errors = await open(page);
  const before = await kcalLeft(page);
  await tab(page, "Profile");
  await page.getByRole("radio", { name: "Pregnant · 2nd trimester" }).click();
  await expect(page.getByText(/maintenance plus 340 kcal/)).toBeVisible();
  await expect(page.getByRole("switch", { name: "Track my cycle" })).toHaveAttribute("aria-checked", "false");
  await tab(page, "Today");
  // The lose-weight deficit is gone and 340 kcal added: much more to eat today.
  expect(await kcalLeft(page)).toBeGreaterThan(before + 340);

  await tab(page, "Profile");
  await page.getByRole("button", { name: /Badges & challenges/ }).click();
  const badges = sheet(page, "Badges & challenges");
  await expect(badges.getByTestId("badges")).toContainText("First bite");
  const water = badges.getByTestId("challenges").locator(".row", { hasText: "7 days of water" });
  await water.getByRole("button", { name: "Join" }).click();
  await expect(water).toContainText("Day 1 of 7");
  expect(errors).toEqual([]);
});

test("Text size: extra large reflows Today without sideways scrolling", async ({ page }) => {
  const errors = await open(page);
  await tab(page, "Profile");
  await page.getByRole("tab", { name: "Extra large" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-text", "xlarge");
  await tab(page, "Today");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test("A barcode scanned once still works offline", async ({ page }) => {
  const errors = await open(page);
  let online = true;
  await page.route("https://world.openfoodfacts.org/api/v2/product/**", (r) =>
    online
      ? r.fulfill({ json: { status: 1, product: { code: "9556001234567", product_name: "Milo 3in1", brands: "Nestlé", serving_quantity: 33, serving_size: "1 sachet (33 g)", nutriments: { "energy-kcal_100g": 412, proteins_100g: 7.5, carbohydrates_100g: 74, fat_100g: 9, sugars_100g: 50 } } } })
      : r.abort(),
  );
  const scan = async () => {
    await page.locator('[data-tour="barcode"]').click();
    const s = sheet(page, "Scan barcode");
    await s.getByLabel("Barcode number").fill("9556001234567");
    await s.getByRole("button", { name: "Look up" }).click();
  };
  await scan();
  await expect(page.getByRole("heading", { name: "Milo 3in1" })).toBeVisible();
  await close(page);
  online = false;
  await scan();
  await expect(page.getByRole("heading", { name: "Milo 3in1" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("Meal ideas: swap, like, never again, log it, and preferences that change the picks", async ({ page }) => {
  const state = seedState();
  // Only breakfast logged, so there's room for lunch, dinner or a snack (whichever is still ahead).
  state.log = state.log.filter((e) => e.meal === "breakfast");
  const errors = await open(page, state);
  const card = page.getByTestId("meal-ideas");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toContainText("Meal ideas for today");
  const title = card.getByTestId("idea-title");
  const first = await title.innerText();
  // Halal profile: nothing with pork or alcohol.
  expect(first).not.toMatch(/pork|bacon|\bham\b|wine|beer|char siu/i);

  // Another idea: a different dish.
  await card.getByRole("button", { name: "Another idea" }).click();
  await expect(title).not.toHaveText(first);
  const second = await title.innerText();

  // Like it: remembered, and pressed.
  await card.getByRole("button", { name: "I like this" }).click();
  await expect(card.getByRole("button", { name: "I like this" })).toHaveAttribute("aria-pressed", "true");

  // Never again: gone, with Undo.
  await card.getByRole("button", { name: "Another idea" }).click();
  const third = await title.innerText();
  await card.getByRole("button", { name: "Don't suggest this again" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Won't suggest/ })).toBeVisible();
  await expect(title).not.toHaveText(third);

  // Log it: the day's calories go down by the idea's calories.
  const before = await kcalLeft(page);
  const ideaKcal = Number((await card.getByTestId("idea-macros").innerText()).match(/^(\d+)/)![1]);
  await card.getByRole("button", { name: "Log it" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Logged to/ })).toBeVisible();
  await expect.poll(() => kcalLeft(page)).toBe(before - ideaKcal);

  // Preferences: lower carb, Japanese, something new.
  await card.getByRole("button", { name: "Meal idea settings" }).click();
  const s = sheet(page, "Meal ideas");
  await s.getByRole("radio", { name: /Lower carb/ }).click();
  await s.getByRole("button", { name: "Japanese", exact: true }).click();
  await expect(s.getByRole("button", { name: "Japanese", exact: true })).toHaveAttribute("aria-pressed", "true");
  await s.getByRole("tab", { name: "Something new" }).click();
  await expect(s).toContainText(second);
  await expect(s).toContainText(third);
  await s.getByRole("button", { name: "Restore" }).click();
  await expect(s.getByText("Not suggested")).toHaveCount(0);
  await s.getByRole("button", { name: "Close", exact: true }).click();
  await expect(card).toContainText("Lower carb · Japanese · Something new");

  // Turned off: the card goes, and Profile says so.
  await card.getByRole("button", { name: "Meal idea settings" }).click();
  await sheet(page, "Meal ideas").getByRole("switch", { name: "Show meal ideas on Today" }).click();
  await sheet(page, "Meal ideas").getByRole("button", { name: "Close", exact: true }).click();
  await expect(card).toHaveCount(0);
  await tab(page, "Profile");
  await expect(page.getByRole("button", { name: /Meal ideas\s*Off/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("Meal ideas respect a vegan diet and allergies", async ({ page }) => {
  const state = seedState();
  state.log = [];
  Object.assign(state.profile, { diet: "vegan", allergies: ["peanuts", "soy"] });
  const errors = await open(page, state);
  const card = page.getByTestId("meal-ideas");
  await card.scrollIntoViewIfNeeded();
  for (let i = 0; i < 6; i++) {
    const text = (await card.locator(".idea-title, .idea-items").allInnerTexts()).join("\n");
    expect(text).not.toMatch(/chicken|beef|lamb|fish|prawn|egg|cheese|yogurt|milk(?! \()|tofu|soy|tempeh|edamame|peanut/i);
    await card.getByRole("button", { name: "Another idea" }).click();
  }
  expect(errors).toEqual([]);
});

test("Meal ideas in the morning: one idea per meal still ahead", async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${dayKey(0)}T09:00:00+08:00`));
  const state = seedState();
  state.log = [];
  state.sessions = [];
  const errors = await open(page, state);
  const card = page.getByTestId("meal-ideas");
  await card.scrollIntoViewIfNeeded();
  const chips = card.getByRole("tab");
  await expect(chips).toHaveText(["Breakfast", "Lunch", "Dinner", "Snack"]);
  await expect(chips.first()).toHaveAttribute("aria-selected", "true");
  const breakfast = await card.getByTestId("idea-title").innerText();
  await chips.nth(2).click();
  await expect(card.getByTestId("idea-title")).not.toHaveText(breakfast);
  await card.getByRole("button", { name: "Log it" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Logged to Dinner" })).toBeVisible();
  // Dinner is logged, so its chip goes.
  await expect(chips).toHaveText(["Breakfast", "Lunch", "Snack"]);
  expect(errors).toEqual([]);
});

test("Training splits: more split types, train at home, swap an exercise, and my own split", async ({ page }) => {
  const errors = await open(page);
  await tab(page, "Plan");
  // Chest & triceps, back & biceps, legs & shoulders.
  await page.getByRole("button", { name: "Chest & Tri · Back & Bi · Legs" }).click();
  await expect(page.getByText("Chest & Triceps", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Back & Biceps", { exact: true }).first()).toBeVisible();

  // Open the chest day and swap its first exercise.
  await page.getByRole("button", { name: /Chest & Triceps/ }).first().click();
  const swap = page.getByRole("button", { name: /^Swap / }).first();
  const before = (await swap.getAttribute("aria-label"))!.replace(/^Swap /, "");
  await swap.click();
  const sheet = page.getByRole("dialog", { name: "Swap exercise" });
  await sheet.getByLabel("Search exercises").fill("machine chest press");
  await sheet.getByTestId("swap-list").getByRole("button", { name: /Machine chest press/ }).first().click();
  await expect(page.getByRole("button", { name: "Swap Machine chest press" })).toBeVisible();
  expect(before).not.toBe("Machine chest press");
  // And back to the suggestion.
  await page.getByRole("button", { name: "Swap Machine chest press" }).click();
  await sheet.getByRole("button", { name: "Back to the suggested exercise" }).click();
  await expect(page.getByRole("button", { name: `Swap ${before}` })).toBeVisible();

  // At home without weights: no barbells or machines.
  await page.getByRole("tab", { name: "Home, no weights" }).click(); // labelled "Home"
  const names = await page.getByRole("button", { name: /^Swap / }).evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")!.replace(/^Swap /, "")));
  expect(names.length).toBeGreaterThanOrEqual(5);
  for (const n of names) expect(n).not.toMatch(/barbell|machine|cable|pec deck|smith/i);

  // My own split: pick the muscle groups for each day.
  await page.getByRole("button", { name: "My own split", exact: true }).click();
  const editor = page.getByTestId("custom-split");
  await expect(editor).toBeVisible();
  const day1 = editor.getByRole("group", { name: "Muscle groups for day 1" });
  await day1.getByRole("button", { name: "Glutes", exact: true }).click();
  await expect(day1.getByRole("button", { name: "Glutes", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(editor.locator(".card").first()).toContainText("Chest, Triceps & Glutes");

  // Clock in from the plan: the session uses the plan's exercises.
  await page.getByRole("tab", { name: "Gym" }).click();
  await page.getByRole("button", { name: /Chest, Triceps & Glutes/ }).first().click();
  const planned = await page.getByRole("button", { name: /^Swap / }).first().getAttribute("aria-label");
  await page.getByRole("button", { name: "Clock in & start" }).first().click();
  await expect(page.getByText(planned!.replace(/^Swap /, ""), { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});
