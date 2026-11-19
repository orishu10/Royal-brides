import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Bride } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import { approvedEmail, rejectedEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { formatDate, formatShekels } from "@/lib/format";

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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expiresOn) || input.expiresOn < new Date().toISOString().slice(0, 10)) {
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
