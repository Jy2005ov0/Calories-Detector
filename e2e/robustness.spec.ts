import { expect, test, type Page } from "@playwright/test";
import { audit, seedState, type Issue } from "./support/audit";

/**
 * Harder checks than the scripted journeys:
 *  - every sheet opened and closed every way (✕, tapping outside, swiping down, Escape/back),
 *    and the page must scroll by touch afterwards;
 *  - a long seeded "monkey" run of random taps that must never leave the app stuck or crash it;
 *  - the UI scan in Malay and Chinese, whose longer and wider words are the usual layout breakers.
 * Every test also fails on any uncaught error or console error.
 */

const IGNORED_CONSOLE = /openfoodfacts|ERR_TUNNEL|ERR_INTERNET|Failed to load resource/;

async function open(page: Page, state: object = seedState()) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`page error: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !IGNORED_CONSOLE.test(m.text()) && errors.push(`console: ${m.text().slice(0, 200)}`));
  await page.route("https://world.openfoodfacts.org/**", (r) => r.fulfill({ json: { products: [] } }));
  // Seeded before the app starts (it saves its own state when the page is left).
  await page.addInitScript((s) => {
    try {
      if (location.protocol.startsWith("http") && !sessionStorage.getItem("seeded")) {
        localStorage.setItem("calories-detector:v1", s);
        sessionStorage.setItem("seeded", "1");
      }
    } catch {
      // about:blank has no storage
    }
  }, JSON.stringify(state));
  await page.goto("/");
  await expect(page.getByRole("navigation")).toBeVisible();
  return errors;
}

const nav = (page: Page) => page.getByRole("navigation").getByRole("button");
const tab = (page: Page, i: number) => nav(page).nth(i).click();

/** Scroll with a real touch swipe (not the mouse wheel), as a finger on a phone would. */
async function swipeUp(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const vp = page.viewportSize()!;
  const x = Math.round(vp.width / 2);
  const y = Math.round(vp.height * 0.75);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let i = 1; i <= 12; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - i * Math.round(vp.height * 0.035) }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

/** Nothing left over from a closed sheet, and the page scrolls by touch if it's long enough to. */
async function expectFree(page: Page, where: string) {
  await expect(page.getByRole("dialog"), `${where}: a sheet is still open`).toHaveCount(0);
  await expect(page.locator(".scrim"), `${where}: the dimmed background stayed`).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow), { message: `${where}: page scrolling stayed locked` }).toBe("");
  const scrollable = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 80);
  if (!scrollable) return;
  await page.evaluate(() => window.scrollTo(0, 0));
  await swipeUp(page);
  await expect.poll(() => page.evaluate(() => window.scrollY), { message: `${where}: a finger swipe didn't scroll the page` }).toBeGreaterThan(20);
  await page.evaluate(() => window.scrollTo(0, 0));
}

/** Close every open sheet from the top down, waiting for each to finish sliding away. */
async function closeAll(page: Page) {
  for (let n = await page.getByRole("dialog").count(); n > 0; n = await page.getByRole("dialog").count()) {
    await closeTop(page, "✕");
    await expect(page.getByRole("dialog")).toHaveCount(n - 1);
  }
}

type CloseWay = "✕" | "tap outside" | "swipe down" | "Escape";
const CLOSE_WAYS: CloseWay[] = ["✕", "tap outside", "swipe down", "Escape"];

async function closeTop(page: Page, way: CloseWay) {
  const sheet = page.getByRole("dialog").last();
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(450); // let the sheet finish sliding up
  // The step-by-step guide is a card, not a sheet: Escape (or Back on Android) closes it.
  if (!(await sheet.locator(".sheet-header").count())) way = "Escape";
  if (way === "✕") {
    // ✕, or Cancel on sheets that have Cancel / Save instead.
    const x = sheet.locator(".sheet-header .icon-btn");
    await ((await x.count()) ? x.last() : sheet.locator(".sheet-header .side").first().locator("button")).click();
  }
  else if (way === "Escape") await page.keyboard.press("Escape");
  else if (way === "tap outside") await page.mouse.click(page.viewportSize()!.width / 2, 8);
  else {
    const grab = await sheet.locator(".sheet-grabber").boundingBox();
    const x = grab!.x + grab!.width / 2;
    const y = grab!.y + grab!.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(x, y + i * 45);
    await page.mouse.up();
  }
}

