import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";

// User journeys for barcode scanning, progress, fasting, allergies, rest timer and
// personal records, export, reminders and languages. Runs on iPhone 14, iPhone SE and Pixel 7.

const MONDAY_8AM = new Date("2026-10-12T08:00:00+08:00");

async function start(page: Page) {
  await page.clock.install({ time: MONDAY_8AM });
  await page.clock.resume();
  await page.route("https://world.openfoodfacts.org/**", (r) => r.fulfill({ json: { products: [] } }));
  await page.goto("/");
  await page.getByRole("region", { name: "Welcome guide" }).getByRole("button", { name: "Skip" }).click();
}

async function advance(page: Page, ms: number) {
  const now = await page.evaluate(() => Date.now());
  await page.clock.setSystemTime(new Date(now + ms));
}

const tab = (page: Page, name: string) => page.getByRole("navigation").getByRole("button", { name, exact: true }).click();
const sheet = (page: Page, name: string) => page.getByRole("dialog", { name });

async function onboard(page: Page, name: string, opts: { sex?: "Male" | "Female"; weight?: string; diet?: string } = {}) {
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByLabel("Name").fill(name);
  await page.getByRole("tab", { name: opts.sex ?? "Female", exact: true }).click();
  await page.getByLabel("Age").fill("28");
  await page.getByLabel("Height").fill("160");
  await page.getByLabel("Weight").fill(opts.weight ?? "64");
  // Only women are asked about period tracking.
  await expect(page.getByRole("switch", { name: "Track my period?" })).toHaveCount(opts.sex === "Male" ? 0 : 1);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Lose fat/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Moderately active/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Intermediate/ }).click();
  await page.locator(".chip", { hasText: opts.diet ?? "Anything" }).click();
  await page.getByRole("button", { name: "Build my plan" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`Good \\w+, ${name}`) })).toBeVisible();
}

