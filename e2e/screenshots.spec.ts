import { devices, expect, test, type Page } from "@playwright/test";
import { FOOD_BY_NAME } from "../src/data/foods";
import { scale } from "../src/lib/nutrition";

/**
 * Regenerates the README screenshots: `npm run screenshots`.
 * iPhone in light mode, Android in dark mode, with a realistic user's day.
 */
test.skip(!process.env.SCREENSHOTS, "run with SCREENSHOTS=1 (npm run screenshots)");

const LUNCHTIME = new Date("2026-10-12T12:40:00+08:00"); // a Monday

const SETS = [
  { dir: "ios", device: "iPhone 14", scheme: "light" },
  { dir: "android", device: "Pixel 7", scheme: "dark" },
] as const;

function entry(id: string, meal: string, name: string, grams: number, minutesAgo: number, note?: string) {
  const f = FOOD_BY_NAME.get(name)!;
  return { id, date: "2026-10-12", meal, name, grams, nutrients: scale(f.per100, grams), source: "db", createdAt: LUNCHTIME.getTime() - minutesAgo * 60000, ...(note ? { note } : {}) };
}

function seed() {
  return {
    profile: { name: "Aisyah", sex: "female", age: 27, heightCm: 162, weightKg: 61, activity: 1.55, goal: "lose", experience: "intermediate", trainingDays: 5, diet: "halal", onboarded: true },
    log: [
      entry("l1", "breakfast", "Oats (dry)", 50, 300),
      entry("l2", "breakfast", "Greek yogurt (plain, nonfat)", 170, 299),
      entry("l3", "breakfast", "Blueberries", 75, 298),
      entry("l4", "breakfast", "Kopi O (with sugar)", 250, 297),
      entry("l5", "lunch", "Nasi ayam (chicken rice, steamed)", 491, 10),
      entry("l6", "snack", "Apple", 182, 120),
    ],
    customFoods: [],
    customMeals: [
      { id: "m1", name: "Post-gym bowl", items: [["Chicken breast (grilled, skinless)", 150], ["Brown rice (cooked)", 180], ["Broccoli", 100]].map(([n, g]) => ({ foodId: n, name: n, grams: g, per100: FOOD_BY_NAME.get(n as string)!.per100 })) },
    ],
    sessions: [
      {
        id: "s0",
        date: "2026-10-12",
        title: "Morning run",
        startedAt: LUNCHTIME.getTime() - 6 * 3600000,
        endedAt: LUNCHTIME.getTime() - 5.5 * 3600000,
        exercises: [{ id: "e0", exerciseId: "c-10", name: "Running (9.7 km/h, 6:12 /km)", kind: "cardio", met: 9.8, minutes: 30 }],
        kcal: 299,
      },
    ],
    activeSessionId: null,
    split: "bodypart",
    recentFoodIds: ["Nasi lemak ayam goreng", "Roti canai", "Teh tarik", "Chicken breast (grilled, skinless)", "Sushi (salmon nigiri)"].map((n) => FOOD_BY_NAME.get(n)!.id),
    tourDone: true,
    introDone: true,
    theme: "system",
    deleted: [],
    stamps: {},
  };
}

const PHOTO_RESULT = {
  isFood: true,
  mealName: "Nasi lemak with fried chicken",
  notes: "Assumed about 1 tbsp of oil in the chicken and 2 tbsp of sambal.",
  items: [
    { name: "Coconut rice", grams: 160, calories: 280, protein: 5, carbs: 48, fat: 7.7, fiber: 1, sugar: 0.3, confidence: "high" },
    { name: "Ayam goreng (fried chicken)", grams: 140, calories: 371, protein: 30, carbs: 11, fat: 23, fiber: 1, sugar: 0.7, confidence: "medium" },
    { name: "Sambal", grams: 30, calories: 42, protein: 0.6, carbs: 4, fat: 2.7, fiber: 0.7, sugar: 2.7, confidence: "medium" },
    { name: "Fried egg", grams: 46, calories: 90, protein: 6.3, carbs: 0.4, fat: 6.8, fiber: 0, sugar: 0.2, confidence: "high" },
    { name: "Peanuts & ikan bilis", grams: 25, calories: 140, protein: 8, carbs: 3, fat: 10.5, fiber: 1, sugar: 0.5, confidence: "medium" },
  ],
};

