import { expect, test, type Page } from "@playwright/test";
import { GUIDES } from "../src/components/guides";
import { dayKey, seedState } from "./support/audit";

// The ? button's guides: every guide runs from start to finish, each step it shows points at its
// feature (only optional steps may be skipped, when their feature isn't there), and the card
// never covers what it points at.

const IGNORED_CONSOLE = /openfoodfacts|ERR_TUNNEL|ERR_INTERNET|Failed to load resource/;

async function open(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`page error: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !IGNORED_CONSOLE.test(m.text()) && errors.push(`console: ${m.text().slice(0, 200)}`));
  await page.route("https://world.openfoodfacts.org/**", (r) => r.fulfill({ json: { products: [] } }));
  const s = seedState();
  const state = {
    ...s,
    profile: { ...s.profile, cycle: { ...s.profile.cycle, pill: { on: true, packStart: dayKey(-3), active: 21, breakDays: 7, time: "21:00", remind: false } } },
    supplements: [{ id: "s1", name: "Vitamin D", times: ["08:00"], remind: false, createdAt: 1 }],
  };
  await page.addInitScript((j) => {
    if (location.protocol.startsWith("http") && !sessionStorage.getItem("seeded")) {
      localStorage.setItem("calories-detector:v1", j);
      sessionStorage.setItem("seeded", "1");
    }
  }, JSON.stringify(state));
  await page.goto("/");
  await expect(page.getByRole("navigation")).toBeVisible();
  return errors;
}

for (const g of GUIDES) {
  test(`Guide "${g.title}": every step finds its feature`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors = await open(page);
    await page.getByRole("button", { name: "How to use the app" }).click();
    const menu = page.getByRole("dialog", { name: "Guides" });
    await expect(menu.getByRole("button")).toHaveCount(GUIDES.length + 1); // and Close
    await menu.getByRole("button", { name: new RegExp(`^${g.title}`) }).click();

    const seen: string[] = [];
    for (let n = 0; n < g.steps.length + 1; n++) {
      const card = page.locator(".tour-card");
      await expect(card).toBeVisible();
      // Text crossfades between steps: wait for the old one to go.
      await expect(card.locator("#tour-title")).toHaveCount(1);
      const title = (await card.locator("#tour-title").innerText()).trim();
      const step = g.steps.find((s) => s.title === title);
      expect(step, `unknown step "${title}"`).toBeTruthy();
      seen.push(title);
      if (step!.targets) {
        // The highlight frames something on screen…
        await expect.poll(async () => (await page.locator(".tour-spotlight").boundingBox())?.width ?? 0, { message: `"${title}" has no highlight` }).toBeGreaterThan(20);
        // …and the card doesn't cover it.
        await expect
          .poll(async () => {
            const [c, s] = await Promise.all([card.boundingBox(), page.locator(".tour-spotlight").boundingBox()]);
            return Math.max(0, Math.min(c!.y + c!.height, s!.y + s!.height) - Math.max(c!.y, s!.y));
          }, { message: `card covers "${title}"` })
          .toBeLessThan(12);
      }
      const done = card.getByRole("button", { name: "Done" });
      if (await done.count()) {
        await done.click();
        break;
      }
      await card.getByRole("button", { name: n === 0 ? /Show me|Next/ : "Next" }).click();
    }
    await expect(page.locator(".tour-card")).toHaveCount(0);
    // Only optional steps may have been skipped.
    const missing = g.steps.filter((s) => !s.optional && !seen.includes(s.title)).map((s) => s.title);
    expect(missing).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("Guides one after another: a long one, then a short one, then the quick tour", async ({ page }) => {
  const errors = await open(page);
  for (const [title, steps] of [["Profile and family", 8], ["Plan", 0], ["Quick tour", 2]] as const) {
    await page.getByRole("button", { name: "How to use the app" }).click();
    await page.getByRole("dialog", { name: "Guides" }).getByRole("button", { name: new RegExp(`^${title}`) }).click();
    await expect(page.locator(".tour-card")).toBeVisible();
    await expect(page.locator(".tour-card")).toContainText(/Step 1 of \d+/);
    for (let i = 0; i < steps; i++) await page.locator(".tour-card").getByRole("button", { name: /Show me|Next/ }).click();
    await page.keyboard.press("Escape");
    await expect(page.locator(".tour-card")).toHaveCount(0);
  }
  await expect(page.getByRole("navigation")).toBeVisible();
  expect(errors).toEqual([]);
});
