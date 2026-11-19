import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export async function getSetting(key: string): Promise<string | undefined> {
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
  return row?.value;
}
