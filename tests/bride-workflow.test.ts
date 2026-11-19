import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { approveBride, rejectBride } from "@/lib/bride-workflow";
import { db, schema } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

const admin = { email: "bracha@example.com" };
const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

async function newBride() {
  const [b] = await db
    .insert(schema.brides)
    .values({
      firstName: "רחל",
      lastName: "בדיקה",
      idNumber: "123456782",
      fatherName: "א",
      motherName: "ש",
      community: "גור",
      weddingDate: future(60),
      email: "bride@example.com",
      phone: "0521234567",
      address: "בני ברק",
    })
    .returning();
  return b;
}

const getBride = async (id: string) => (await db.select().from(schema.brides).where(eq(schema.brides.id, id)))[0];
const eventTypes = async (id: string) =>
  (await db.select().from(schema.events).where(eq(schema.events.brideId, id))).map((e) => e.type);

beforeEach(async () => {
  await db.delete(schema.events);
  await db.delete(schema.brides);
});

describe("approveBride", () => {
  it("sets budget + expiry, logs, and emails the bride", async () => {
    const b = await newBride();
    const res = await approveBride(b.id, admin, { amountAgorot: 150000, expiresOn: future(30) });
    expect(res).toEqual({ ok: true });
    const after = await getBride(b.id);
    expect(after.status).toBe("approved");
    expect(after.budgetAgorot).toBe(150000);
    expect(await eventTypes(b.id)).toEqual(expect.arrayContaining(["bride.approved", "email.sent"]));
  });

  it("refuses invalid amount, past expiry, or approving twice", async () => {
    const b = await newBride();
    expect((await approveBride(b.id, admin, { amountAgorot: 0, expiresOn: future(30) })).ok).toBe(false);
    expect((await approveBride(b.id, admin, { amountAgorot: 100, expiresOn: "2020-01-01" })).ok).toBe(false);
    await approveBride(b.id, admin, { amountAgorot: 100, expiresOn: future(30) });
    expect((await approveBride(b.id, admin, { amountAgorot: 100, expiresOn: future(30) })).ok).toBe(false);
  });
});

describe("rejectBride", () => {
  it("rejects with a reason and clears any budget", async () => {
    const b = await newBride();
    await approveBride(b.id, admin, { amountAgorot: 100, expiresOn: future(30) });
    expect(await rejectBride(b.id, admin, "  חסרים מסמכים ")).toEqual({ ok: true });
    const after = await getBride(b.id);
    expect(after.status).toBe("rejected");
    expect(after.rejectionReason).toBe("חסרים מסמכים");
    expect(after.budgetAgorot).toBeNull();
  });

  it("cannot reject a bride who already ordered", async () => {
    const b = await newBride();
    await db.update(schema.brides).set({ status: "ordered" }).where(eq(schema.brides.id, b.id));
    expect((await rejectBride(b.id, admin, "")).ok).toBe(false);
  });
});

describe("password", () => {
  it("verifies the right password only", async () => {
    const h = await hashPassword("Correct-Horse-1");
    expect(await verifyPassword("Correct-Horse-1", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
  });
});

describe("admin queries", () => {
  it("lists brides per tab, searches, and finds prev/next in a file", async () => {
    const { getBrideFile, listBrides, tabCounts } = await import("@/lib/admin-queries");
    const a = await newBride();
    const b = await newBride();
    const c = await newBride();
    await approveBride(c.id, admin, { amountAgorot: 100, expiresOn: future(30) });

    expect((await tabCounts()).new).toBe(2);
    expect((await listBrides("new", "0521234567", 1)).total).toBe(2);
    expect((await listBrides("approved", "", 1)).rows.map((r) => r.id)).toEqual([c.id]);

    const file = await getBrideFile(b.id);
    expect(file?.tab).toBe("new");
    expect(file?.nextId).toBe(a.id); // older one in the same tab
    expect(file?.prevId).toBeUndefined(); // c is newer but in another tab
    expect(await getBrideFile("not-a-uuid")).toBeNull();
  });
});