test("Siti: halal, peanut allergy and Ramadan — warnings, filters, sahur/iftar and a safe meal plan", async ({ page }) => {
  await start(page);
  await onboard(page, "Siti", { diet: "Halal" });

  await tab(page, "Profile");
  await page.getByRole("button", { name: "Peanuts", exact: true }).click();
  await expect(page.getByRole("button", { name: "Peanuts", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("tab", { name: "Ramadan" }).click();
  await expect(page.getByLabel("Iftar (maghrib)")).toHaveValue("19:20");

  // Today: the fast card counts down to iftar, and meals become Sahur / Iftar / Moreh.
  await tab(page, "Today");
  await expect(page.getByTestId("fast-card")).toContainText("Iftar in 11h 20m");
  for (const m of ["Sahur", "Iftar", "Moreh"]) await expect(page.locator(".section-header", { hasText: new RegExp(`^${m}`) })).toBeVisible();
  await expect(page.locator(".section-header", { hasText: /^Lunch/ })).toHaveCount(0);

  // Food: satay (peanut sauce) and pork dishes are hidden until she chooses to see them.
  await tab(page, "Food");
  await page.getByLabel("Search foods").fill("satay");
  await expect(page.locator(".row-title", { hasText: /^Satay/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Hiding foods you avoid/ }).click();
  const satay = page.locator(".row", { hasText: "Satay (chicken)" });
  await expect(satay.locator(".avoid-flag")).toHaveAttribute("aria-label", /Usually contains peanuts/);
  await satay.click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Usually contains peanuts");
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();

  await page.getByLabel("Search foods").fill("char siu");
  await page.locator(".row", { hasText: "Char siu (BBQ pork)" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Not halal · contains pork");
  // The verdict agrees with the warning instead of calling it a good fit.
  await expect(page.getByRole("dialog")).toContainText("Not suitable for you");
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();

  // Plan: the sample day is sahur, iftar (with dates) and moreh, with nothing she avoids.
  await tab(page, "Plan");
  await page.getByRole("tab", { name: "Nutrition" }).click();
  await expect(page.locator(".card", { hasText: "Sahur" }).first()).toBeVisible();
  await expect(page.locator(".card", { hasText: "Iftar" }).first()).toContainText("Dates");
  await expect(page.locator(".card", { hasText: "Moreh" }).first()).toBeVisible();
  await expect(page.getByText("a 15% deficit (gentler during Ramadan)", { exact: false })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Peanut butter ·");
  await expect(page.getByText("Break your fast with water and 2–3 dates", { exact: false })).toBeVisible();
});

test("Wei: scans a barcode, logs it, tracks water and weight, and builds a streak", async ({ page }) => {
  await start(page);
  await onboard(page, "Wei", { sex: "Male", weight: "82" });

  const product = {
    status: 1,
    product: {
      code: "9556001234567",
      product_name: "Milo 3in1",
      brands: "Nestlé",
      serving_quantity: 33,
      serving_size: "1 sachet (33 g)",
      nutriments: { "energy-kcal_100g": 412, proteins_100g: 7.5, carbohydrates_100g: 74, fat_100g: 9, sugars_100g: 50, fiber_100g: 3, "saturated-fat_100g": 5, sodium_100g: 0.2 },
    },
  };
  await page.route("https://world.openfoodfacts.org/api/v2/product/9556001234567.json*", (r) => r.fulfill({ json: product }));
  await page.route("https://world.openfoodfacts.org/api/v2/product/1111111111111.json*", (r) => r.fulfill({ status: 404, json: { status: 0 } }));

  await page.getByRole("button", { name: /Scan barcode/ }).click();
  const scan = sheet(page, "Scan barcode");
  // An unknown product offers to add it as a new food.
  await scan.getByLabel("Barcode number").fill("1111111111111");
  await scan.getByRole("button", { name: "Look up" }).click();
  await expect(scan.getByRole("status")).toContainText("1111111111111 isn't in the database yet.");
  await expect(scan.getByRole("button", { name: "Add it as a new food" })).toBeVisible();
  await scan.getByLabel("Barcode number").fill("9556 0012 34567");
  await scan.getByRole("button", { name: "Look up" }).click();
  const milo = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Milo 3in1" }) });
  await expect(milo).toBeVisible();
  await expect(milo).toContainText("Nestlé");
  await milo.getByRole("button", { name: /^Add to Breakfast/ }).click();
  await expect(page.locator(".row", { hasText: "Milo 3in1" })).toContainText("33 g");

  // Logging food starts a streak.
  await expect(page.getByRole("button", { name: "1-day logging streak" })).toBeVisible();

  // Water: three 250 ml cups, then a 500 ml bottle as the cup size, and a one-off 330 ml can.
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Add 250 ml of water" }).click();
  await expect(page.getByText(/^0\.75 of 2\.75 L water$/)).toBeVisible();
  await page.getByRole("button", { name: "Cup size 250 ml, change" }).click();
  await sheet(page, "Cup size").getByRole("button", { name: "500 ml" }).click();
  await page.getByRole("button", { name: "Add 500 ml of water" }).click();
  await expect(page.getByText(/^1\.25 of 2\.75 L water$/)).toBeVisible();
  await page.getByRole("button", { name: "Cup size 500 ml, change" }).click();
  await sheet(page, "Cup size").getByLabel("Other amount").fill("330");
  await sheet(page, "Cup size").getByRole("button", { name: "Add once" }).click();
  await expect(page.getByText(/^1\.58 of 2\.75 L water$/)).toBeVisible();
  await page.getByRole("button", { name: "Remove 500 ml of water" }).click();
  await expect(page.getByText(/^1\.08 of 2\.75 L water$/)).toBeVisible();

  // Progress: a few weigh-ins over two weeks draw the chart and the trend. (No step counting.)
  await page.getByRole("button", { name: /streaks Progress$/ }).click();
  const progress = sheet(page, "Progress");
  await expect(progress.getByText(/steps/i)).toHaveCount(0);
  await progress.getByLabel("Weight in kg").fill("82");
  await progress.locator(".field", { hasText: "kg" }).getByRole("button", { name: "Save" }).click();
  await progress.getByRole("button", { name: "Close", exact: true }).click();

  for (const kg of ["81.4", "80.9"]) {
    await advance(page, 7 * 86400000);
    await page.getByRole("button", { name: /streaks Progress$/ }).click();
    await progress.getByLabel("Weight in kg").fill(kg);
    await progress.locator(".field", { hasText: "kg" }).getByRole("button", { name: "Save" }).click();
    await progress.getByRole("button", { name: "Close", exact: true }).click();
  }
  await page.getByRole("button", { name: /streaks Progress$/ }).click();
  await expect(progress.getByRole("img", { name: /Weight from 82.0 kg/ })).toHaveAttribute("aria-label", /to 80.9 kg/);
  await expect(progress).toContainText("Losing 0.5 kg a week");
  await expect(progress).toContainText("That's on track for your goal.");
  await progress.getByRole("button", { name: "Close", exact: true }).click();

  // The profile weight follows the latest weigh-in, so targets update.
  await tab(page, "Profile");
  await expect(page.getByLabel("Weight", { exact: true })).toHaveValue("80.9");
});

test("Arif: trains with a rest timer, beats a record, shares and exports", async ({ page }) => {
  await start(page);
  await onboard(page, "Arif", { sex: "Male", weight: "75" });

  // Week 1: chest day at 40 kg; finishing a set starts the rest timer.
  await tab(page, "Train");
  await page.getByRole("button", { name: /Clock in & start/ }).click();
  const bench = page.locator(".card", { hasText: "Barbell bench press" }).first();
  for (const set of [1, 2, 3]) {
    await bench.getByLabel(`Set ${set} weight`).fill("40");
    await bench.getByLabel(`Set ${set} reps`).fill("10");
    await bench.getByRole("button", { name: "Mark set done" }).first().click();
  }
  const rest = page.getByRole("timer", { name: "Rest timer" });
  await expect(rest).toBeVisible();
  await rest.getByRole("button", { name: "+15s" }).click();
  await rest.getByRole("button", { name: "Skip" }).click();
  await expect(rest).toHaveCount(0);
  await advance(page, 50 * 60000);
  await page.getByRole("button", { name: "Clock out" }).click();
  await page.getByRole("button", { name: "Finish workout" }).click();
  await expect(page.getByText(/Nice work! .* saved/)).toBeVisible();
  await expect(page.getByTestId("records")).toContainText("Barbell bench press");
  await expect(page.getByTestId("records")).toContainText("40 kg × 10");

  // Sharing makes an image (downloaded in a browser that can't share files).
  const card = page.waitForEvent("download");
  await page.locator(".done-card").getByRole("button", { name: "Share" }).click();
  expect((await card).suggestedFilename()).toMatch(/^workout-2026-10-12\.png$/);

  // Week 2: the app suggests +2.5 kg and pre-fills it; beating last week is a new record.
  await advance(page, 7 * 86400000);
  await tab(page, "Today");
  await tab(page, "Train");
  await page.getByRole("button", { name: /Clock in & start/ }).click();
  const bench2 = page.locator(".card", { hasText: "Barbell bench press" }).first();
  await expect(bench2.locator(".lift-history")).toContainText("Last time: 40 kg × 10, 10, 10");
  await expect(bench2.locator(".lift-next")).toContainText("try 42.5 kg");
  await expect(bench2.getByLabel("Set 1 weight")).toHaveValue("42.5");
  await bench2.getByLabel("Set 1 reps").fill("10");
  await bench2.getByRole("button", { name: "Mark set done" }).first().click();
  await expect(page.locator(".toast", { hasText: "New personal record" })).toContainText("New personal record · Barbell bench press 42.5 kg × 10");
  await page.getByRole("timer", { name: "Rest timer" }).getByRole("button", { name: "Skip" }).click();

  // Export: CSV with every table.
  await tab(page, "Profile");
  const csvDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export data \(CSV\)/ }).click();
  const csv = await csvDownload;
  expect(csv.suggestedFilename()).toBe("W-2026-10-19.csv");
  const text = fs.readFileSync((await csv.path())!, "utf8");
  expect(text).toContain("# Food log");
  expect(text).toContain("Barbell bench press,1,40,10");

  const pdfDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /30-day report \(PDF\)/ }).click();
  const pdf = await pdfDownload;
  expect(pdf.suggestedFilename()).toBe("W-2026-10-19.pdf");
  expect(fs.readFileSync((await pdf.path())!).subarray(0, 5).toString()).toBe("%PDF-");
});

test("Lina: doesn't eat vegetables or beef, so her meal plan leaves them out", async ({ page }) => {
  await start(page);
  await onboard(page, "Lina");
  await tab(page, "Plan");
  await page.getByRole("tab", { name: "Nutrition" }).click();
  await expect(page.locator(".card", { hasText: "Dinner" }).first()).toContainText(/vegetables/i);

  // Profile: type it the way she'd say it, and tap a chip.
  await tab(page, "Profile");
  const other = page.getByLabel("Another food you don't eat");
  await other.fill("I don't eat vege");
  await other.press("Enter");
  await expect(page.getByRole("button", { name: "Vegetables", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Beef", exact: true }).click();
  await other.fill("durian");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("button", { name: "Eat durian again" })).toBeVisible();

  // Plan: no vegetables or beef; fruit instead, and it says so.
  await tab(page, "Plan");
  await page.getByRole("tab", { name: "Nutrition" }).click();
  await expect(page.getByTestId("plan-without")).toContainText("Planned without vegetables, beef, durian.");
  for (const meal of await page.locator(".card", { hasText: /kcal/ }).allTextContents()) expect(meal).not.toMatch(/vegetables|broccoli|spinach|beef/i);
  await expect(page.getByText("Papaya").first()).toBeVisible();

  // It's a preference, not an allergy: broccoli can still be found and logged without a warning.
  await tab(page, "Food");
  await page.getByLabel("Search foods").fill("broccoli");
  await page.locator(".row", { hasText: "Broccoli" }).first().click();
  await expect(page.locator(".avoid-card")).toHaveCount(0);
});

test("Mei: reminders and switching language to Malay and Chinese", async ({ page }) => {
  await start(page);
  await onboard(page, "Mei");
  await tab(page, "Profile");

  // Reminders can be set up; in a browser the app explains they need the phone app.
  const meals = page.getByRole("switch", { name: "Meal reminders" });
  await meals.click();
  await expect(meals).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("Lunch", { exact: true })).toHaveValue("12:30");
  await page.getByRole("switch", { name: "Gym reminders" }).click();
  await expect(page.getByText("Reminders work in the iPhone and Android apps.", { exact: false })).toBeVisible();

  // No step goal any more.
  await expect(page.getByRole("button", { name: "More step goal" })).toHaveCount(0);

  // Malay
  await tab(page, "Profile");
  await page.getByRole("button", { name: "Bahasa Melayu" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ms-MY");
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("button").first()).not.toHaveText("Today");
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Profile");
  // Chinese
  await page.getByRole("button", { name: "中文" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(nav.getByRole("button").first()).toContainText(/[一-鿿]/);
  await nav.getByRole("button").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/[一-鿿]/);
  // Exercises are in Chinese too: open the first training day on Plan.
  await nav.getByRole("button").nth(3).click();
  const day = page.locator(".card", { has: page.locator("[aria-expanded]") }).first();
  if ((await day.locator("[aria-expanded]").getAttribute("aria-expanded")) !== "true") await day.locator("[aria-expanded]").click();
  await expect(day.locator("[aria-expanded]")).toHaveAttribute("aria-expanded", "true");
  // No English exercise names (long runs of Latin letters) left in the open day.
  await expect.poll(async () => (await day.innerText()).match(/[A-Za-z]{6,}/g)).toBeNull();
  await nav.getByRole("button").last().click();
  // Back to English
  await nav.getByRole("button").last().click();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(nav.getByRole("button", { name: "Today", exact: true })).toBeVisible();
});

test("Aisyah: tracks her cycle — logs a period, sees her phase and tips, and logs the next one when it's due", async ({ page }) => {
  await start(page);
  await onboard(page, "Aisyah");

  // Cycle tracking is off until she turns it on in Profile.
  await expect(page.getByTestId("cycle-card")).toHaveCount(0);
  await tab(page, "Profile");
  await page.getByRole("switch", { name: "Track my cycle" }).click();
  await tab(page, "Today");
  await expect(page.getByTestId("cycle-card")).toContainText("Cycle tracking is on");

  // On the period calendar she taps the days of her last period: 16–19 September.
  // With a 28-day cycle the next one is due 14 October.
  await page.getByTestId("cycle-card").getByRole("button", { name: "Period calendar" }).click();
  const calendar = page.getByRole("dialog", { name: "Period calendar" });
  await expect(calendar).toContainText("October 2026");
  // Future days can't be marked.
  await expect(calendar.getByRole("button", { name: "20 October", exact: true })).toBeDisabled();
  await calendar.getByRole("button", { name: "Previous month" }).click();
  await expect(calendar).toContainText("September 2026");
  for (const d of [16, 17, 18, 19, 20]) await calendar.getByRole("button", { name: `${d} September`, exact: true }).click();
  // A wrong tap is undone by tapping again.
  await calendar.getByRole("button", { name: "20 September: period day" }).click();
  await expect(calendar.getByRole("button", { name: /: period day$/ })).toHaveCount(4);
  await expect(calendar).toContainText("periods 4 days");
  await calendar.getByRole("button", { name: "Next month" }).click();
  // The next period is predicted on 14–17 October.
  await expect(calendar.getByRole("button", { name: /: predicted period$/ })).toHaveCount(4);
  await calendar.getByRole("button", { name: "Close", exact: true }).click();

  const card = page.getByTestId("cycle-card");
  await expect(card).toContainText("Day 27 · Luteal phase");
  await expect(card).toContainText("Next period in 2 days");
  await expect(card).toContainText("Appetite can rise");

  // It's due soon, so a one-tap button appears.
  await card.getByRole("button", { name: "Started today" }).click();
  await expect(card).toContainText("Period · day 1");
  await expect(card).toContainText("Iron-rich foods");
  await expect(card.getByRole("button", { name: "Started today" })).toHaveCount(0);

  // Both periods are listed in Profile and can be removed.
  await tab(page, "Profile");
  const logged = page.getByRole("group", { name: "Logged periods" });
  await expect(logged.locator(".row")).toHaveCount(2);
  await expect(logged).toContainText("16 Sept 2026 – 19 Sept 2026");
  await logged.getByRole("button", { name: /Remove period on/ }).first().click();
  await expect(logged.locator(".row")).toHaveCount(1);
  await expect(page.getByText(/not medical advice or contraception/)).toBeVisible();

  // In Malay.
  await page.getByRole("button", { name: "Bahasa Melayu" }).click();
  await page.getByRole("navigation").getByRole("button").first().click();
  await expect(page.getByTestId("cycle-card")).toContainText("Hari 27 · Fasa luteal");
  await page.getByRole("navigation").getByRole("button").last().click();
  await page.getByRole("button", { name: "English" }).click();

  // The section only shows for women.
  await page.getByRole("tab", { name: "Male", exact: true }).click();
  await expect(page.getByRole("switch", { name: "Track my cycle" })).toHaveCount(0);
});

test("Family: Aina adds her mum, each gets their own plan and log, and they switch from Today", async ({ page }) => {
  await start(page);
  await onboard(page, "Aina", { weight: "58" });

  await expect(page.getByTestId("cycle-card")).toHaveCount(0);

  // Aina logs breakfast.
  await tab(page, "Food");
  await page.getByLabel("Search foods").fill("roti canai");
  await page.locator(".row", { hasText: /^Roti canai/ }).first().click();
  await page.getByRole("dialog").getByRole("tab", { name: "Breakfast" }).click();
  await page.getByRole("button", { name: "Add to Breakfast" }).click();
  await tab(page, "Today");
  const ainaEaten = await page.locator(".stat", { hasText: "Eaten" }).locator(".stat-value").innerText();
  expect(Number(ainaEaten.replace(/\D/g, ""))).toBeGreaterThan(0);

  // Adding someone opens onboarding for them (skipping the welcome page); Cancel goes back.
  await tab(page, "Profile");
  await page.getByRole("button", { name: /Add a person/ }).click();
  await expect(page.getByText("New person")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: /Good \w+, Aina/ })).toBeVisible();
  await tab(page, "Profile");
  await expect(page.getByRole("group", { name: "People" }).getByRole("button", { name: /Switch to/ })).toHaveCount(0);

  // Now for real: Mum, 55, 152 cm, 70 kg, wants to lose fat, halal.
  await page.getByRole("button", { name: /Add a person/ }).click();
  await page.getByLabel("Name").fill("Mum");
  await page.getByRole("tab", { name: "Female", exact: true }).click();
  await page.getByLabel("Age").fill("55");
  await page.getByLabel("Height").fill("152");
  await page.getByLabel("Weight").fill("70");
  // Women are asked (optionally) about period tracking during setup.
  await page.getByRole("switch", { name: "Track my period?" }).click();
  await page.getByLabel("First day of your last period").fill("2026-09-20");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Lose fat/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Lightly active/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /New to the gym/ }).click();
  await page.locator(".chip", { hasText: "Halal" }).click();
  await page.getByRole("button", { name: "Build my plan" }).click();

  // Mum's Today is her own: her name, nothing eaten, her own (smaller) target. No second welcome tour.
  await expect(page.getByRole("heading", { name: /Good \w+, Mum/ })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(Number((await page.locator(".stat", { hasText: "Eaten" }).locator(".stat-value").innerText()).replace(/\D/g, ""))).toBe(0);
  // Her cycle from setup: 20 September → day 23 on 12 October.
  await expect(page.getByTestId("cycle-card")).toContainText("Day 23 · Luteal phase");

  // Switch back to Aina from the avatar on Today; her breakfast is still there.
  await page.getByRole("button", { name: "Switch person" }).click();
  await page.getByRole("dialog", { name: "Who's using W?" }).getByRole("button", { name: "Switch to Aina" }).click();
  await expect(page.getByRole("heading", { name: /Good \w+, Aina/ })).toBeVisible();
  await expect(page.locator(".stat", { hasText: "Eaten" }).locator(".stat-value")).toHaveText(ainaEaten);

  await tab(page, "Profile");
  const people = page.getByRole("group", { name: "People" });
  await expect(people).toContainText("Mum");

  // Removing Mum deletes her data.
  page.once("dialog", (d) => d.accept());
  await people.getByRole("button", { name: "Remove Mum" }).click();
  await expect(people).not.toContainText("Mum");

  // Closing and reopening the app: Aina's data is there, and Mum stays removed.
  await page.reload();
  await expect(page.getByRole("heading", { name: /Good \w+, Aina/ })).toBeVisible();
  await expect(page.locator(".stat", { hasText: "Eaten" }).locator(".stat-value")).toHaveText(ainaEaten);
  await expect(page.getByRole("button", { name: "Switch person" })).toHaveCount(0);
});

test("Exercise library: a category icon on every row, the real photos on the exercise's page", async ({ page }) => {
  await start(page);
  await onboard(page, "Rina");
  await tab(page, "Train");
  await page.locator("[data-tour=log-activity]").click();
  const library = page.getByRole("dialog", { name: "Exercises" });
  await library.getByRole("radio", { name: "Strength" }).or(library.getByRole("tab", { name: "Strength" })).first().click();
  const rows = library.locator(".row");
  await expect(rows.first().locator(".ex-pic-icon")).toBeVisible();
  // Each exercise has its own icon: the movement, not just its muscle group.
  await expect(rows.filter({ hasText: "Barbell bench press" }).first().locator(".ex-pic-icon")).toHaveAttribute("data-icon", "bench");
  await expect(rows.filter({ hasText: "Dumbbell fly" }).first().locator(".ex-pic-icon")).toHaveAttribute("data-icon", "fly");
  await expect(library.locator(".row img")).toHaveCount(0);
  await rows.filter({ hasText: "Barbell bench press" }).first().click();
  const picture = page.getByTestId("exercise-picture");
  await expect(picture).toBeVisible();
  // Start and end positions, both loaded.
  await expect(picture.locator("img")).toHaveCount(2);
  await expect.poll(() => picture.locator("img").first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBe(240);
  // A sport without a photo shows its icon instead.
  await page.getByRole("dialog", { name: "Chest" }).getByRole("button", { name: "Close", exact: true }).click();
  await library.getByRole("searchbox").or(library.locator("input")).first().fill("futsal");
  await expect(rows.first().locator(".ex-pic-icon")).toHaveAttribute("data-icon", "soccer");
  await rows.first().click();
  await expect(page.locator(".ex-hero-icon")).toBeVisible();
});

test("Scrolling still works after closing stacked sheets (regression: the page stayed locked)", async ({ page }) => {
  await start(page);
  await onboard(page, "Sara");
  await tab(page, "Train");
  // Library → an activity's page → "Log activity" closes both sheets at once.
  await page.locator("[data-tour=log-activity]").click();
  const library = page.getByRole("dialog", { name: "Exercises" });
  await library.locator("input").first().fill("futsal");
  await library.locator(".row").first().click();
  await page.getByRole("button", { name: "Log activity" }).last().click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
  // Open and close a few sheets in different orders; the page must always scroll again.
  await tab(page, "Today");
  await page.getByRole("button", { name: /streaks Progress$/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
});

test("Fixing a mistake: rice added to dinner by accident is edited, moved, deleted, undone and swiped away", async ({ page }) => {
  await start(page);
  await onboard(page, "Hana");
  // Log rice to dinner by mistake.
  await tab(page, "Food");
  await page.getByLabel("Search foods").fill("white rice");
  await page.locator(".row").first().click();
  const food = page.getByRole("dialog");
  await food.getByRole("tab", { name: "Dinner" }).click();
  await food.getByRole("button", { name: /^Add to Dinner/ }).click();
  await tab(page, "Today");
  const dinner = page.locator(".section-header", { hasText: /^Dinner/ });
  await expect(dinner).toContainText("kcal");
  const riceRow = page.locator(".swipe-row", { hasText: /rice/i }).first();
  const riceName = (await riceRow.locator(".row-title").innerText()).trim();

  // Tap it: change the amount — the calories follow.
  await riceRow.getByRole("button", { name: `Edit ${riceName}` }).click();
  const edit = page.getByRole("dialog", { name: "Edit food" });
  const before = Number(await edit.getByTestId("edit-kcal").innerText());
  const grams = Number(await edit.getByLabel("Amount").inputValue());
  await edit.getByLabel("Amount").fill(String(grams * 2));
  await expect.poll(async () => Math.abs(Number(await edit.getByTestId("edit-kcal").innerText()) - before * 2)).toBeLessThanOrEqual(1);
  const after = Number(await edit.getByTestId("edit-kcal").innerText());
  // …and move it to lunch.
  await edit.getByRole("tab", { name: "Lunch" }).click();
  await edit.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Moved to Lunch" })).toBeVisible();
  await expect(dinner).not.toContainText("kcal");
  await expect(page.locator(".section-header", { hasText: /^Lunch/ })).toContainText(`${after} kcal`);

  // Delete it from the edit sheet, then undo.
  await page.locator(".swipe-row", { hasText: riceName }).getByRole("button", { name: `Edit ${riceName}` }).click();
  await edit.getByRole("button", { name: "Delete from Lunch" }).click();
  await expect(page.locator(".swipe-row", { hasText: riceName })).toHaveCount(0);
  await page.getByRole("status").getByRole("button", { name: "Undo" }).click();
  await expect(page.locator(".swipe-row", { hasText: riceName })).toHaveCount(1);

  // Swipe it left to delete.
  const row = page.locator(".swipe-row", { hasText: riceName }).locator(".row");
  const box = (await row.boundingBox())!;
  await page.mouse.move(box.x + box.width - 60, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(box.x + box.width - 60 - i * 20, box.y + box.height / 2);
  await page.mouse.up();
  await expect(page.locator(".swipe-row", { hasText: riceName })).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: `Removed ${riceName}` })).toBeVisible();
  // The page still scrolls afterwards.
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
});