/** Every sheet in the app, reached from a fresh start on the right tab. */
const SHEETS: { name: string; open: (page: Page) => Promise<void> }[] = [
  { name: "Body check", open: async (p) => p.locator('[data-tour="body-check"]').first().click() },
  { name: "Progress", open: async (p) => p.locator(".progress-link").click() },
  { name: "Cup size", open: async (p) => p.locator(".water-cup").click() },
  { name: "Period calendar", open: async (p) => p.getByTestId("cycle-card").getByRole("button").first().click() },
  { name: "Switch person", open: async (p) => p.getByRole("button", { name: "Switch person" }).click() },
  { name: "Barcode", open: async (p) => p.locator('[data-tour="barcode"]').click() },
  {
    name: "Food",
    open: async (p) => {
      await tab(p, 1);
      await p.getByLabel("Search foods").fill("nasi lemak");
      await p.locator(".row").first().click();
    },
  },
  {
    name: "Meal builder",
    open: async (p) => {
      await tab(p, 1);
      await p.locator('[data-tour="food-tools"] .tile').nth(1).click();
    },
  },
  {
    name: "New food",
    open: async (p) => {
      await tab(p, 1);
      await p.locator('[data-tour="food-tools"] .tile').nth(2).click();
    },
  },
  {
    name: "Exercise library",
    open: async (p) => {
      await tab(p, 2);
      await p.locator('[data-tour="log-activity"]').click();
    },
  },
  {
    name: "Plan food",
    open: async (p) => {
      await tab(p, 3);
      await p.locator('[data-tour="plan-tabs"] [role="tab"]').nth(1).click();
      await p.locator(".pill-list .chip").first().click();
    },
  },
];

test.describe("Every sheet, closed every way", () => {
  for (const sheet of SHEETS) {
    test(sheet.name, async ({ page }) => {
      const errors = await open(page);
      for (const way of CLOSE_WAYS) {
        await sheet.open(page);
        await closeTop(page, way);
        await expectFree(page, `${sheet.name}, closed by ${way}`);
        await tab(page, 0);
      }
      expect(errors).toEqual([]);
    });
  }

  test("Stacked sheets: an exercise's page over the library, closed in every order", async ({ page }) => {
    const errors = await open(page);
    const openBoth = async () => {
      await tab(page, 2);
      await page.locator('[data-tour="log-activity"]').click();
      await page.getByRole("dialog").last().locator(".row").first().click();
      await expect(page.getByRole("dialog")).toHaveCount(2);
    };
    for (const first of CLOSE_WAYS) {
      for (const second of CLOSE_WAYS) {
        await openBoth();
        await closeTop(page, first);
        // Only the top sheet closes; the library stays.
        await expect(page.getByRole("dialog")).toHaveCount(1);
        await closeTop(page, second);
        await expectFree(page, `exercise page closed by ${first}, then library by ${second}`);
      }
    }
    // The action that closes both at once.
    await openBoth();
    await page.getByRole("dialog").last().locator(".btn").last().click();
    await expectFree(page, "Log activity from an exercise's page");
    expect(errors).toEqual([]);
  });
});

