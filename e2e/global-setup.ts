import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import postgres from "postgres";
import { E2E_DATA, E2E_DB } from "../playwright.config";

// Fresh state for every run: empty test DB (+ migrations, seeded products), one admin, no emails/files.
export default async function globalSetup() {
  rmSync(E2E_DATA, { recursive: true, force: true });
  const sql = postgres(E2E_DB, { max: 1, onnotice: () => {} });
  await sql`drop schema if exists public cascade`;
  await sql`drop schema if exists drizzle cascade`;
  await sql`create schema public`;
  await sql.end();
  const env = { ...process.env, DATABASE_URL: E2E_DB };
  execSync("npx tsx scripts/migrate.ts", { env, stdio: "inherit" });
  execSync('npx tsx scripts/create-admin.ts bracha@example.com manager "ברכה" "E2e-Password-1"', { env, stdio: "inherit" });
}
