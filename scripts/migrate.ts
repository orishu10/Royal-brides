// Applies pending migrations from /drizzle. Runs automatically before `npm start`.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 1 });
  await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
  // Default settings (only inserted if missing).
  await sql`insert into settings (key, value) values ('apply_access_code', '06130') on conflict do nothing`;
  await sql.end();
  console.log("migrations applied");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
