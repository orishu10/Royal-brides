import "server-only";
import { and, eq, gte, inArray, isNull, lt, notExists, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Bride } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import { MAX_QUANTITY_PER_LINE } from "@/lib/catalog";
import {
  approvedEmail,
  newOrderAdminEmail,
  orderConfirmationEmail,
  pickupReminderEmail,
  pickupScheduledEmail,
  rejectedEmail,
  type OrderLine,
} from "@/lib/email/templates";
import { env } from "@/lib/env";
import { dateToIsraelLocal, formatDate, formatDateTime, formatShekels, israelLocalToDate, israelWeekday, todayInIsrael } from "@/lib/format";

/*
 * The life of a bride's file – every status change goes through this file.
 *
 *   submitted ──approve──► approved ──(bride orders)──► ordered ──schedulePickup──► pickup_scheduled ──close──► archived
 *       │                     │
 *       └──────reject─────────┴──► rejected ──close──► archived
 *
 * Each step: checks the current status, updates in one DB transaction,
 * writes an event to the history, and sends the matching email.
 */

export type Actor = { email: string };
export type WorkflowResult = { ok: true } | { ok: false; error: string };

type Status = Bride["status"];

/** Atomically moves a bride from one of `from` statuses, or returns null if she wasn't in one. */
async function transition(
  brideId: string,
  from: Status[],
  set: Partial<typeof schema.brides.$inferInsert>,
  event: { actor: Actor; type: string; payload?: Record<string, unknown> },
): Promise<Bride | null> {
  return db.transaction(async (tx) => {
    const [bride] = await tx
      .update(schema.brides)
      .set({ ...set, updatedAt: new Date() })
      .where(
        and(eq(schema.brides.id, brideId), inArray(schema.brides.status, from), isNull(schema.brides.archivedAt)),
      )
      .returning();
    if (!bride) return null;
    await tx.insert(schema.events).values({
      brideId,
      actor: event.actor.email,
      type: event.type,
      payload: event.payload ?? {},
    });
    return bride;
  });
}

export async function approveBride(
  brideId: string,
  actor: Actor,
  input: { amountAgorot: number; expiresOn: string },
): Promise<WorkflowResult> {
  if (!Number.isInteger(input.amountAgorot) || input.amountAgorot <= 0) return { ok: false, error: "סכום לא תקין" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expiresOn) || input.expiresOn < todayInIsrael()) {
    return { ok: false, error: "תאריך התוקף חייב להיות היום או מאוחר יותר" };
  }

  const bride = await transition(
    brideId,
    ["submitted", "rejected"],
    { status: "approved", budgetAgorot: input.amountAgorot, budgetExpiresOn: input.expiresOn, rejectionReason: null },
    { actor, type: "bride.approved", payload: { amountAgorot: input.amountAgorot, expiresOn: input.expiresOn } },
  );
  if (!bride) return { ok: false, error: "לא ניתן לאשר כלה במצב הנוכחי" };

  await sendEmail(
    approvedEmail({
      to: bride.email,
      firstName: bride.firstName,
      amount: formatShekels(input.amountAgorot),
      expiresOn: formatDate(input.expiresOn),
      shopLink: `${env().APP_URL}/shop`,
    }),
    { brideId, template: "bride_approved" },
  );
  return { ok: true };
}

export async function rejectBride(brideId: string, actor: Actor, reason: string): Promise<WorkflowResult> {
  const cleanReason = reason.trim().slice(0, 1000) || null;
  const bride = await transition(
    brideId,
    ["submitted", "approved"],
    { status: "rejected", rejectionReason: cleanReason, budgetAgorot: null, budgetExpiresOn: null },
    { actor, type: "bride.rejected", payload: { reason: cleanReason } },
  );
  if (!bride) return { ok: false, error: "לא ניתן לדחות כלה במצב הנוכחי (ייתכן שכבר הזמינה)" };

  await sendEmail(rejectedEmail({ to: bride.email, firstName: bride.firstName, reason: cleanReason }), {
    brideId,
    template: "bride_rejected",
  });
  return { ok: true };
}

