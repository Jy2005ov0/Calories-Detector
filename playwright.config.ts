import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;

// User-journey tests run the production build on emulated phones.
// Chromium is used for every device so the suite runs anywhere; the device profiles
// supply the real viewport, pixel ratio, touch and user agent.
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "en-MY",
    timezoneId: "Asia/Kuala_Lumpur",
    trace: "retain-on-failure",
    // Fail fast with a clear message if an element never appears.
    actionTimeout: 15_000,
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "iPhone 14", use: { ...devices["iPhone 14"], browserName: "chromium" } },
    { name: "iPhone SE", use: { ...devices["iPhone SE"], browserName: "chromium" } },
    { name: "Pixel 7", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