for (const set of SETS) {
  test(`screenshots · ${set.dir}`, async ({ browser }, info) => {
    test.skip(info.project.name !== "iPhone 14");
    test.setTimeout(300_000);
    // A reload under the fake clock stalls animation frames, so the seeded day gets its own context.
    const open = async (state?: object) => {
      const ctx = await browser.newContext({ ...devices[set.device], colorScheme: set.scheme, locale: "en-MY", timezoneId: "Asia/Kuala_Lumpur", baseURL: info.project.use.baseURL });
      if (state) await ctx.addInitScript((s) => {
          if (localStorage.getItem("calories-detector:v1")) return;
          localStorage.setItem("calories-detector:v1", s);
          localStorage.setItem("calories-detector:account", JSON.stringify({ guest: true }));
        }, JSON.stringify(state));
      const pg = await ctx.newPage();
      await pg.clock.install({ time: LUNCHTIME });
      await pg.clock.resume();
      await pg.route("https://world.openfoodfacts.org/**", (r) => r.fulfill({ json: { products: [] } }));
      await pg.route("**/api/analyze-photo", (r) => r.fulfill({ json: PHOTO_RESULT }));
      await pg.goto("/");
      return pg;
    };
    let page = await open();
    let n = 0;
    const shot = async (name: string, settle = 900) => {
      await page.waitForTimeout(settle);
      n += 1;
      await page.screenshot({ path: `docs/screenshots/${set.dir}/${String(n).padStart(2, "0")}-${name}.jpg`, type: "jpeg", quality: 82 });
    };
    const tab = (name: string) => page.getByRole("navigation").getByRole("button", { name, exact: true }).click();
    const sheet = () => page.getByRole("dialog").last();
    const closeSheet = async () => {
      await sheet().getByRole("button", { name: "Close", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    };

    // First launch
    await shot("intro-guide");
    await page.getByRole("button", { name: "Skip" }).click();
    await shot("sign-in");
    await page.getByRole("button", { name: "Sign up with email" }).click();
    await shot("create-account");
    await closeSheet();
    await page.getByRole("button", { name: "Continue without an account" }).click();
    await page.getByRole("button", { name: "Get started" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await shot("onboarding-goal");
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: /Continue|Build my plan/ }).click();
    await page.getByRole("button", { name: "Show me" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await shot("guided-tour");
    await page.getByRole("button", { name: "Skip" }).click();

    // A real day
    await page.context().close();
    page = await open(seed());
    await shot("today");
    await page.evaluate(() => window.scrollTo(0, 620));
    await shot("today-meals");
    await page.evaluate(() => window.scrollTo(0, 0));

    // Photo
    await page.getByRole("button", { name: /Scan meal/ }).click();
    await page.locator('input[type=file]:not([capture])').setInputFiles({ name: "lunch.jpg", mimeType: "image/jpeg", buffer: await mealPhoto(page) });
    await page.getByRole("button", { name: "Analyse" }).click();
    await expect(sheet()).toContainText("Nasi lemak with fried chicken");
    await shot("photo-calories");
    await closeSheet();

    // Food
    await tab("Food");
    await shot("food");
    await page.getByLabel("Search foods").fill("chicken");
    await shot("food-search");
    await page.locator(".row", { hasText: "Chicken tikka masala" }).first().click();
    await page.locator(".sheet-body").evaluate((el) => el.scrollTo(0, 380));
    await shot("food-health-check");
    await closeSheet();
    await page.getByLabel("Search foods").fill("nasi lemak");
    await page.locator(".row", { hasText: "Nasi lemak ayam goreng" }).first().click();
    const parts = page.getByTestId("dish-parts");
    await parts.getByRole("button", { name: "More Fried egg" }).click();
    await parts.getByRole("button", { name: "Less Peanuts" }).click();
    await parts.getByRole("button", { name: "Less Peanuts" }).click();
    await page.locator(".sheet-body").evaluate((el) => el.scrollTo(0, 250));
    await shot("customise-dish");
    await closeSheet();
    await page.getByLabel("Clear search").click();
    await page.getByRole("tab", { name: "My Meals" }).click();
    await page.locator(".row", { hasText: "Post-gym bowl" }).locator(".row-main").click();
    await shot("meal-builder");
    await closeSheet();

    // Train
    await tab("Train");
    await shot("train");
    await page.getByRole("button", { name: /Exercise library/ }).click();
    await shot("exercise-library");
    await sheet().locator(".row", { hasText: "Barbell bench press" }).first().click();
    await shot("exercise-detail");
    await sheet().getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await closeSheet();
    await page.getByRole("button", { name: /Clock in & start/ }).click();
    const bench = page.locator(".card", { hasText: "Barbell bench press" });
    for (const [set, kg] of [[1, 40], [2, 45], [3, 45]] as const) {
      await bench.getByLabel(`Set ${set} weight`).fill(String(kg));
      await bench.getByRole("button", { name: "Mark set done" }).first().click();
    }
    await page.clock.setSystemTime(new Date(LUNCHTIME.getTime() + 38 * 60000));
    await expect(page.locator(".toast")).toHaveCount(0, { timeout: 15_000 });
    await shot("workout-clocked-in", 1400);
    await page.getByRole("button", { name: "Clock out" }).click();
    await shot("clock-out");
    await page.getByRole("button", { name: "Finish workout" }).click();
    await expect(page.locator(".toast")).toHaveCount(0, { timeout: 15_000 });

    // Plan
    await tab("Plan");
    await shot("training-plan");
    await page.getByRole("tab", { name: "Nutrition" }).click();
    await shot("nutrition-plan");
    await page.evaluate(() => window.scrollTo(0, 1500));
    await shot("sample-day");

    // Body check & profile
    await tab("Today");
    await page.getByRole("button", { name: /Body check · BMI/ }).click();
    await shot("body-check-bmi");
    await page.locator(".sheet-body").evaluate((el) => el.scrollTo(0, 620));
    await shot("body-check-advice");
    await closeSheet();
    await tab("Profile");
    await shot("profile");

    await page.context().close();
  });
}

/** A simple drawn plate, so the photo screen shows something food-like without a real photo. */
async function mealPhoto(page: Page) {
  const data = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 800;
    c.height = 600;
    const g = c.getContext("2d")!;
    g.fillStyle = "#c8a27a";
    g.fillRect(0, 0, 800, 600);
    g.fillStyle = "#f4f1ea";
    g.beginPath();
    g.ellipse(400, 300, 300, 240, 0, 0, Math.PI * 2);
    g.fill();
    const blob = (x: number, y: number, rx: number, ry: number, color: string) => {
      g.fillStyle = color;
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
    };
    blob(340, 300, 120, 95, "#fbf6e9"); // rice
    blob(500, 260, 85, 60, "#a8571f"); // chicken
    blob(470, 380, 60, 38, "#c2301c"); // sambal
    blob(300, 190, 45, 40, "#ffffff"); // egg white
    blob(305, 192, 18, 18, "#f7b500"); // yolk
    blob(540, 360, 34, 20, "#8a5a2b"); // peanuts
    blob(250, 380, 40, 14, "#6aa84f"); // cucumber
    return c.toDataURL("image/jpeg", 0.9).split(",")[1];
  });
  return Buffer.from(data, "base64");
}
