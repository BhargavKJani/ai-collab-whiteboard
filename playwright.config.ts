import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT || 3417);
export const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node server/ws.mjs",
      url: "http://localhost:1234",
      reuseExistingServer: true,
    },
    {
      // Demo mode is forced so e2e never calls the real API.
      command: `npx next start -p ${PORT}`,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      env: { AI_MODE: "mock" },
      timeout: 120_000,
    },
  ],
});
