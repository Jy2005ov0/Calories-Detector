import { defineConfig } from "vitest/config";

// Unit tests only; the Playwright user journeys in e2e/ run with `npm run test:e2e`.
export default defineConfig({
  test: { include: ["src/**/*.test.ts", "server/**/*.test.ts"] },
});
