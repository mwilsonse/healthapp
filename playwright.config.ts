import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src/tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry"
  },
  webServer: {
    command: "pnpm run build && pnpm start",
    env: {
      APP_BASE_URL: "http://localhost:3000",
      APP_SECRET: "test-secret",
      DATABASE_URL:
        "postgresql://phip:phip-dev-password@localhost:5432/phip?schema=public"
    },
    timeout: 120_000,
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
