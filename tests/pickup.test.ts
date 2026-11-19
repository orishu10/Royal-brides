import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sent: { to: string; subject: string; html: string }[] = [];
vi.mock("@/lib/email/send", () => ({
  sendEmail: async (email: { to: string; subject: string; html: string }) => {
    sent.push(email);
    return true;
  },
}));

const { db, schema } = await import("@/lib/db");
const { schedulePickup, closeFile, sendPickupReminders } = await import("@/lib/bride-workflow");
const { israelLocalToDate, dateToIsraelLocal } = await import("@/lib/format");

const admin = { email: "bracha@example.com" };
const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

async function bride(status: "ordered" | "pickup_scheduled" | "submitted" | "rejected" = "ordered", pickupAt?: Date) {
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
      email: "pickup@example.com",
      phone: "0521234567",
      address: "בני ברק",
      status,
      pickupAt,
      pickupAddress: pickupAt ? "רחוב הרב 5, בני ברק" : null,
    })
    .returning();
  return b;
}
const get = async (id: string) => (await db.select().from(schema.brides).where(eq(schema.brides.id, id)))[0];

beforeEach(async () => {
  sent.length = 0;
  await db.delete(schema.events);
  await db.delete(schema.brides);
});

describe("Israel time conversion", () => {
  it("handles winter (UTC+2) and summer (UTC+3)", () => {
    expect(israelLocalToDate("2027-01-10T14:30")!.toISOString()).toBe("2027-01-10T12:30:00.000Z");
    expect(israelLocalToDate("2027-07-10T14:30")!.toISOString()).toBe("2027-07-10T11:30:00.000Z");
    expect(dateToIsraelLocal(new Date("2027-07-10T11:30:00Z"))).toBe("2027-07-10T14:30");
    expect(israelLocalToDate("not a date")).toBeNull();
  });
});

describe("schedulePickup", () => {
  it("sets date + address, emails the bride, remembers the address", async () => {
    const b = await bride("ordered");
    const when = dateToIsraelLocal(new Date(Date.now() + 3 * 86_400_000));
    expect(await schedulePickup(b.id, admin, { localDateTime: when, address: " רחוב הרב 5 " })).toEqual({ ok: true });
    const after = await get(b.id);
    expect(after.status).toBe("pickup_scheduled");
    expect(after.pickupAddress).toBe("רחוב הרב 5");
    expect(sent[0].html).toContain("יום לפני");
    const [setting] = await db.select().from(schema.settings).where(eq(schema.settings.key, "last_pickup_address"));
    expect(setting.value).toBe("רחוב הרב 5");
  });

  it("refuses past dates, empty address, and brides who haven't ordered", async () => {
    const b = await bride("ordered");
    expect((await schedulePickup(b.id, admin, { localDateTime: "2020-01-01T10:00", address: "x" })).ok).toBe(false);
    const when = dateToIsraelLocal(new Date(Date.now() + 86_400_000 * 2));
    expect((await schedulePickup(b.id, admin, { localDateTime: when, address: "  " })).ok).toBe(false);
    const s = await bride("submitted");
    expect((await schedulePickup(s.id, admin, { localDateTime: when, address: "x" })).ok).toBe(false);
  });
});

describe("closeFile", () => {
  it("archives a collected order, and not a bride still in review", async () => {
    const b = await bride("pickup_scheduled", new Date());
    expect(await closeFile(b.id, admin)).toEqual({ ok: true });
    expect((await get(b.id)).archivedAt).not.toBeNull();
    expect((await closeFile(b.id, admin)).ok).toBe(false); // already closed
    const s = await bride("submitted");
    expect((await closeFile(s.id, admin)).ok).toBe(false);
  });
});

describe("sendPickupReminders", () => {
  it("reminds only for tomorrow's pickups, once", async () => {
    const tomorrowNoon = israelLocalToDate(`${dateToIsraelLocal(new Date(Date.now() + 86_400_000)).slice(0, 10)}T12:00`)!;
    const inThreeDays = new Date(Date.now() + 3 * 86_400_000);
    const due = await bride("pickup_scheduled", tomorrowNoon);
    await bride("pickup_scheduled", inThreeDays);

    expect(await sendPickupReminders()).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toContain("תזכורת");
    expect(await sendPickupReminders()).toBe(0); // not twice

    // rescheduled to another time tomorrow → a new reminder
    await db
      .update(schema.brides)
      .set({ pickupAt: new Date(tomorrowNoon.getTime() + 3_600_000) })
      .where(eq(schema.brides.id, due.id));
    expect(await sendPickupReminders()).toBe(1);
  });
});
