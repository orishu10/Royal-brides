import "server-only";
import { and, asc, count, desc, eq, gt, ilike, isNotNull, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/lib/db";

const { brides } = schema;

/** Tabs of the brides list. Each tab is a filter. */
export const TABS = {
  new: { label: "חדשות", where: and(eq(brides.status, "submitted"), isNull(brides.archivedAt)) },
  approved: { label: "מאושרות", where: and(eq(brides.status, "approved"), isNull(brides.archivedAt)) },
  ordered: { label: "הזמינו", where: and(eq(brides.status, "ordered"), isNull(brides.archivedAt)) },
  pickup: { label: "לאיסוף", where: and(eq(brides.status, "pickup_scheduled"), isNull(brides.archivedAt)) },
  rejected: { label: "נדחו", where: and(eq(brides.status, "rejected"), isNull(brides.archivedAt)) },
  archive: { label: "ארכיון", where: isNotNull(brides.archivedAt) },
} satisfies Record<string, { label: string; where: SQL | undefined }>;

export type Tab = keyof typeof TABS;
export const PAGE_SIZE = 25;

export function isTab(v: unknown): v is Tab {
  return typeof v === "string" && v in TABS;
}

function searchFilter(q: string) {
  const term = `%${q.trim()}%`;
  return or(
    ilike(sql`${brides.firstName} || ' ' || ${brides.lastName}`, term),
    ilike(brides.idNumber, term),
    ilike(brides.phone, `%${q.replace(/\D/g, "") || q}%`),
    ilike(brides.email, term),
  );
}

export async function listBrides(tab: Tab, q: string, page: number) {
  const where = q.trim() ? and(TABS[tab].where, searchFilter(q)) : TABS[tab].where;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: brides.id,
        firstName: brides.firstName,
        lastName: brides.lastName,
        idNumber: brides.idNumber,
        phone: brides.phone,
        community: brides.community,
        weddingDate: brides.weddingDate,
        status: brides.status,
        createdAt: brides.createdAt,
        pickupAt: brides.pickupAt,
      })
      .from(brides)
      .where(where)
      .orderBy(tab === "pickup" ? asc(brides.pickupAt) : desc(brides.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(brides).where(where),
  ]);
  return { rows, total };
}

export async function tabCounts(): Promise<Record<Tab, number>> {
  const entries = await Promise.all(
    (Object.keys(TABS) as Tab[]).map(async (t) => {
      const [{ n }] = await db.select({ n: count() }).from(brides).where(TABS[t].where);
      return [t, n] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<Tab, number>;
}

/** Which tab a bride belongs to (for the back link and next/prev). */
export function tabOf(b: { status: string; archivedAt: Date | null }): Tab {
  if (b.archivedAt) return "archive";
  return (
    { submitted: "new", approved: "approved", ordered: "ordered", pickup_scheduled: "pickup", rejected: "rejected" } as const
  )[b.status as "submitted"];
}

export async function getBrideFile(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [bride] = await db.select().from(brides).where(eq(brides.id, id));
  if (!bride) return null;
  const [documents, events] = await Promise.all([
    db.select().from(schema.documents).where(eq(schema.documents.brideId, id)).orderBy(asc(schema.documents.uploadedAt)),
    db.select().from(schema.events).where(eq(schema.events.brideId, id)).orderBy(desc(schema.events.id)),
  ]);

  // Previous / next bride in the same tab (newest first).
  const tab = tabOf(bride);
  // Compare inside SQL: JS Dates lose Postgres' microsecond precision.
  const thisCreatedAt = sql`(select ${brides.createdAt} from ${brides} where ${brides.id} = ${id})`;
  const [prev] = await db
    .select({ id: brides.id })
    .from(brides)
    .where(and(TABS[tab].where, gt(brides.createdAt, thisCreatedAt)))
    .orderBy(asc(brides.createdAt))
    .limit(1);
  const [next] = await db
    .select({ id: brides.id })
    .from(brides)
    .where(and(TABS[tab].where, lt(brides.createdAt, thisCreatedAt)))
    .orderBy(desc(brides.createdAt))
    .limit(1);

  return { bride, documents, events, tab, prevId: prev?.id, nextId: next?.id };
}
