// Creates an admin user, or resets the password of an existing one.
// Usage: npm run admin:create -- <email> <manager|maintainer> "<name>" <password>
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { admins } from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/password";

type Role = "manager" | "maintainer";

async function main() {
  const [email, role, name, password] = process.argv.slice(2);
  if (!email || !["manager", "maintainer"].includes(role) || !name || !password) {
    console.error('Usage: npm run admin:create -- <email> <manager|maintainer> "<name>" <password>');
    process.exit(1);
  }
  if (password.length < 10) throw new Error("Password must be at least 10 characters");
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const passwordHash = await hashPassword(password);
  await drizzle(sql)
    .insert(admins)
    .values({ email: email.toLowerCase(), role: role as Role, name, passwordHash })
    .onConflictDoUpdate({ target: admins.email, set: { passwordHash, name, role: role as Role } });
  await sql.end();
  console.log(`admin ${email} saved`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
