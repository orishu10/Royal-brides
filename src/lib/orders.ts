import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export type OrderWithItems = typeof schema.orders.$inferSelect & { items: (typeof schema.orderItems.$inferSelect)[] };

export async function getOrderForBride(brideId: string): Promise<OrderWithItems | null> {
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.brideId, brideId));
  if (!order) return null;
  const items = await db
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, order.id))
    .orderBy(asc(schema.orderItems.name));
  return { ...order, items };
}

/** Active products for the catalog, in display order. */
export function listActiveProducts() {
  return db
    .select()
    .from(schema.products)
    .where(eq(schema.products.active, true))
    .orderBy(asc(schema.products.sortOrder), asc(schema.products.name));
}
