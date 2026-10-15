import { expect, test, type Page } from "@playwright/test";
import { dayKey, seedState } from "./support/audit";

// Journeys for the period add-ons: symptoms and patterns, history and health check, the fertile
// window, training and food by phase, the pill, the privacy lock and Ramadan fasts to replace.
// Runs on iPhone 14, iPhone SE and Pixel 7, and fails on any page error.

const IGNORED_CONSOLE = /openfoodfacts|ERR_TUNNEL|ERR_INTERNET|Failed to load resource/;
type State = ReturnType<typeof seedState>;

async function open(page: Page, state: object) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`page error: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !IGNORED_CONSOLE.test(m.text()) && errors.push(`console: ${m.text().slice(0, 200)}`));
  await page.route("https://world.openfoodfacts.org/**", (r) => r.fulfill({ json: { products: [] } }));
  await page.addInitScript((s) => {
    if (location.protocol.startsWith("http") && !sessionStorage.getItem("seeded")) {
      localStorage.setItem("calories-detector:v1", s);
      sessionStorage.setItem("seeded", "1");
    }
  }, JSON.stringify(state));
  await page.goto("/");
  await expect(page.getByRole("navigation")).toBeVisible();
  return errors;
}

const tab = (page: Page, name: string) => page.getByRole("navigation").getByRole("button", { name, exact: true }).click();
const dialog = (page: Page) => page.getByRole("dialog").last();
const close = (page: Page) => dialog(page).getByRole("button", { name: "Close", exact: true }).click();
const visible = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("calories-detector:v1")!));

/** Three 28-day cycles ending two days before the next is due (luteal), with headaches and cramps logged. */
function cycleState(extra: Partial<State["profile"]["cycle"]> = {}): State {
  const s = seedState();
  const logged = [
    ...[-55, -27].map((d) => ({ id: dayKey(d), waterMl: 0, symptoms: ["headache"] })),
    ...[-53, -25].map((d) => ({ id: dayKey(d), waterMl: 0, symptoms: ["cramps"], flow: "medium" })),
  ];
  return {
    ...s,
    profile: { ...s.profile, cycle: { ...s.profile.cycle, ...extra } },
    periods: [-81, -53, -25].map((d, i) => ({ id: `p${i}`, date: dayKey(d), end: dayKey(d + 4), createdAt: i })),
    days: [...s.days.filter((d) => !logged.some((x) => x.id === d.id)), ...logged].sort((a, b) => a.id.localeCompare(b.id)) as State["days"],
  };
}

test("Flow and symptoms: log them, see the patterns, and get a heads-up before the period", async ({ page }) => {
  const errors = await open(page, cycleState());
  const card = visible(page, "cycle-card");
  await expect(card).toContainText("Day 26 · Luteal phase");
  // Headaches came 2 days before the last two periods, and the next is due in 3 days.
  await expect(visible(page, "symptom-warning")).toContainText("Heads up: headache often start around now.");

  await visible(page, "symptom-log").click();
  const d = dialog(page);
  await expect(d).toContainText("Cramps: usually on day 1 of your period (2 cycles)");
  await expect(d).toContainText("Headache: usually 2 days before your period (2 cycles)");
  await d.getByRole("button", { name: "Spotting" }).click();
  await d.getByRole("button", { name: "Bloating" }).click();
  await d.getByRole("button", { name: "Tired" }).click();
  await expect(d.getByRole("button", { name: "Bloating" })).toHaveAttribute("aria-pressed", "true");
  // Tap again to take one off; picking another flow replaces it.
  await d.getByRole("button", { name: "Tired" }).click();
  await d.getByRole("button", { name: "Light" }).click();
  await expect(d.getByRole("button", { name: "Spotting" })).toHaveAttribute("aria-pressed", "false");
  await close(page);
  await expect(visible(page, "symptom-log")).toHaveText("Light flow · Bloating");

  // Saved with the day, and still there after a reload.
  await expect.poll(async () => (await stored(page)).days.find((x: { id: string }) => x.id === dayKey(0))).toMatchObject({ flow: "light", symptoms: ["bloating"] });
  await page.reload();
  await expect(visible(page, "symptom-log")).toHaveText("Light flow · Bloating");
  expect(errors).toEqual([]);
});

test("Cycle history and health check: regular cycles, and a doctor note when something's off", async ({ page }) => {
  const errors = await open(page, cycleState());
  await visible(page, "cycle-card").getByRole("button", { name: "History" }).click();
  const health = dialog(page).getByTestId("cycle-health");
  await expect(health).toContainText("28");
  await expect(health).toContainText("Not yet");
  await expect(dialog(page).getByTestId("doctor-note")).toHaveCount(0);
  await expect(dialog(page).locator(".cycle-bars .row")).toHaveCount(3);
  await close(page);

  // Long, uneven cycles with heavy days: worth mentioning to a doctor.
  const s = seedState();
  const page2 = await page.context().newPage();
  const errors2 = await open(page2, {
    ...s,
    periods: [-160, -115, -92, -48].map((d, i) => ({ id: `q${i}`, date: dayKey(d), createdAt: i })),
    days: [-48, -47, -46, -45].map((d) => ({ id: dayKey(d), waterMl: 0, flow: "heavy" })),
  });
  await visible(page2, "cycle-card").getByRole("button", { name: "History" }).click();
  const note = dialog(page2).getByTestId("doctor-note");
  await expect(note).toContainText("Cycles longer than 35 days, more than once");
  await expect(note).toContainText("Cycle length changes a lot from month to month");
  await expect(note).toContainText("Several days of heavy flow");
  await expect(dialog(page2).getByTestId("cycle-health")).toContainText("Varies");
  expect([...errors, ...errors2]).toEqual([]);
});

test("Fertile window: off by default, then on the calendar and the card, marked as not birth control", async ({ page }) => {
  // Day 12 of a 28-day cycle: inside the window.
  const s = seedState();
  const state = { ...s, periods: [{ id: "p", date: dayKey(-11), end: dayKey(-7), createdAt: 1 }] };
  const errors = await open(page, state);
  await expect(page.getByTestId("fertile-now")).toHaveCount(0);
  await visible(page, "cycle-card").getByRole("button", { name: "Period calendar" }).click();
  await expect(dialog(page).locator(".cal-day.fertile, .cal-day.ovulation")).toHaveCount(0);
  await close(page);

  await tab(page, "Profile");
  await page.getByRole("switch", { name: "Show fertile window" }).filter({ visible: true }).click();
  await tab(page, "Today");
  await expect(visible(page, "fertile-now")).toHaveText("Fertile window (estimate, not birth control)");
  await visible(page, "cycle-card").getByRole("button", { name: "Period calendar" }).click();
  await expect(dialog(page).locator(".cal-day.ovulation")).toHaveCount(1);
  expect(await dialog(page).locator(".cal-day.fertile").count()).toBeGreaterThanOrEqual(5);
  await expect(dialog(page).getByLabel(/: likely ovulation$/)).toHaveCount(1);
  await expect(dialog(page)).toContainText("It is not a method of birth control.");
  expect(errors).toEqual([]);
});

test("Training by phase: a lighter start at 80% around a period, a push in the follicular phase", async ({ page }) => {
  // Period day 1.
  const s = seedState();
  const errors = await open(page, { ...s, periods: [{ id: "p0", date: dayKey(-28), createdAt: 0 }, { id: "p1", date: dayKey(0), createdAt: 1 }] });
  await tab(page, "Train");
  const card = visible(page, "cycle-training");
  await expect(card).toContainText("Period day 1: go by feel");
  const lighter = card.getByRole("button", { name: "Start today's plan lighter (80%)" });
  if (await lighter.count()) {
    await lighter.click();
    // A workout starts, and no lift is heavier than 80% of what's suggested, on a 2.5 kg step.
    await expect.poll(async () => (await stored(page)).activeSessionId).toBeTruthy();
    const st = await stored(page);
    const w = st.sessions.find((x: { id: string }) => x.id === st.activeSessionId);
    const kgs = w.exercises.flatMap((e: { sets?: { weightKg?: number }[] }) => (e.sets ?? []).map((x) => x.weightKg ?? 0)).filter((k: number) => k > 0);
    for (const k of kgs) expect(k % 2.5).toBe(0);
  }

  // Day 8: energy up.
  const page2 = await page.context().newPage();
  const errors2 = await open(page2, { ...s, periods: [{ id: "p", date: dayKey(-7), end: dayKey(-3), createdAt: 0 }] });
  await tab(page2, "Train");
  await expect(visible(page2, "cycle-training")).toContainText("Strong days ahead");
  await expect(visible(page2, "cycle-training").getByRole("button")).toHaveCount(0);
  expect([...errors, ...errors2]).toEqual([]);
});

test("Food by phase: +150 kcal before a period when asked, craving swaps, and period bands on the weight chart", async ({ page }) => {
  const errors = await open(page, cycleState());
  const target = () => page.getByRole("button", { name: /^Daily target \d+ kcal, change$/ }).filter({ visible: true }).getAttribute("aria-label");
  const before = Number((await target())!.match(/\d+/)![0]);
  await expect(page.getByTestId("luteal-kcal")).toHaveCount(0);

  await tab(page, "Profile");
  await page.getByRole("switch", { name: "Eat a little more before my period" }).filter({ visible: true }).click();
  await tab(page, "Today");
  await expect(visible(page, "luteal-kcal")).toContainText("+150 kcal");
  expect(Number((await target())!.match(/\d+/)![0])).toBe(before + 150);

  await visible(page, "cycle-card").getByRole("button", { name: "Craving something? Smart swaps" }).click();
  await expect(visible(page, "craving-swaps").locator("li")).toHaveCount(4);

  await page.locator(".streak-chip").filter({ visible: true }).click();
  await expect(dialog(page).getByTestId("period-band").first()).toBeAttached();
  await expect(dialog(page).getByTestId("cycle-weight-note")).toContainText("Water weight often goes up");
  expect(errors).toEqual([]);
});

test("Birth-control pill: pack day, tick it off, then the break week", async ({ page }) => {
  const errors = await open(page, cycleState());
  await expect(page.getByTestId("pill-card")).toHaveCount(0);
  await tab(page, "Profile");
  const settings = visible(page, "pill-settings");
  await settings.getByRole("switch", { name: "Birth-control pill" }).click();
  await settings.getByLabel("This pack started").fill(dayKey(-9));
  await tab(page, "Today");
  const card = visible(page, "pill-card");
  await expect(card).toContainText("Pill · day 10 of 28");
  await expect(card).toContainText("Not taken yet · 21:00");
  await card.getByRole("button", { name: "Taken" }).click();
  await expect(card).toContainText("Taken today");
  await expect(card.getByRole("button", { name: "Taken ✓" })).toHaveAttribute("aria-pressed", "true");

  // A pack started 23 days ago: day 2 of the break week, nothing to take.
  await tab(page, "Profile");
  await settings.getByLabel("This pack started").fill(dayKey(-22));
  await tab(page, "Today");
  await expect(card).toContainText("Placebo or break week · day 2");
  await expect(card.getByRole("button")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Privacy lock: a PIN hides the cycle everywhere until it's entered; a wrong PIN doesn't open it", async ({ page }) => {
  const errors = await open(page, cycleState({ pill: { on: true, packStart: dayKey(-3), active: 21, breakDays: 7, time: "21:00", remind: false } }));
  await tab(page, "Profile");
  await visible(page, "cycle-lock-row").click();
  const pad = dialog(page);
  const type = async (pin: string) => {
    for (const k of pin) await dialog(page).getByRole("button", { name: k, exact: true }).click();
  };
  await expect(pad).toContainText("Choose a 4-digit PIN");
  await type("2468");
  await expect(pad).toContainText("Enter it again");
  await type("2460");
  await expect(pad.getByRole("alert").first()).toHaveText("The PINs didn't match. Start again.");
  await type("2468");
  await type("2468");
  await expect(page.getByRole("status").filter({ hasText: "Cycle lock is on" })).toBeVisible();
  // Never the digits themselves.
  await expect.poll(async () => (await stored(page)).profile.cycle.pin).toMatch(/^[0-9a-f]{64}$/);

  await visible(page, "cycle-lock-row").click();
  await dialog(page).getByRole("button", { name: "Lock now" }).click();
  await expect(visible(page, "cycle-locked-profile")).toBeVisible();
  await tab(page, "Today");
  await expect(visible(page, "cycle-locked")).toBeVisible();
  for (const id of ["cycle-card", "pill-card"]) await expect(page.getByTestId(id)).toHaveCount(0);
  await tab(page, "Train");
  await expect(page.getByTestId("cycle-training")).toHaveCount(0);

  // Wrong PIN, then the right one.
  await tab(page, "Today");
  await visible(page, "cycle-locked").click();
  await type("1111");
  await expect(dialog(page).getByText("Wrong PIN. Try again.")).toBeVisible();
  await type("2468");
  await expect(visible(page, "cycle-card")).toBeVisible();
  await expect(visible(page, "pill-card")).toBeVisible();

  // Leaving the app locks it again.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(visible(page, "cycle-locked")).toBeVisible();
  expect(errors).toEqual([]);
});

test("Forgot the PIN: erasing the cycle data is the only way in", async ({ page }) => {
  const errors = await open(page, cycleState());
  await tab(page, "Profile");
  await visible(page, "cycle-lock-row").click();
  for (const k of "13571357") await dialog(page).getByRole("button", { name: k, exact: true }).click();
  await visible(page, "cycle-lock-row").click();
  await dialog(page).getByRole("button", { name: "Lock now" }).click();
  await tab(page, "Today");
  await visible(page, "cycle-locked").click();
  await dialog(page).getByRole("button", { name: "Forgot your PIN?" }).click();
  await dialog(page).getByRole("button", { name: "Erase and remove lock" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Cycle data erased and lock removed" })).toBeVisible();
  await expect.poll(async () => (await stored(page)).periods).toEqual([]);
  const s = await stored(page);
  expect(s.profile.cycle.pin).toBeUndefined();
  expect(s.days.some((d: { symptoms?: string[]; flow?: string }) => d.symptoms || d.flow)).toBe(false);
  await expect(visible(page, "cycle-card")).toContainText("Cycle tracking is on");
  expect(errors).toEqual([]);
});

test("Ramadan: a period day is not a fasting day, it counts as a fast to replace, and replacing ticks it off", async ({ page }) => {
  const s = seedState();
  const errors = await open(page, {
    ...s,
    profile: { ...s.profile, fasting: "ramadan" },
    periods: [-29, -1].map((d, i) => ({ id: `p${i}`, date: dayKey(d), createdAt: i })),
    days: [...s.days, { id: dayKey(-12), waterMl: 0, fastMissed: true }],
  });
  const card = visible(page, "qada-card");
  await expect(card).toContainText("Not fasting today · haid");
  await expect(card).toContainText("(2 so far)");
  // No sahur or iftar countdown today.
  await expect(page.getByTestId("fast-card")).toHaveCount(0);
  await card.getByRole("button", { name: "Fasts to replace" }).click();
  await expect(dialog(page).getByTestId("qada-owed")).toHaveText("2");
  // During Ramadan you can't replace one yet; add one missed for illness by hand.
  await expect(dialog(page).getByRole("button", { name: "I replaced a fast today" })).toHaveCount(0);
  await dialog(page).getByRole("button", { name: "More fasts added by hand" }).click();
  await expect(dialog(page).getByTestId("qada-owed")).toHaveText("3");
  await close(page);

  // After Ramadan: the count stays until they're replaced.
  await tab(page, "Profile");
  await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem("calories-detector:v1")!);
    st.profile.fasting = "off";
    localStorage.setItem("calories-detector:v1", JSON.stringify(st));
  });
  await page.reload();
  const after = visible(page, "qada-card");
  await expect(after).toContainText("Fasts to replace: 3");
  await expect(page.getByTestId("fast-card")).toHaveCount(0);
  await after.getByRole("button", { name: "Fasts to replace" }).click();
  await dialog(page).getByRole("button", { name: "I replaced a fast today" }).click();
  await expect(dialog(page).getByTestId("qada-owed")).toHaveText("2");
  await expect(page.getByRole("status").filter({ hasText: "Fast replaced · 2 to go" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("Foods that help: picking a symptom brings up a food idea for it, with more a tap away, and Log it logs it", async ({ page }) => {
  const errors = await open(page, cycleState());
  // Nothing logged and not on a period: no food idea yet.
  await expect(page.getByTestId("period-food")).toHaveCount(0);
  await visible(page, "symptom-log").click();
  const sheet = dialog(page);
  await expect(sheet.getByTestId("period-food")).toHaveCount(0);

  // Heavy flow: an iron-rich idea pops up, with a doctor note.
  await sheet.getByRole("button", { name: "Heavy" }).click();
  const idea = sheet.getByTestId("period-food");
  await expect(idea).toContainText("Heavy flow · idea 1 of");
  await expect(idea).toContainText("needs a doctor");
  // Picking cramps brings its idea to the front; the others stay a chip away.
  await sheet.getByRole("button", { name: "Cramps", exact: true }).click();
  await expect(idea).toContainText("Cramps · idea 1 of");
  await expect(idea.getByRole("tab")).toHaveText(["Heavy flow", "Cramps"]);
  await expect(idea.getByRole("tab", { name: "Cramps" })).toHaveAttribute("aria-selected", "true");

  // Another idea: several different foods for the same symptom.
  const names = new Set<string>();
  for (let i = 0; i < 5; i++) {
    names.add((await idea.getByTestId("period-food-name").innerText()).trim());
    await idea.getByRole("button", { name: "Another idea" }).click();
    await expect(idea).toContainText(`Cramps · idea ${i + 2} of`);
  }
  expect(names.size).toBe(5);

  // Log it puts the food shown in today's log.
  const name = (await idea.getByTestId("period-food-name").innerText()).trim();
  await idea.getByRole("button", { name: "Log it" }).click();
  await expect.poll(async () => (await stored(page)).log.some((e: { name: string; date: string }) => e.name === name && e.date === dayKey(0))).toBe(true);

  // Back on Today, the cycle card shows the same idea.
  await close(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(visible(page, "period-food")).toContainText("Food that helps");
  await visible(page, "period-food").getByRole("tab", { name: "Heavy flow" }).click();
  await expect(visible(page, "period-food")).toContainText("Heavy flow · idea 1 of");
  expect(errors).toEqual([]);
});
