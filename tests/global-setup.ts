import { execSync } from "node:child_process";

// Applies migrations to the test database once before all tests.
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://rb:rb@localhost:5432/royalbrides_test";
  execSync("npx tsx scripts/migrate.ts", { env: { ...process.env, DATABASE_URL: url }, stdio: "inherit" });
}
