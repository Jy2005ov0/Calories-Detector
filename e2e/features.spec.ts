import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";

// User journeys for barcode scanning, progress, fasting, allergies, the coach, rest timer and
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
  await page.getByRole("button", { name: "Continue without an account" }).click();
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByLabel("Name").fill(name);
  await page.getByRole("tab", { name: opts.sex ?? "Female", exact: true }).click();
  await page.getByLabel("Age").fill("28");
  await page.getByLabel("Height").fill("160");
  await page.getByLabel("Weight").fill(opts.weight ?? "64");
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

test("Wei: scans a barcode, logs it, tracks water, steps and weight, and builds a streak", async ({ page }) => {
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

  // Water: three glasses.
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Add a glass of water" }).click();
  await expect(page.getByText(/^3 of 11 glasses$/)).toBeVisible();

  // Progress: steps and a few weigh-ins over two weeks draw the chart and the trend.
  await page.getByRole("button", { name: /steps Progress$/ }).click();
  const progress = sheet(page, "Progress");
  await progress.getByLabel("Steps today").fill("6400");
  await progress.locator(".field", { hasText: "Steps today" }).getByRole("button", { name: "Save" }).click();
  await expect(progress.getByRole("img", { name: /^Steps:/ })).toHaveAttribute("aria-label", /6400 steps$/);
  await progress.getByLabel("Weight in kg").fill("82");
  await progress.locator(".field", { hasText: "kg" }).getByRole("button", { name: "Save" }).click();
  await progress.getByRole("button", { name: "Close", exact: true }).click();

  for (const kg of ["81.4", "80.9"]) {
    await advance(page, 7 * 86400000);
    await page.getByRole("button", { name: /steps Progress$/ }).click();
    await progress.getByLabel("Weight in kg").fill(kg);
    await progress.locator(".field", { hasText: "kg" }).getByRole("button", { name: "Save" }).click();
    await progress.getByRole("button", { name: "Close", exact: true }).click();
  }
  await page.getByRole("button", { name: /steps Progress$/ }).click();
  await expect(progress.getByRole("img", { name: /Weight from 82.0 kg/ })).toHaveAttribute("aria-label", /to 80.9 kg/);
  await expect(progress).toContainText("Losing 0.5 kg a week");
  await expect(progress).toContainText("That's on track for your goal.");
  await progress.getByRole("button", { name: "Close", exact: true }).click();

  // The profile weight follows the latest weigh-in, so targets update.
  await tab(page, "Profile");
  await expect(page.getByLabel("Weight", { exact: true })).toHaveValue("80.9");
});

test("Arif: asks the coach, trains with a rest timer, beats a record, shares and exports", async ({ page }) => {
  await start(page);
  await onboard(page, "Arif", { sex: "Male", weight: "75" });

  // Coach (the AI service is mocked): suggestions, a streamed answer, history kept, clear.
  let asked: { messages: { role: string; text: string }[]; context: { today: { kcalLeft: number } } } | null = null;
  await page.route("**/api/coach", async (r) => {
    asked = r.request().postDataJSON();
    await r.fulfill({ status: 200, contentType: "text/plain; charset=utf-8", body: "Try **grilled fish** with rice:\n- 150 g fish\n- 1 cup rice" });
  });
  await page.getByRole("button", { name: /Ask coach/ }).click();
  const coach = sheet(page, "Coach");
  await coach.getByRole("button", { name: "What should I eat for dinner with the calories I have left?" }).click();
  await expect(coach.locator(".bubble.assistant strong")).toHaveText("grilled fish");
  await expect(coach.locator(".bubble.assistant li")).toHaveCount(2);
  expect(asked!.messages.at(-1)!.text).toContain("dinner");
  expect(asked!.context.today.kcalLeft).toBeGreaterThan(1000);
  await coach.getByLabel("Message the coach").fill("And tomorrow?");
  await coach.getByLabel("Message the coach").press("Enter");
  await expect(coach.locator(".bubble.user")).toHaveCount(2);
  await coach.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: /Ask coach/ }).click();
  await expect(coach.locator(".bubble.user")).toHaveCount(2);
  await coach.getByRole("button", { name: "Clear chat" }).click();
  await expect(coach.getByRole("button", { name: /dinner/ })).toBeVisible();
  await coach.getByRole("button", { name: "Close", exact: true }).click();

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

