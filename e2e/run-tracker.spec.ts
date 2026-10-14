import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { seedState } from "./support/audit";
import { fakeMapTiles } from "./support/mapTiles";

// The GPS run tracker: the street map, the GPS signal, pace now, auto-pause, and a run that keeps
// going on other tabs and through the app being reopened. Locations come from the browser's
// pretend GPS; map tiles are stand-ins (the real ones come from the internet).

const IGNORED_CONSOLE = /openfoodfacts|ERR_TUNNEL|ERR_INTERNET|Failed to load resource/;
const START = { latitude: 3.1478, longitude: 101.6953 };

async function open(page: Page, context: BrowserContext) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`page error: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !IGNORED_CONSOLE.test(m.text()) && errors.push(`console: ${m.text().slice(0, 200)}`));
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ ...START, accuracy: 6 });
  await fakeMapTiles(context);
  await page.route("https://world.openfoodfacts.org/**", (r) => r.fulfill({ json: { products: [] } }));
  await page.addInitScript((s) => {
    if (location.protocol.startsWith("http") && !sessionStorage.getItem("seeded")) {
      localStorage.setItem("calories-detector:v1", s);
      sessionStorage.setItem("seeded", "1");
    }
  }, JSON.stringify(seedState()));
  await page.goto("/");
  await expect(page.getByRole("navigation")).toBeVisible();
  return errors;
}

const tab = (page: Page, name: string) => page.getByRole("navigation").getByRole("button", { name, exact: true }).click();
const tracker = (page: Page) => page.getByRole("dialog", { name: "Track a run" });
const openTracker = async (page: Page) => {
  await tab(page, "Train");
  await page.getByRole("button", { name: /Track a run/ }).filter({ visible: true }).click();
  await expect(tracker(page)).toBeVisible();
};
const km = async (page: Page) => Number((await tracker(page).getByTestId("run-stats").locator(".stat-value").first().innerText()).replace(/[^\d.]/g, ""));
const clock = (page: Page) => tracker(page).getByTestId("run-stats").locator(".stat", { hasText: "Time" }).locator(".stat-value");

/** Jog north: ~7 m every `ms`, a steady 5-minute-km pace at one a second... and a bit faster here. */
async function jog(page: Page, context: BrowserContext, from: { lat: number }, steps: number, ms = 1500) {
  for (let i = 0; i < steps; i++) {
    await page.waitForTimeout(ms);
    from.lat += 0.00006;
    await context.setGeolocation({ latitude: from.lat, longitude: START.longitude, accuracy: 6 });
  }
}

test("The tracker shows a street map with where you are and how good the GPS is, before you start", async ({ page, context }) => {
  const errors = await open(page, context);
  await openTracker(page);
  const map = tracker(page).getByTestId("run-map");
  await expect(map.locator("img.leaflet-tile-loaded").first()).toBeVisible();
  // The blue dot (and its accuracy ring).
  await expect(map.locator("path.leaflet-interactive, path[fill='#0a84ff']").first()).toBeAttached();
  await expect(tracker(page).getByTestId("gps-signal")).toHaveText("Good GPS");
  await expect(map).toContainText("OpenStreetMap");
  // A wobbly fix: weak GPS.
  await context.setGeolocation({ ...START, accuracy: 60 });
  await expect(tracker(page).getByTestId("gps-signal")).toHaveText("Weak GPS");
  expect(errors).toEqual([]);
});

test("A run draws on the map, shows pace now, and only counts good GPS readings", async ({ page, context }) => {
  test.setTimeout(90_000);
  const errors = await open(page, context);
  await openTracker(page);
  await tracker(page).getByRole("button", { name: "Start", exact: true }).click();
  const at = { lat: START.latitude };
  await jog(page, context, at, 14);
  await expect.poll(() => km(page)).toBeGreaterThan(0.06);
  // The route is drawn: a line with the start dot.
  await expect(tracker(page).getByTestId("run-map").locator("path.leaflet-interactive").first()).toBeAttached();
  await expect(tracker(page).getByTestId("pace-now")).toHaveText(/^\d:\d\d\/km$/);
  // A reading 300 m away with poor accuracy doesn't add 300 m.
  const before = await km(page);
  await context.setGeolocation({ latitude: at.lat + 0.0027, longitude: START.longitude, accuracy: 80 });
  await page.waitForTimeout(1500);
  expect(await km(page)).toBeLessThan(before + 0.02);
  expect(errors).toEqual([]);
});

test("A run keeps going on other tabs and when the app is reopened", async ({ page, context }) => {
  test.setTimeout(120_000);
  const errors = await open(page, context);
  await openTracker(page);
  // Standing still while switching tabs would auto-pause the clock; this run is about distance.
  await tracker(page).getByRole("switch", { name: "Auto-pause" }).click();
  await tracker(page).getByRole("button", { name: "Start", exact: true }).click();
  const at = { lat: START.latitude };
  await jog(page, context, at, 6);
  const first = await km(page);
  expect(first).toBeGreaterThan(0.02);
  // Close it and go to Today and Profile (Train isn't even ready in the background there).
  await tracker(page).getByRole("button", { name: "Close", exact: true }).click();
  await tab(page, "Today");
  await tab(page, "Profile");
  await jog(page, context, at, 6);
  await tab(page, "Today");
  await openTracker(page);
  await expect(tracker(page).getByRole("button", { name: "Pause" })).toBeVisible();
  expect(await km(page)).toBeGreaterThan(first + 0.02);

  // The app closes mid-run (or the phone restarts it): it opens still running, route and all.
  const sofar = await km(page);
  await page.reload();
  await openTracker(page);
  await expect(tracker(page).getByRole("button", { name: "Pause" })).toBeVisible();
  expect(await km(page)).toBeGreaterThanOrEqual(sofar - 0.001);
  // The clock is right straight away, not stuck at when the sheet was last open.
  const [m, sec] = (await clock(page).innerText()).split(":").map(Number);
  expect(m * 60 + sec).toBeGreaterThanOrEqual(15);
  await jog(page, context, at, 8);
  await expect.poll(() => km(page)).toBeGreaterThan(sofar + 0.02);

  await tracker(page).getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /Saved 0\.\d\d km/ })).toBeVisible();
  // Nothing left running.
  expect(await page.evaluate(() => localStorage.getItem("w:run-in-progress"))).toBeNull();
  expect(errors).toEqual([]);
});

test("Auto-pause: standing still stops the clock, moving starts it again, and it can be turned off", async ({ page, context }) => {
  test.setTimeout(120_000);
  const errors = await open(page, context);
  await openTracker(page);
  await tracker(page).getByRole("button", { name: "Start", exact: true }).click();
  const at = { lat: START.latitude };
  await jog(page, context, at, 5);
  // Stand still.
  await expect(tracker(page).getByTestId("auto-paused")).toBeVisible({ timeout: 20_000 });
  const stopped = await clock(page).innerText();
  await page.waitForTimeout(3000);
  await expect(clock(page)).toHaveText(stopped);
  await expect(tracker(page).getByTestId("pace-now")).toHaveText("–/km");
  // Off again.
  await jog(page, context, at, 2, 800);
  await expect(tracker(page).getByTestId("auto-paused")).toHaveCount(0);
  await expect(clock(page)).not.toHaveText(stopped, { timeout: 5000 });

  // With auto-pause off, standing still keeps the clock going.
  await tracker(page).getByRole("switch", { name: "Auto-pause" }).click();
  const t0 = await clock(page).innerText();
  await page.waitForTimeout(15_000);
  await expect(tracker(page).getByTestId("auto-paused")).toHaveCount(0);
  await expect(clock(page)).not.toHaveText(t0);
  await tracker(page).getByRole("button", { name: "Discard" }).click();
  await expect(tracker(page).getByRole("button", { name: "Start", exact: true })).toBeVisible();
  expect(await km(page)).toBe(0);
  expect(errors).toEqual([]);
});
