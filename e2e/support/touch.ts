import type { Page } from "@playwright/test";

/**
 * A real finger swipe (touch events, like a phone), not a mouse drag: the browser may claim it as
 * a scroll, exactly as on a device.
 */
export async function fingerSwipe(page: Page, from: [number, number], to: [number, number], { steps = 12, ms = 180 } = {}) {
  const cdp = await page.context().newCDPSession(page);
  const point = (x: number, y: number) => [{ x, y, id: 1, radiusX: 8, radiusY: 8, force: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(...from) });
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t) });
    await page.waitForTimeout(ms / steps);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
  await page.waitForTimeout(500);
}

/** A finger put down, moved in steps and lifted separately, to check the screen mid-gesture. */
export async function finger(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  let at: [number, number] = [0, 0];
  const point = (x: number, y: number) => [{ x, y, id: 1, radiusX: 8, radiusY: 8, force: 1 }];
  return {
    down: async (x: number, y: number) => {
      at = [x, y];
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(x, y) });
    },
    move: async (x: number, y: number, steps = 10) => {
      const [x0, y0] = at;
      for (let i = 1; i <= steps; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(x0 + ((x - x0) * i) / steps, y0 + ((y - y0) * i) / steps) });
        await page.waitForTimeout(12);
      }
      at = [x, y];
    },
    up: async () => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await cdp.detach();
      await page.waitForTimeout(700);
    },
  };
}
