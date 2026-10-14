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