export type CartLine = { productId: string; size?: string | null; color?: string | null; quantity: number };

/**
 * The bride sends her order. Everything is re-checked on the server:
 * products exist and are active, options are valid, total ≤ budget, budget not expired.
 */
export async function placeOrder(brideId: string, cart: CartLine[]): Promise<WorkflowResult> {
  if (!Array.isArray(cart) || cart.length === 0) return { ok: false, error: "הסל ריק" };
  if (cart.length > 100) return { ok: false, error: "יותר מדי פריטים" };

  const products = await db.select().from(schema.products).where(eq(schema.products.active, true));
  const byId = new Map(products.map((p) => [p.id, p]));

  const items: { productId: string; name: string; size: string | null; color: string | null; unitPriceAgorot: number; quantity: number }[] = [];
  for (const line of cart) {
    const p = byId.get(line.productId);
    if (!p) return { ok: false, error: "אחד המוצרים בסל כבר לא זמין. נא להסיר אותו ולנסות שוב." };
    const qty = Number(line.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY_PER_LINE) return { ok: false, error: "כמות לא תקינה" };
    const size = line.size || null;
    const color = line.color || null;
    if (p.sizes.length ? !size || !p.sizes.includes(size) : size) return { ok: false, error: `נא לבחור מידה עבור ${p.name}` };
    if (p.colors.length ? !color || !p.colors.includes(color) : color) return { ok: false, error: `נא לבחור צבע עבור ${p.name}` };
    items.push({ productId: p.id, name: p.name, size, color, unitPriceAgorot: p.priceAgorot, quantity: qty });
  }
  const totalAgorot = items.reduce((sum, i) => sum + i.unitPriceAgorot * i.quantity, 0);

  const result = await db.transaction(async (tx) => {
    const [bride] = await tx
      .update(schema.brides)
      .set({ status: "ordered", updatedAt: new Date() })
      .where(
        and(
          eq(schema.brides.id, brideId),
          eq(schema.brides.status, "approved"),
          isNull(schema.brides.archivedAt),
          gte(schema.brides.budgetExpiresOn, todayInIsrael()),
          gte(schema.brides.budgetAgorot, totalAgorot),
        ),
      )
      .returning();
    if (!bride) return null; // not approved / expired / over budget / already ordered
    const [order] = await tx.insert(schema.orders).values({ brideId, totalAgorot }).returning();
    await tx.insert(schema.orderItems).values(items.map((i) => ({ ...i, orderId: order.id })));
    await tx.insert(schema.events).values({
      brideId,
      actor: "bride",
      type: "order.submitted",
      payload: { orderId: order.id, totalAgorot, lines: items.length },
    });
    return bride;
  });

  if (!result) {
    const [b] = await db.select().from(schema.brides).where(eq(schema.brides.id, brideId));
    if (b?.status === "ordered" || b?.status === "pickup_scheduled") return { ok: false, error: "כבר נשלחה הזמנה" };
    if (b?.status !== "approved") return { ok: false, error: "לא ניתן להזמין כעת" };
    if (b.budgetExpiresOn && b.budgetExpiresOn < todayInIsrael()) return { ok: false, error: "תוקף הזכאות פג" };
    return { ok: false, error: "סכום ההזמנה גבוה מהסכום שהוקצב" };
  }

  const lines: OrderLine[] = items.map((i) => ({
    name: i.name,
    size: i.size,
    color: i.color,
    quantity: i.quantity,
    total: formatShekels(i.unitPriceAgorot * i.quantity),
  }));
  const total = formatShekels(totalAgorot);
  await sendEmail(orderConfirmationEmail({ to: result.email, firstName: result.firstName, lines, total }), {
    brideId,
    template: "order_confirmation",
  });
  await sendEmail(
    newOrderAdminEmail({
      to: env().ADMIN_NOTIFY_EMAIL,
      fullName: `${result.firstName} ${result.lastName}`,
      lines,
      total,
      link: `${env().APP_URL}/admin/brides/${brideId}`,
    }),
    { brideId, template: "order_new_admin" },
  );
  return { ok: true };
}