/** A small, fast, repeatable random number generator, so a failing run can be replayed. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Taps a random user would make, minus the ones that wipe data, leave the app or start onboarding.
const OFF_LIMITS = /delete|remove|reset|erase|discard|restore|back up|export|share|download|add a person|switch to|camera|photo|English|Bahasa|中文|clock out|finish|log out|choose file/i;

for (const seed of [1, 2, 3]) {
  test(`Monkey run · seed ${seed}: 250 random taps never leave the app stuck`, async ({ page }) => {
    test.setTimeout(240_000);
    const errors = await open(page);
    const random = rng(seed * 7919);
    const pick = <T,>(xs: T[]) => xs[Math.floor(random() * xs.length)];
    let inSheet = 0;
    for (let step = 1; step <= 250; step++) {
      const sheets = await page.getByRole("dialog").count();
      inSheet = sheets ? inSheet + 1 : 0;
      if (sheets && inSheet > 6) {
        await closeTop(page, pick(CLOSE_WAYS)).catch(() => {});
        continue;
      }
      if (!sheets && random() < 0.15) {
        // (A sheet or the guide may be opening from the last tap.)
        await nav(page).nth(Math.floor(random() * 5)).click({ timeout: 2000 }).catch(() => {});
        continue;
      }
      // Something tappable on the top layer: inside the top sheet, or on the page.
      const scope = sheets ? page.getByRole("dialog").last() : page.locator(".app");
      const candidates = await scope.locator('button:not([disabled]), [role="tab"], input:not([type="file"])').evaluateAll((els, off) => {
        const re = new RegExp(off, "i");
        return els
          .map((el, i) => ({ i, el: el as HTMLElement }))
          .filter(({ el }) => {
            const r = el.getBoundingClientRect();
            if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > window.innerHeight) return false;
            const label = `${el.getAttribute("aria-label") ?? ""} ${el.innerText ?? ""}`;
            if (re.test(label)) return false;
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return !!hit && (hit === el || el.contains(hit));
          })
          .map(({ i, el }) => ({ i, input: el.tagName === "INPUT" }));
      }, OFF_LIMITS.source);
      if (!candidates.length) {
        await page.mouse.wheel(0, 400);
        continue;
      }
      const c = pick(candidates);
      const el = scope.locator('button:not([disabled]), [role="tab"], input:not([type="file"])').nth(c.i);
      if (c.input) await el.fill(String(Math.floor(random() * 300))).catch(() => {});
      else await el.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(120);

      if (step % 10 === 0) {
        expect(errors, `crashed by step ${step}`).toEqual([]);
        // Outside a sheet the page must always be scrollable and fit the screen.
        if (!(await page.getByRole("dialog").count()) && (await page.getByRole("navigation").count())) {
          await page.waitForTimeout(400);
          if (!(await page.getByRole("dialog").count())) await expectFree(page, `monkey seed ${seed}, step ${step}`);
          const tooWide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
          expect(tooWide, `page wider than the screen at step ${step}`).toBe(false);
        }
      }
    }
    // However it was left, closing what's open always gives a working page back.
    await closeAll(page);
    await expectFree(page, `end of monkey run ${seed}`);
    expect(errors).toEqual([]);
  });
}

for (const language of ["ms", "zh"] as const) {
  test(`UI scan in ${language === "ms" ? "Malay" : "Chinese"}: every tab and the main sheets`, async ({ page }) => {
    test.setTimeout(240_000);
    const errors = await open(page, { ...seedState(), language });
    const issues: Issue[] = [];
    const sheet = async (name: string, openIt: () => Promise<void>) => {
      await openIt();
      await audit(page, name, issues);
      await closeAll(page);
    };
    await audit(page, "Today", issues);
    await sheet("Body check", () => page.locator('[data-tour="body-check"]').first().click());
    await sheet("Progress", () => page.locator(".progress-link").click());
    await sheet("Cup size", () => page.locator(".water-cup").click());
    await sheet("Period calendar", () => page.getByTestId("cycle-card").getByRole("button").first().click());
    await tab(page, 1);
    await audit(page, "Food", issues);
    await page.getByLabel(/.+/).first().fill("nasi");
    await audit(page, "Food · search", issues);
    await sheet("Food · item", () => page.locator(".row").first().click());
    await tab(page, 2);
    await audit(page, "Train", issues);
    await sheet("Exercise library", () => page.locator('[data-tour="log-activity"]').click());
    await page.locator('[data-tour="log-activity"]').click();
    await page.getByRole("dialog").locator(".row").first().click();
    await audit(page, "Exercise page", issues);
    await closeAll(page);
    await tab(page, 3);
    await audit(page, "Plan · training", issues);
    await page.locator('[data-tour="plan-tabs"] [role="tab"]').nth(1).click();
    await audit(page, "Plan · nutrition", issues);
    await tab(page, 4);
    await audit(page, "Profile", issues);
    for (const y of [900, 1800, 2700, 3600]) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await audit(page, `Profile · ${y}px down`, issues);
    }
    const blocking = issues.filter((i) => i.kind !== "tap-target-small");
    expect(blocking, blocking.map((i) => `[${i.screen}] ${i.kind}: ${i.detail}`).join("\n")).toEqual([]);
    expect(errors).toEqual([]);
  });
}
