import { defineConfig, devices } from "@playwright/test";

// End-to-end test of the whole bride journey in a real browser.
// Run: npm run test:e2e   (needs a local Postgres; uses the test database, which it resets)
const PORT = 3300;
export const E2E_DB = process.env.TEST_DATABASE_URL ?? "postgres://rb:rb@localhost:5432/royalbrides_test";
export const E2E_DATA = ".data/e2e";

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "he-IL",
    timezoneId: "Asia/Jerusalem",
    trace: "off",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    port: PORT,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: E2E_DB,
      APP_URL: `http://localhost:${PORT}`,
      SESSION_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e",
      ADMIN_NOTIFY_EMAIL: "bracha@example.com",
      RESEND_API_KEY: "",
      R2_BUCKET: "",
      TURNSTILE_SECRET_KEY: "",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
      LOCAL_EMAIL_DIR: `${E2E_DATA}/emails`,
      LOCAL_UPLOAD_DIR: `${E2E_DATA}/uploads`,
    },
  },
});
