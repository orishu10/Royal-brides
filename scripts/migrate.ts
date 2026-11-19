// Applies pending migrations from /drizzle. Runs automatically before `npm start`.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { INITIAL_PRODUCTS } from "../src/lib/catalog";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
  // Default settings (only inserted if missing).
  await sql`insert into settings (key, value) values ('apply_access_code', '06130') on conflict do nothing`;

  // One-time import of the products from the old Wix store.
  // The flag makes sure this never runs again, even if all products are later deleted.
  const [flag] = await sql`insert into settings (key, value) values ('initial_products_seeded', 'yes')
                           on conflict do nothing returning key`;
  if (flag) {
    for (const [i, p] of INITIAL_PRODUCTS.entries()) {
      await sql`insert into products (name, category, price_agorot, sort_order)
                values (${p.name}, ${p.category}, ${p.price * 100}, ${i})`;
    }
    console.log(`seeded ${INITIAL_PRODUCTS.length} products`);
  }
  await sql.end();
  console.log("migrations applied");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