const pickupText = (d: Date) => `${israelWeekday(d)}, ${formatDateTime(d)}`;

/** Manager sets (or changes) the pickup date, time and address. */
export async function schedulePickup(
  brideId: string,
  actor: Actor,
  input: { localDateTime: string; address: string },
): Promise<WorkflowResult> {
  const pickupAt = israelLocalToDate(input.localDateTime);
  const address = input.address.trim().slice(0, 300);
  if (!pickupAt || pickupAt.getTime() < Date.now()) return { ok: false, error: "נא לבחור מועד עתידי" };
  if (!address) return { ok: false, error: "נא למלא כתובת איסוף" };

  const bride = await transition(
    brideId,
    ["ordered", "pickup_scheduled"],
    { status: "pickup_scheduled", pickupAt, pickupAddress: address },
    { actor, type: "pickup.scheduled", payload: { pickupAt: input.localDateTime, address } },
  );
  if (!bride) return { ok: false, error: "ניתן לקבוע איסוף רק לאחר שהכלה שלחה הזמנה" };

  // Remember the address as the default for next time.
  await db
    .insert(schema.settings)
    .values({ key: "last_pickup_address", value: address })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: address } });

  await sendEmail(
    pickupScheduledEmail({ to: bride.email, firstName: bride.firstName, when: pickupText(pickupAt), address }),
    { brideId, template: "pickup_scheduled" },
  );
  return { ok: true };
}

/** Manager closes the file (order collected, or a rejected / unused file). It moves to the archive. */
export async function closeFile(brideId: string, actor: Actor): Promise<WorkflowResult> {
  const [bride] = await db
    .update(schema.brides)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(schema.brides.id, brideId),
        isNull(schema.brides.archivedAt),
        inArray(schema.brides.status, ["pickup_scheduled", "rejected", "approved"]),
      ),
    )
    .returning();
  if (!bride) return { ok: false, error: "לא ניתן לסגור את התיק במצב הנוכחי" };
  await db.insert(schema.events).values({ brideId, actor: actor.email, type: "file.closed", payload: { status: bride.status } });
  return { ok: true };
}

/**
 * Daily job: emails every bride whose pickup is tomorrow (Israel time).
 * Safe to run more than once a day – each pickup gets at most one reminder.
 */
export async function sendPickupReminders(): Promise<number> {
  const tomorrow = new Date(Date.now() + 86_400_000);
  const start = israelLocalToDate(`${dateToIsraelLocal(tomorrow).slice(0, 10)}T00:00`)!;
  const end = new Date(start.getTime() + 86_400_000);

  const due = await db
    .select()
    .from(schema.brides)
    .where(
      and(
        eq(schema.brides.status, "pickup_scheduled"),
        isNull(schema.brides.archivedAt),
        gte(schema.brides.pickupAt, start),
        lt(schema.brides.pickupAt, end),
        notExists(
          db
            .select({ one: sql`1` })
            .from(schema.events)
            .where(
              and(
                eq(schema.events.brideId, schema.brides.id),
                eq(schema.events.type, "pickup.reminder_sent"),
                // a reminder for THIS pickup time (if it was rescheduled, remind again)
                sql`${schema.events.payload}->>'pickupAt' = to_char(${schema.brides.pickupAt} at time zone 'Asia/Jerusalem', 'YYYY-MM-DD"T"HH24:MI')`,
              ),
            ),
        ),
      ),
    );

  for (const b of due) {
    await db.insert(schema.events).values({
      brideId: b.id,
      actor: "system",
      type: "pickup.reminder_sent",
      payload: { pickupAt: dateToIsraelLocal(b.pickupAt!) },
    });
    await sendEmail(
      pickupReminderEmail({ to: b.email, firstName: b.firstName, when: pickupText(b.pickupAt!), address: b.pickupAddress ?? "" }),
      { brideId: b.id, template: "pickup_reminder" },
    );
  }
  return due.length;
}
