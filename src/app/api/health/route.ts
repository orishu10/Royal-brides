import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// For the uptime monitor and Render's health check: the app is up AND the database answers.
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
