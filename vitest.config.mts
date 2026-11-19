import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/server-only-stub.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://rb:rb@localhost:5432/royalbrides_test",
      APP_URL: "http://localhost:3000",
      SESSION_SECRET: "test-secret-test-secret-test-secret-123",
      ADMIN_NOTIFY_EMAIL: "admin@example.com",
      RESEND_API_KEY: "",
      R2_BUCKET: "",
    },
    fileParallelism: false,
  },
});
