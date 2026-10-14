import type { BrowserContext, Page } from "@playwright/test";

/**
 * Stand-in street map tiles for tests and screenshots (the real tiles come from the internet).
 * Draws a made-up town that joins up across tiles: a grid of streets, a few avenues, a park and a
 * river, in the light or dark map colours.
 */
export async function fakeMapTiles(target: Page | BrowserContext) {
  await target.route(/basemaps\.cartocdn\.com\/.+\/(\d+)\/(\d+)\/(\d+)(@2x)?\.png/, (route) => {
    const m = route.request().url().match(/\/(voyager|dark_all)\/(\d+)\/(\d+)\/(\d+)/)!;
    const dark = m[1] === "dark_all";
    const [z, x, y] = [Number(m[2]), Number(m[3]), Number(m[4])];
    route.fulfill({ contentType: "image/svg+xml", body: tile(z, x, y, dark) });
  });
}

// A repeatable "random" number for a whole number.
const rnd = (n: number) => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

function tile(z: number, tx: number, ty: number, dark: boolean) {
  const c = dark
    ? { land: "#1f2124", street: "#3a3d42", avenue: "#55595f", park: "#1f3326", water: "#17283a", block: "#26292d" }
    : { land: "#f4f1ea", street: "#ffffff", avenue: "#fde6b4", park: "#d4ecd0", water: "#aad3ef", block: "#ebe6dc" };
  // Streets every ~110 m, in global pixels at this zoom.
  const scale = 2 ** (z - 16);
  const step = 72 * scale;
  const x0 = tx * 256;
  const y0 = ty * 256;
  const parts: string[] = [`<rect width="256" height="256" fill="${c.land}"/>`];
  if (step >= 6) {
    const i0 = Math.floor(x0 / step) - 1;
    const j0 = Math.floor(y0 / step) - 1;
    const n = Math.ceil(256 / step) + 2;
    for (let i = i0; i < i0 + n; i++)
      for (let j = j0; j < j0 + n; j++) {
        const gx = i * step + 8 * scale - x0;
        const gy = j * step + 8 * scale - y0;
        const r = rnd(i * 7919 + j);
        const fill = r < 0.08 ? c.park : r < 0.1 ? c.water : c.block;
        parts.push(`<rect x="${gx.toFixed(1)}" y="${gy.toFixed(1)}" width="${(step - 16 * scale).toFixed(1)}" height="${(step - 16 * scale).toFixed(1)}" rx="${3 * scale}" fill="${fill}"/>`);
      }
    for (let i = i0; i < i0 + n; i++) {
      const gx = i * step - x0;
      const big = rnd(i) < 0.2;
      parts.push(`<rect x="${(gx - (big ? 6 : 3) * scale).toFixed(1)}" y="0" width="${((big ? 12 : 6) * scale).toFixed(1)}" height="256" fill="${big ? c.avenue : c.street}"/>`);
    }
    for (let j = j0; j < j0 + n; j++) {
      const gy = j * step - y0;
      const big = rnd(j + 1000) < 0.2;
      parts.push(`<rect x="0" y="${(gy - (big ? 6 : 3) * scale).toFixed(1)}" width="256" height="${((big ? 12 : 6) * scale).toFixed(1)}" fill="${big ? c.avenue : c.street}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${parts.join("")}</svg>`;
}
