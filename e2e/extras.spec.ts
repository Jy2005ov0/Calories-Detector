import { expect, test, type Locator, type Page } from "@playwright/test";
import { PHOTO_URL, dayKey, seedState } from "./support/audit";
import { finger, fingerSwipe } from "./support/touch";

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
  await qa.getByLabel("Name").filter({ visible: true }).fill("Office kuih");
  await qa.getByLabel("Calories").filter({ visible: true }).fill("230");
  await qa.getByRole("tab", { name: "Snack" }).click();
  await qa.getByRole("button", { name: "Add to Snack" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Added Office kuih · 230 kcal" })).toBeVisible();
  await expect(page.getByText("Office kuih", { exact: true }).filter({ visible: true })).toBeVisible();

  // Say (type) a meal in Malay: two foods with amounts.
  await page.getByRole("button", { name: /Say it/ }).click();
  const voice = sheet(page, "Say what you ate");
  await voice.getByPlaceholder("Or type it here").fill("dua roti canai dan teh tarik");
  await voice.getByRole("button", { name: "Find foods" }).click();
  const matches = voice.getByTestId("voice-matches");
  await expect(matches.locator(".row:visible")).toHaveCount(2);
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
  await page.getByLabel("Search foods").filter({ visible: true }).fill("teh tarik");
  await page.locator(".row:visible", { hasText: "Teh tarik" }).first().click();
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

  // Morning check-in: drag the moon on the sleep clock from 11 pm to about midnight,
  // then nudge the sun half an hour later from the keyboard.
  const checkin = page.getByTestId("checkin");
  const clock = checkin.getByTestId("sleep-clock");
  await clock.scrollIntoViewIfNeeded();
  const box = (await clock.boundingBox())!;
  const moon = checkin.getByRole("slider", { name: "Bedtime" });
  const m = (await moon.boundingBox())!;
  await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2);
  await page.mouse.down();
  // Midnight is straight up from the centre.
  await page.mouse.move(box.x + box.width / 2, box.y + 20, { steps: 8 });
  await page.mouse.up();
  await expect(moon).toHaveAttribute("aria-valuenow", /^(0|5|1435)$/);
  // Arrow keys move a handle 5 minutes (Page Up/Down an hour).
  const wake = checkin.getByRole("slider", { name: "Wake up" });
  await wake.focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowUp");
  await expect(wake).toHaveAttribute("aria-valuetext", /7:30/);
  await checkin.getByRole("radio", { name: "Mood 4 of 5" }).click();
  await checkin.getByRole("radio", { name: "Energy 3 of 5" }).click();
  await checkin.getByRole("button", { name: "Save check-in" }).click();
  await expect(page.getByTestId("checkin")).toContainText(/Slept 7 h (2|3)\d min/);
  await expect(page.getByTestId("checkin")).toContainText("7:30");
  await expect(page.getByTestId("checkin")).toContainText("energy 3/5");

  // Supplements: added in Profile, ticked off on Today.
  await tab(page, "Profile");
  await page.getByRole("button", { name: /Supplements & medicine/ }).click();
  const sup = sheet(page, "Supplements & medicine");
  await sup.getByLabel("Name").filter({ visible: true }).fill("Vitamin D");
  await sup.getByLabel("Dose").filter({ visible: true }).fill("1 capsule");
  await sup.getByLabel("Time").filter({ visible: true }).fill("08:00");
  await sup.getByRole("button", { name: "Add" }).click();
  await expect(sup).toContainText("Vitamin D");
  await close(page);
  await tab(page, "Today");
  const today = page.getByTestId("supplements-today");
  await expect(today).toContainText("Vitamin D");
  await today.getByRole("checkbox", { name: /Vitamin D/ }).click();
  await expect(today.getByRole("checkbox", { name: /Vitamin D/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Supplements & medicine · 1/1").filter({ visible: true })).toBeVisible();
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
  await tools.getByLabel("Working weight").filter({ visible: true }).fill("100");
  await expect(tools.getByTestId("plates")).toContainText("Each side: 25 + 15 kg");
  await tools.getByRole("tab", { name: "1-rep max" }).click();
  await tools.getByLabel("Weight lifted").filter({ visible: true }).fill("100");
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
  await editor.getByLabel("Name").filter({ visible: true }).fill("Arms superset");
  for (const q of ["barbell curl", "triceps pushdown"]) {
    await editor.getByRole("button", { name: "Add exercise" }).click();
    const lib = page.getByRole("dialog").last();
    await lib.getByPlaceholder(/Search .* exercises/).fill(q);
    await lib.locator(".row:visible").first().click();
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
  const first = page.locator(".card:visible", { has: page.locator(".superset-tag") }).first();
  await first.getByLabel("Set 1 weight").filter({ visible: true }).fill("30");
  await first.getByRole("button", { name: "Add 2 warm-up sets" }).click();
  await expect(first.locator(".set-grid").getByText("W", { exact: true }).filter({ visible: true })).toHaveCount(2);
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
  await expect(page.locator(".row:visible", { hasText: "Run" }).first()).toContainText("km");
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
    await picker.locator(".row:visible").first().click();
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
  await progress.getByLabel("Waist").filter({ visible: true }).fill("84");
  await progress.getByLabel("Neck").filter({ visible: true }).fill("38");
  await progress.getByRole("button", { name: "Save measurements" }).click();
  await expect(progress.getByTestId("body-fat")).toContainText(/Body fat about 1\d(\.\d)?%/);
  // Two photos (a tiny PNG each), then the before/after slider appears.
  const png = Buffer.from(PHOTO_URL.split(",")[1], "base64");
  for (let i = 0; i < 2; i++) await progress.getByLabel("Progress photo").setInputFiles({ name: `p${i}.png`, mimeType: "image/png", buffer: png });
  await expect(progress.locator(".photo-thumb")).toHaveCount(2);
  await expect(progress.getByTestId("photo-compare")).toBeVisible();
  await progress.getByLabel("Slide to compare before and after").filter({ visible: true }).fill("20");
  expect(errors).toEqual([]);
});

test("Pregnancy mode raises the targets and pauses cycle tracking; badges and a challenge", async ({ page }) => {
  const errors = await open(page);
  const before = await kcalLeft(page);
  await tab(page, "Profile");
  await page.getByRole("radio", { name: "Pregnant · 2nd trimester" }).click();
  await expect(page.getByText(/maintenance plus 340 kcal/).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Track my cycle" })).toHaveAttribute("aria-checked", "false");
  await tab(page, "Today");
  // The lose-weight deficit is gone and 340 kcal added: much more to eat today.
  expect(await kcalLeft(page)).toBeGreaterThan(before + 340);

  await tab(page, "Profile");
  await page.getByRole("button", { name: /Badges & challenges/ }).click();
  const badges = sheet(page, "Badges & challenges");
  await expect(badges.getByTestId("badges")).toContainText("First bite");
  const water = badges.getByTestId("challenges").locator(".row:visible", { hasText: "7 days of water" });
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
    await s.getByLabel("Barcode number").filter({ visible: true }).fill("9556001234567");
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
  await expect(s.getByText("Not suggested").filter({ visible: true })).toHaveCount(0);
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
  await expect(page.getByText("Chest & Triceps", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Back & Biceps", { exact: true }).filter({ visible: true }).first()).toBeVisible();

  // Open the chest day and swap its first exercise.
  await page.getByRole("button", { name: /Chest & Triceps/ }).first().click();
  const swap = page.getByRole("button", { name: /^Swap / }).first();
  const before = (await swap.getAttribute("aria-label"))!.replace(/^Swap /, "");
  await swap.click();
  const sheet = page.getByRole("dialog", { name: "Swap exercise" });
  await sheet.getByLabel("Search exercises").filter({ visible: true }).fill("machine chest press");
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
  await expect(editor.locator(".card:visible").first()).toContainText("Chest, Triceps & Glutes");

  // Clock in from the plan: the session uses the plan's exercises.
  await page.getByRole("tab", { name: "Gym" }).click();
  await page.getByRole("button", { name: /Chest, Triceps & Glutes/ }).first().click();
  const planned = await page.getByRole("button", { name: /^Swap / }).first().getAttribute("aria-label");
  await page.getByRole("button", { name: "Clock in & start" }).first().click();
  await expect(page.getByText(planned!.replace(/^Swap /, ""), { exact: true }).filter({ visible: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

/** Press and hold an element, then drag it onto another one. */
async function holdAndDrag(page: Page, from: Locator, to: Locator) {
  await to.scrollIntoViewIfNeeded();
  await from.scrollIntoViewIfNeeded();
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + Math.min(30, a.height / 2));
  await page.mouse.down();
  await page.waitForTimeout(600);
  const y = b.y + Math.min(20, b.height / 3);
  await page.mouse.move(a.x + a.width / 2, y, { steps: 15 });
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(400);
}

test("Plan: press and hold to put shoulders before legs and exercises in my own order; tap an exercise to see how it's done", async ({ page }) => {
  const errors = await open(page);
  await tab(page, "Plan");
  await page.getByRole("button", { name: "Body-part split", exact: true }).click();
  const days = page.getByTestId("plan-day");
  const dayTitles = () => page.locator("[data-testid=plan-day] .day-title").allInnerTexts();
  const before = await dayTitles();
  const legs = before.indexOf("Leg Day");
  expect(legs).toBeLessThan(before.indexOf("Shoulder Day"));
  // Close the open day so the cards are short.
  const opened = page.locator("[data-testid=plan-day] [aria-expanded=true]");
  if (await opened.count()) await opened.first().click();

  // Press and hold Shoulder Day, drag it onto Leg Day.
  await holdAndDrag(page, days.filter({ hasText: "Shoulder Day" }), days.filter({ hasText: "Leg Day" }));
  const after = await dayTitles();
  expect(after.indexOf("Shoulder Day")).toBe(legs);
  expect(after.indexOf("Leg Day")).toBe(legs + 1);
  // Holding didn't open the day.
  await expect(days.filter({ hasText: "Shoulder Day" }).getByRole("button", { expanded: true })).toHaveCount(0);

  // A quick swipe is still a scroll, not a move.
  await page.mouse.wheel(0, 200);
  expect(await dayTitles()).toEqual(after);

  // Exercises: hold the first and drag it below the second.
  await days.filter({ hasText: "Shoulder Day" }).getByRole("button", { expanded: false }).first().click();
  const rows = days.filter({ hasText: "Shoulder Day" }).getByTestId("plan-exercise");
  const names = () => rows.getByRole("button", { name: /^How to do / }).evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")!.replace(/^How to do /, "")));
  const [first, second, third] = await names();
  await holdAndDrag(page, rows.nth(0), rows.nth(1).locator(".row-sub").first());
  expect((await names()).slice(0, 2)).toEqual([second, first]);
  // From the keyboard too: Alt + ↓.
  await rows.nth(1).getByRole("button", { name: `How to do ${first}` }).focus();
  await page.keyboard.press("Alt+ArrowDown");
  expect((await names()).slice(0, 3)).toEqual([second, third, first]);

  // Kept after a reload.
  await page.reload();
  await tab(page, "Plan");
  expect((await dayTitles()).indexOf("Shoulder Day")).toBe(legs);

  // A tap on an exercise opens its page: how to do it, and a way to swap it.
  const shoulder = days.filter({ hasText: "Shoulder Day" });
  if (!(await shoulder.getByRole("button", { expanded: true }).count())) await shoulder.getByRole("button", { expanded: false }).first().click();
  await shoulder.getByRole("button", { name: `How to do ${second}` }).click();
  const detail = page.getByRole("dialog").last();
  await expect(detail.getByRole("heading", { name: second })).toBeVisible();
  await expect(detail.getByText("In your plan").filter({ visible: true })).toBeVisible();
  await expect(detail.getByText("Muscles", { exact: true }).filter({ visible: true })).toBeVisible();
  await detail.getByRole("button", { name: "Swap for another exercise" }).click();
  await expect(sheet(page, "Swap exercise")).toBeVisible();
  await close(page);

  // Back to the suggested order.
  await page.getByRole("button", { name: "Suggested order" }).click();
  expect(await dayTitles()).toEqual(before);
  expect(errors).toEqual([]);
});

test("My own exercise: create it from a search, train with it, swap it into the plan, rename and delete it", async ({ page }) => {
  const errors = await open(page);
  await tab(page, "Train");
  await page.locator("[data-tour=clock-in]").click();
  await page.getByRole("button", { name: "Add exercise" }).click();
  const lib = sheet(page, "Exercises");
  await lib.getByPlaceholder(/Search .* exercises/).fill("Garage bar row");
  await lib.getByTestId("create-exercise").click();

  const form = sheet(page, "New exercise");
  await expect(form.getByLabel("Name").filter({ visible: true })).toHaveValue("Garage bar row");
  await form.getByRole("group", { name: "Main muscle" }).getByRole("button", { name: "Back", exact: true }).click();
  await form.getByRole("group", { name: "Equipment" }).getByRole("button", { name: "Barbell", exact: true }).click();
  await form.getByLabel("Note").filter({ visible: true }).fill("Elbows tight to the ribs");
  await form.getByRole("button", { name: "Create exercise" }).click();

  // Its own page, then into the workout.
  const detail = sheet(page, "Your exercise");
  await expect(detail.getByRole("heading", { name: "Garage bar row" })).toBeVisible();
  await expect(detail.getByText("Elbows tight to the ribs").filter({ visible: true })).toBeVisible();
  await detail.getByRole("button", { name: "Add to workout" }).click();
  await expect(page.getByText("Garage bar row", { exact: true }).filter({ visible: true }).first()).toBeVisible();

  // A library name can't be reused.
  await page.getByRole("button", { name: "Add exercise" }).click();
  await lib.getByRole("tab", { name: "Strength" }).waitFor();
  await lib.getByRole("button", { name: "My exercises", exact: true }).click();
  await expect(lib.getByRole("button", { name: /Garage bar row/ })).toBeVisible();
  await lib.getByTestId("create-exercise").click();
  const again = sheet(page, "New exercise");
  await again.getByLabel("Name").filter({ visible: true }).fill("Pull-up");
  await expect(again.getByRole("alert")).toContainText("already in the library");
  await expect(again.getByRole("button", { name: "Create exercise" })).toBeDisabled();
  await close(page);
  await close(page);

  // In the plan's swap list for back exercises, first.
  await tab(page, "Plan");
  await page.getByRole("button", { name: "Chest & Tri · Back & Bi · Legs" }).click();
  await page.getByRole("button", { name: /Back & Biceps/ }).first().click();
  await page.getByRole("button", { name: /^Swap / }).first().click();
  const swap = sheet(page, "Swap exercise");
  await swap.getByTestId("swap-list").getByRole("button", { name: /Garage bar row/ }).first().click();
  await expect(page.getByRole("button", { name: "Swap Garage bar row" })).toBeVisible();

  // Rename it: the plan follows. Then delete it: the plan goes back to its suggestion.
  await page.getByRole("navigation").getByRole("button", { name: /^Train/ }).click();
  await page.getByRole("button", { name: "Add exercise" }).click();
  await lib.getByRole("button", { name: "My exercises", exact: true }).click();
  await lib.getByRole("button", { name: /Garage bar row/ }).click();
  await detail.getByRole("button", { name: "Edit", exact: true }).click();
  const edit = sheet(page, "Edit exercise");
  await edit.getByLabel("Name").filter({ visible: true }).fill("Garage pendlay row");
  await edit.getByRole("button", { name: "Save", exact: true }).click();
  await expect(detail.getByRole("heading", { name: "Garage pendlay row" })).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await detail.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(lib.getByText("Exercises you create show up here.").filter({ visible: true })).toBeVisible();
  await close(page);
  // The workout keeps the exercise under its new name.
  await expect(page.getByText("Garage pendlay row", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await tab(page, "Plan");
  await page.getByRole("button", { name: /Back & Biceps/ }).first().click();
  await expect(page.getByRole("button", { name: "Swap Garage pendlay row" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Steps inside the calorie card with water right after it, and the library has thousands of exercises in every language", async ({ page }) => {
  const state = { ...seedState(), profile: { ...seedState().profile, stepsOn: true } };
  const errors = await open(page, state, { steps: 4200 });
  // Steps sit inside the calorie summary card, and water logging comes straight after it.
  const summary = page.locator(".card:visible", { has: page.locator("[data-tour=summary]") });
  await expect(summary.getByTestId("steps-card")).toContainText("4,200 steps");
  const next = await summary.evaluate((el) => el.nextElementSibling?.getAttribute("data-tour"));
  expect(next).toBe("water");
  await page.getByRole("button", { name: /^Add \d+ ml of water$/ }).click();

  await tab(page, "Train");
  await page.getByRole("button", { name: /Exercise library/ }).click();
  const lib = page.getByRole("dialog").last();
  const search = lib.getByRole("textbox").first();
  const placeholder = (await search.getAttribute("placeholder"))!;
  expect(Number(placeholder.replace(/\D/g, ""))).toBeGreaterThan(6000);
  await search.fill("incline close-grip barbell bench press, paused");
  await expect(lib.locator(".row:visible", { hasText: "Incline close-grip barbell bench press, paused" }).first()).toBeVisible();
  await close(page);

  // The same variation in Chinese.
  await tab(page, "Profile");
  await page.getByRole("button", { name: "中文" }).click();
  await page.getByRole("navigation").getByRole("button").nth(2).click();
  await page.getByRole("button", { name: /动作库|Exercise library|运动库/ }).first().click();
  const zh = page.getByRole("dialog").last();
  await zh.getByRole("textbox").first().fill("上斜窄握杠铃卧推");
  await expect(zh.locator(".row:visible", { hasText: "上斜窄握杠铃卧推（停顿）" }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

/** Drag the page with a finger-like pointer from one point to another. */
async function drag(page: Page, from: [number, number], to: [number, number], steps = 12) {
  await page.mouse.move(from[0], from[1]);
  await page.mouse.down();
  await page.mouse.move(to[0], to[1], { steps });
  await page.mouse.up();
  await page.waitForTimeout(450);
}
const current = (page: Page) => page.getByRole("navigation").locator("[aria-current=page]").innerText();

test("Swipe between tabs: left and right, not past the ends, and never by accident", async ({ page }) => {
  const errors = await open(page);
  const { width, height } = page.viewportSize()!;
  const mid = Math.round(height * 0.45);
  const left = (): Promise<void> => drag(page, [width - 40, mid], [40, mid + 6]);
  const right = (): Promise<void> => drag(page, [40, mid], [width - 40, mid + 6]);

  expect(await current(page)).toMatch(/^Today/);
  await left();
  expect(await current(page)).toMatch(/^Food/);
  await left();
  expect(await current(page)).toMatch(/^Train/);
  await right();
  expect(await current(page)).toMatch(/^Food/);
  await right();
  expect(await current(page)).toMatch(/^Today/);
  // Nothing before Today: it springs back.
  await right();
  expect(await current(page)).toMatch(/^Today/);
  // And nothing after Profile.
  await tab(page, "Profile");
  await left();
  expect(await current(page)).toMatch(/^Profile/);
  await tab(page, "Today");

  // Up-and-down is a scroll, a short nudge sideways is nothing.
  await drag(page, [width / 2, height * 0.75], [width / 2 - 30, height * 0.25]);
  expect(await current(page)).toMatch(/^Today/);
  await drag(page, [width / 2, mid], [width / 2 - 30, mid]);
  expect(await current(page)).toMatch(/^Today/);

  // Swiping a logged food left deletes it (with Undo), and stays on Today.
  const row = page.locator(".swipe-row").first();
  await row.scrollIntoViewIfNeeded();
  const rows = await page.locator(".swipe-row").count();
  const b = (await row.boundingBox())!;
  await drag(page, [b.x + b.width - 30, b.y + b.height / 2], [b.x + 20, b.y + b.height / 2], 10);
  expect(await current(page)).toMatch(/^Today/);
  await expect(page.locator(".swipe-row")).toHaveCount(rows - 1);
  await page.getByRole("status").getByRole("button", { name: "Undo" }).click();
  await expect(page.locator(".swipe-row")).toHaveCount(rows);

  // A row of chips scrolls sideways without changing tab.
  await tab(page, "Plan");
  const chips = page.locator("[data-tour=split]");
  const c = (await chips.boundingBox())!;
  await drag(page, [c.x + c.width - 20, c.y + c.height / 2], [c.x + 20, c.y + c.height / 2]);
  expect(await current(page)).toMatch(/^Plan/);

  // A swipe that starts on a button doesn't press it.
  await tab(page, "Food");
  const food = page.locator("button.row:visible").first();
  const f = (await food.boundingBox())!;
  await drag(page, [f.x + f.width - 20, f.y + f.height / 2], [20, f.y + f.height / 2]);
  expect(await current(page)).toMatch(/^Train/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("My own calorie target: set it from Today, it changes the day and the plan, and back to automatic", async ({ page }) => {
  const errors = await open(page);
  const before = await kcalLeft(page);
  const target = page.getByRole("button", { name: /^Daily target \d+ kcal, change$/ });
  const auto = Number((await target.getAttribute("aria-label"))!.replace(/\D/g, ""));
  await target.click();
  const editor = sheet(page, "Daily calorie target");
  await expect(editor.getByRole("tab", { name: "Automatic" })).toHaveAttribute("aria-selected", "true");
  await expect(editor).toContainText(auto.toLocaleString("en"));

  // My own: type 2,000.
  await editor.getByRole("tab", { name: "My own" }).click();
  const box = editor.getByRole("textbox", { name: "Calories a day" });
  await box.fill("2000");
  await box.blur();
  await expect(editor).toContainText(`Suggested for your goal: ${auto.toLocaleString("en")} kcal`);
  // Too low: a warning; Use it puts the suggestion back.
  await box.fill("1000");
  await box.blur();
  await expect(editor.getByRole("alert")).toContainText("doctor");
  await editor.getByRole("button", { name: "Use it" }).click();
  await expect(box).toHaveValue(String(auto));
  await expect(editor.getByRole("alert")).toHaveCount(0);
  // The slider works too: Home/End keys and arrows.
  const slider = editor.getByRole("slider", { name: "Calories a day" });
  await slider.focus();
  await page.keyboard.press("End");
  await expect(box).toHaveValue("4500");
  await box.fill("2000");
  await box.blur();
  await close(page);

  // Today counts down from the new target.
  await expect(page.getByRole("button", { name: "Daily target 2000 kcal, change" })).toContainText("My target");
  await expect.poll(() => kcalLeft(page)).toBe(before + (2000 - auto));

  // The nutrition plan says it's your own; it's kept after a reload.
  await page.reload();
  await tab(page, "Plan");
  await page.getByRole("tab", { name: "Nutrition" }).click();
  await expect(page.getByText("You set this target yourself.").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("2,000", { exact: true }).filter({ visible: true }).first()).toBeVisible();

  // Back to automatic from Profile.
  await tab(page, "Profile");
  const inProfile = page.getByTestId("kcal-target");
  await inProfile.getByRole("tab", { name: "Automatic" }).click();
  await tab(page, "Today");
  await expect(page.getByRole("button", { name: `Daily target ${auto} kcal, change` })).toBeVisible();
  await expect.poll(() => kcalLeft(page)).toBe(before);
  expect(errors).toEqual([]);
});

test("Water cup: tap to drink, Undo, hold to take a cup back, and from the keyboard", async ({ page }) => {
  const errors = await open(page);
  const water = page.getByTestId("water").first();
  await water.scrollIntoViewIfNeeded();
  await expect(water).toContainText("2.5 of");
  const cupBtn = water.getByRole("button", { name: "Add 250 ml of water" });
  await cupBtn.click();
  await expect(water).toContainText("2.75 of");
  await page.getByRole("status").getByRole("button", { name: "Undo" }).click();
  await expect(water).toContainText("2.5 of");
  // Two quick taps are two cups.
  await cupBtn.click();
  await cupBtn.click();
  await expect(water).toContainText("3 of");
  // Hold: one cup back, and the hold isn't also a tap.
  await cupBtn.hover();
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  await expect(water).toContainText("2.75 of");
  await page.waitForTimeout(300);
  await expect(water).toContainText("2.75 of");
  // Keyboard: Tab to the hidden Remove button, which shows when focused.
  const remove = water.getByRole("button", { name: "Remove 250 ml of water" });
  await remove.focus();
  await expect(remove).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(water).toContainText("2.5 of");
  expect(errors).toEqual([]);
});

test("Finger swipes (real touch) turn the page at natural angles on every tab, even on a long list; a steep swipe scrolls", async ({ page }) => {
  const errors = await open(page);
  const { width, height } = page.viewportSize()!;
  const names = ["Today", "Food", "Train", "Plan", "Profile"];
  const at = async () => (await current(page)).split("\n")[0].replace(/Workout in progress/, "").trim();
  // Thumb swipes are rarely flat: 0°, ~20°, ~35° and ~40°, up and down.
  const slopes = [0, 0.36, -0.7, 0.84];
  let k = 0;
  for (let i = 0; i < names.length - 1; i++) {
    expect(await at()).toBe(names[i]);
    // Mid-screen, clear of the chip rows near the top (those scroll sideways first).
    const y = height * (0.5 + 0.06 * (i % 3));
    const dx = width * 0.6;
    await fingerSwipe(page, [width * 0.8, y], [width * 0.2, y + dx * slopes[k++ % slopes.length]]);
    expect(await at(), `swipe left from ${names[i]}`).toBe(names[i + 1]);
  }
  for (let i = names.length - 1; i > 0; i--) {
    const y = height * (0.5 + 0.06 * (i % 3));
    const dx = width * 0.6;
    await fingerSwipe(page, [width * 0.2, y], [width * 0.8, y + dx * slopes[k++ % slopes.length]]);
    expect(await at(), `swipe right from ${names[i]}`).toBe(names[i - 1]);
  }

  // A row of chips scrolls first; once it's at its end, the next swipe turns the page.
  await tab(page, "Plan");
  const chips = page.locator("[data-tour=split]");
  const cb = (await chips.boundingBox())!;
  const cy = cb.y + cb.height / 2;
  await fingerSwipe(page, [width * 0.8, cy], [width * 0.3, cy + 6]);
  expect(await at()).toBe("Plan");
  expect(await chips.evaluate((el) => el.scrollLeft)).toBeGreaterThan(40);
  await chips.evaluate((el) => (el.scrollLeft = el.scrollWidth));
  await fingerSwipe(page, [width * 0.8, cy], [width * 0.2, cy + 6]);
  expect(await at()).toBe("Profile");

  // Food, scrolled down its long list: still turns to Train.
  await tab(page, "Food");
  await page.getByRole("tab", { name: "Browse" }).click();
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(300);
  await fingerSwipe(page, [width * 0.85, height * 0.5], [width * 0.15, height * 0.5 - 90]);
  expect(await at()).toBe("Train");

  // A steep swipe (about 60°) is a scroll: the page moves, the tab stays.
  await tab(page, "Food");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await fingerSwipe(page, [width * 0.7, height * 0.75], [width * 0.4, height * 0.25]);
  expect(await at()).toBe("Food");
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  // A tap still taps.
  await page.locator("button.row:visible").first().tap();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("Family: swipe the photo on Today down to switch to the next person, and again to switch back", async ({ page }) => {
  const errors = await open(page);
  const { width, height } = page.viewportSize()!;
  const title = page.locator(".large-title:visible").first();
  await expect(title).toContainText("Aisyah");
  const avatar = page.getByTestId("avatar-switch").filter({ visible: true });
  const pill = page.getByTestId("avatar-switch-pill");
  const at = async () => {
    const b = (await avatar.boundingBox())!;
    return [b.x + b.width / 2, b.y + b.height / 2] as const;
  };

  // Pulling the page itself down no longer switches anyone.
  await fingerSwipe(page, [width / 2, height * 0.3], [width / 2, height * 0.3 + 260]);
  await expect(title).toContainText("Aisyah");

  // Pull the photo a little: it says who's next; let go early and nothing changes.
  let [x, y] = await at();
  let f = await finger(page);
  await f.down(x, y);
  await f.move(x + 2, y + 30);
  await expect(pill).toHaveText("Puan Rohana binti Ismail (Mum)");
  await f.up();
  await expect(pill).toHaveCount(0);
  await expect(title).toContainText("Aisyah");

  // Pull it far enough: "Let go for Mum"; letting go switches, on Today.
  f = await finger(page);
  await f.down(x, y);
  await f.move(x - 3, y + 90);
  await expect(pill).toHaveText("Let go for Puan Rohana binti Ismail (Mum)");
  await f.up();
  await expect(title).toContainText("Puan Rohana");
  await expect(page.getByRole("status")).toContainText("Now using W as Puan Rohana binti Ismail (Mum)");
  expect(await current(page)).toMatch(/^Today/);
  expect(await page.getByRole("dialog").count()).toBe(0);

  // And again: back to Aisyah.
  [x, y] = await at();
  await fingerSwipe(page, [x, y], [x + 4, y + 110], { steps: 12, ms: 240 });
  await expect(title).toContainText("Aisyah");

  // A tap on the photo still shows everyone.
  await avatar.tap();
  await expect(page.getByRole("dialog")).toContainText("Puan Rohana");
  await page.getByRole("button", { name: "Close" }).filter({ visible: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Sideways from the page still turns the tab, not the person.
  await fingerSwipe(page, [width * 0.8, height * 0.4], [width * 0.2, height * 0.4 + 20]);
  await expect.poll(() => current(page)).toMatch(/^Food/);
  expect(errors).toEqual([]);
});

test("Swiping the photo down works with a mouse too, and let go off the screen springs back", async ({ page }) => {
  const errors = await open(page, seedState());
  const title = page.locator(".large-title:visible").first();
  const box = (await page.getByTestId("avatar-switch").filter({ visible: true }).boundingBox())!;
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  // Pulled, then dragged off the top and let go there: nothing switches and the photo is back.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 30, { steps: 5 });
  await page.mouse.move(x, -20, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  await expect(title).toContainText("Aisyah");
  await expect(page.getByTestId("avatar-switch-pill")).toHaveCount(0);
  await drag(page, [x, y], [x + 2, y + 120], 12);
  await expect(title).toContainText("Puan Rohana");
  expect(errors).toEqual([]);
});

test("Swiping your photo down when you're the only person does nothing", async ({ page }) => {
  const state = { ...seedState(), people: [] };
  const errors = await open(page, state);
  const avatar = page.getByTestId("avatar-switch").filter({ visible: true });
  // The photo shows (it has one) but there's no one to switch to.
  if (await avatar.count()) {
    const b = (await avatar.boundingBox())!;
    await fingerSwipe(page, [b.x + 18, b.y + 18], [b.x + 18, b.y + 140]);
    await expect(page.getByTestId("avatar-switch-pill")).toHaveCount(0);
  }
  await expect(page.locator(".large-title:visible").first()).toContainText("Aisyah");
  expect(errors).toEqual([]);
});

test("Mid-swipe the next screen is already there, moving in with the finger", async ({ page }) => {
  const errors = await open(page);
  const { width, height } = page.viewportSize()!;
  await page.waitForTimeout(900); // the screens either side get ready once nothing's moving
  const f = await finger(page);
  await f.down(width * 0.85, height * 0.45);
  await f.move(width * 0.45, height * 0.45 + 6, 8);
  // Food's page shows beside Today's, each moved by the finger's distance.
  const food = page.locator(".page[data-peek]");
  await expect(food).toHaveCount(1);
  await expect(food.locator(".large-title")).toBeVisible();
  const shift = (sel: string) => page.locator(sel).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
  const cur = await shift(".page.current");
  expect(cur).toBeLessThan(-width * 0.3);
  expect(Math.abs((await shift(".page[data-peek]")) - (cur + width))).toBeLessThan(2);
  await f.up();
  await expect.poll(() => current(page)).toMatch(/^Food/);
  // Once it's turned: one page, in place, nothing peeking, no sideways scrolling.
  await expect(page.locator(".page[data-peek]")).toHaveCount(0);
  expect(Math.abs(await shift(".page.current"))).toBeLessThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.classList.contains("swiping"))).toBe(false);
  expect(errors).toEqual([]);
});

test("A swipe never leaves the page stuck: let go off the screen, or the thing under the finger goes away", async ({ page }) => {
  const errors = await open(page);
  const { width, height } = page.viewportSize()!;
  const offset = () => page.locator(".page.current").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
  // Mouse: drag sideways, then out past the edge and let go there.
  await page.mouse.move(width - 40, height * 0.45);
  await page.mouse.down();
  await page.mouse.move(width * 0.45, height * 0.45 + 4, { steps: 10 });
  await page.mouse.move(width + 30, height * 0.45 + 4, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  expect(Math.abs(await offset())).toBeLessThan(1);
  expect(await current(page)).toMatch(/^Today/);

  // Finger: start on a food row, which then disappears mid-swipe. The browser sends the rest of that
  // finger's events to the removed row, out of the app's sight, so the swipe is called off and the
  // page springs back into place (and the next swipe works as normal).
  await tab(page, "Food");
  const row = page.locator("button.row:visible").first();
  const b = (await row.boundingBox())!;
  const f = await finger(page);
  await f.down(b.x + b.width * 0.8, b.y + b.height / 2);
  await f.move(b.x + b.width * 0.5, b.y + b.height / 2 + 4, 4);
  await row.evaluate((el) => el.remove());
  await f.move(b.x + 10, b.y + b.height / 2 + 8, 6);
  await f.up();
  await page.waitForTimeout(900);
  expect(Math.abs(await offset())).toBeLessThan(1);
  expect(await current(page)).toMatch(/^Food/);
  await fingerSwipe(page, [width * 0.8, height * 0.5], [width * 0.2, height * 0.5 + 10]);
  expect(await current(page)).toMatch(/^Train/);
  expect(errors).toEqual([]);
});
