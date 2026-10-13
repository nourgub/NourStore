// Browser tests of the core journeys against a real production build and a
// real (test) MySQL database — see tests/e2e/README.md. Never point
// DATABASE_URL at production: the tests create accounts and subscriptions.
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT || 3100);
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${PORT}`;
// The sandbox/CI may provide Chromium at a fixed path instead of a download.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    locale: "ar-DZ",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 5"], viewport: { width: 375, height: 800 }, launchOptions: executablePath ? { executablePath } : {} } },
    { name: "desktop", use: { viewport: { width: 1280, height: 860 }, launchOptions: executablePath ? { executablePath } : {} }, testMatch: /ui\.spec\.ts/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "node dist/index.js",
        url: `${baseURL}/api/health`,
        reuseExistingServer: true,
        timeout: 60_000,
        env: {
          NODE_ENV: "production",
          PORT: String(PORT),
          APP_BASE_URL: baseURL,
          AUTH_PROVIDER: "email",
          OWNER_OPEN_ID: "email_owner-e2e@tafawoq.test",
        },
      },
});