test("Lina: picks a meal photo straight from her photo library on Today and Food", async ({ page }) => {
  await start(page);
  await onboard(page, "Lina");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  await page.route("**/api/analyze-photo", (r) =>
    r.fulfill({
      json: {
        isFood: true,
        mealName: "Chicken rice",
        notes: "",
        items: [{ name: "Chicken rice", grams: 350, calories: 600, protein: 30, carbs: 70, fat: 20, fiber: 1, sugar: 1, confidence: "high" }],
      },
    }),
  );

  // Today: the Photos shortcut on the Scan meal tile opens the library picker directly.
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose a meal photo from your library" }).click();
  const fc = await chooser;
  // The library picker (not the camera) — no capture attribute.
  expect(await fc.element().getAttribute("capture")).toBeNull();
  await fc.setFiles({ name: "lunch.png", mimeType: "image/png", buffer: png });
  const scan = sheet(page, "Scan a meal");
  await expect(scan.getByRole("img", { name: "Your meal" })).toBeVisible();
  await scan.getByRole("button", { name: "Analyse" }).click();
  await expect(scan).toContainText("Chicken rice");
  await scan.getByRole("button", { name: /^Log/ }).click();
  await expect(page.locator(".row", { hasText: "Chicken rice" }).first()).toContainText("350 g");

  // Food tab: the Photo library tile does the same.
  await tab(page, "Food");
  const chooser2 = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Photo library" }).click();
  await (await chooser2).setFiles({ name: "dinner.png", mimeType: "image/png", buffer: png });
  await expect(sheet(page, "Scan a meal").getByRole("img", { name: "Your meal" })).toBeVisible();
  // Retake goes back to the camera / library choice.
  await sheet(page, "Scan a meal").getByRole("button", { name: "Retake" }).click();
  await expect(sheet(page, "Scan a meal").getByRole("button", { name: /Choose photo/ })).toBeVisible();
});

test("Mei: reminders, step goal and switching language to Malay and Chinese", async ({ page }) => {
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

  await page.getByRole("button", { name: "More step goal" }).click();
  await tab(page, "Today");
  await expect(page.getByText("0 of 9,000 steps")).toBeVisible();

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

  // Her last period started on 16 September; with a 28-day cycle the next is due 14 October.
  await tab(page, "Profile");
  await page.getByLabel("First day of a period").fill("2026-09-16");
  await page.getByRole("button", { name: "Log period", exact: true }).click();
  await tab(page, "Today");
  const card = page.getByTestId("cycle-card");
  await expect(card).toContainText("Day 27 · Luteal phase");
  await expect(card).toContainText("Next period in 2 days");
  await expect(card).toContainText("Appetite can rise");

  // It's due soon, so a one-tap button appears.
  await card.getByRole("button", { name: "My period started today" }).click();
  await expect(card).toContainText("Period · day 1");
  await expect(card).toContainText("Iron-rich foods");
  await expect(card.getByRole("button")).toHaveCount(0);

  // Both periods are listed in Profile and can be removed.
  await tab(page, "Profile");
  const logged = page.getByRole("group", { name: "Logged periods" });
  await expect(logged.locator(".row")).toHaveCount(2);
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
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  await expect(page.getByRole("group", { name: "People" }).getByRole("button", { name: /Switch to/ })).toHaveCount(0);

  // Now for real: Mum, 55, 152 cm, 70 kg, wants to lose fat, halal.
  await page.getByRole("button", { name: /Add a person/ }).click();
  await page.getByLabel("Name").fill("Mum");
  await page.getByRole("tab", { name: "Female", exact: true }).click();
  await page.getByLabel("Age").fill("55");
  await page.getByLabel("Height").fill("152");
  await page.getByLabel("Weight").fill("70");
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

  // Switch back to Aina from the avatar on Today; her breakfast is still there.
  await page.getByRole("button", { name: "Switch person" }).click();
  await page.getByRole("dialog", { name: "Who's using W?" }).getByRole("button", { name: "Switch to Aina" }).click();
  await expect(page.getByRole("heading", { name: /Good \w+, Aina/ })).toBeVisible();
  await expect(page.locator(".stat", { hasText: "Eaten" }).locator(".stat-value")).toHaveText(ainaEaten);

  // Everything survives closing the app.
  await page.reload();
  await expect(page.getByRole("heading", { name: /Good \w+, Aina/ })).toBeVisible();
  await tab(page, "Profile");
  const people = page.getByRole("group", { name: "People" });
  await expect(people).toContainText("Mum");

  // Removing Mum deletes her data.
  page.once("dialog", (d) => d.accept());
  await people.getByRole("button", { name: "Remove Mum" }).click();
  await expect(people).not.toContainText("Mum");
});
