import { devices, expect, test } from "@playwright/test";

// Regression: on a 320 px phone a long name plus the family avatar and streak chip pushed the
// greeting past the edge (only in the afternoon, and only with CI's wider fonts).
test("Today's title row never spills on a small phone, whatever the greeting or font", async ({ browser }, info) => {
  test.skip(info.project.name !== "iPhone 14", "checks several devices itself");
  for (const d of ["iPhone SE", "Galaxy S9+"]) {
    const ctx = await browser.newContext({ ...devices[d], baseURL: test.info().project.use.baseURL });
    const page = await ctx.newPage();
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("calories-detector:v1", JSON.stringify({ profile: { name: "Aisyah binti Abdullah", sex: "female", onboarded: true }, introDone: true, tourDone: true,
        log: [{ id: "l", date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`, meal: "lunch", name: "x", grams: 1, nutrients: { kcal: 1, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, satFat: 0, sodium: 0 }, source: "db", createdAt: 1 }],
        personId: "me", people: [{ id: "mum", data: { profile: { name: "Mum", onboarded: true } } }] }));
      localStorage.setItem("calories-detector:account", JSON.stringify({ guest: true }));
    });
    await page.reload();
    await expect(page.locator(".streak-chip")).toBeVisible();
    // Wider than any real greeting, to stand in for wider fonts.
    await page.evaluate(() => {
      const h = document.querySelector(".title-row .large-title")!;
      h.firstChild!.textContent = "Selamat petang yang panjangnya";
    });
    const r = await page.evaluate(() => {
      const row = document.querySelector(".title-row") as HTMLElement;
      const chip = document.querySelector(".streak-chip")!.getBoundingClientRect();
      const av = document.querySelector('[aria-label="Switch person"]')!.getBoundingClientRect();
      return { spill: row.scrollWidth - row.clientWidth, chipRight: chip.right, avRight: av.right, vw: window.innerWidth };
    });
    expect(r.spill).toBeLessThanOrEqual(0);
    expect(r.chipRight).toBeLessThanOrEqual(r.vw);
    expect(r.avRight).toBeLessThanOrEqual(r.vw);
    await ctx.close();
  }
});
