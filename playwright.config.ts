import { defineConfig, devices } from "@playwright/test";

/**
 * The suite runs against a real dev server with a freshly seeded database, so the tests
 * exercise the same code path a person does.
 *
 * `executablePath` points at the Chromium already on this machine. Playwright normally
 * downloads a browser build matched to its own version; where one is pre-installed (CI
 * images, sandboxes), CHROMIUM_PATH avoids a download that would otherwise fail.
 */
const chromiumPath = process.env.CHROMIUM_PATH;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"]],
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
  },

  projects: [
    // Signs in once and saves the session; see tests/e2e/auth.setup.ts for why.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/admin.json" },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
  ],

  webServer: {
    // Seeds first so every run starts from the same catalogue and an empty inbox.
    command: "npm run seed && npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
