import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Capture emails and cookies instead of sending / setting them.
const sent: { to: string; subject: string; html: string }[] = [];
vi.mock("@/lib/email/send", () => ({
  sendEmail: async (email: { to: string; subject: string; html: string }) => {
    sent.push(email);
    return true;
  },
}));
const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: (name: string, value: string) => cookieJar.set(name, value),
    get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined),
  }),
}));

const { db, schema } = await import("@/lib/db");
const { placeOrder } = await import("@/lib/bride-workflow");
const { saveProduct } = await import("@/lib/products-admin");
const { requestLoginCode, verifyLoginCode } = await import("@/lib/bride-auth");

const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

async function approvedBride(budgetShekels = 500, expiresOn = future(10)) {
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
      email: "shop@example.com",
      phone: "0521234567",
      address: "בני ברק",
      status: "approved",
      budgetAgorot: budgetShekels * 100,
      budgetExpiresOn: expiresOn,
    })
    .returning();
  return b;
}

async function product(name: string, price: number, opts: { sizes?: string; active?: boolean } = {}) {
  const res = await saveProduct(
    null,
    { name, category: "ביגוד", price: String(price), sizes: opts.sizes ?? "", ...(opts.active !== false && { active: "on" }) },
    null,
  );
  if (!res.ok) throw new Error(JSON.stringify(res.errors));
  return res.id;
}

beforeEach(async () => {
  sent.length = 0;
  cookieJar.clear();
  await db.delete(schema.orderItems);
  await db.delete(schema.orders);
  await db.delete(schema.events);
  await db.delete(schema.brides);
  await db.delete(schema.products);
  await db.delete(schema.otpCodes);
});

describe("placeOrder", () => {
  it("saves the order, moves the bride to 'ordered', emails bride + manager", async () => {
    const b = await approvedBride(500);
    const pot = await product("סט סירים", 160);
    const tights = await product("גרביונים", 10, { sizes: "S, M" });

    const res = await placeOrder(b.id, [
      { productId: pot, quantity: 2 },
      { productId: tights, size: "M", quantity: 3 },
    ]);
    expect(res).toEqual({ ok: true });

    const [after] = await db.select().from(schema.brides).where(eq(schema.brides.id, b.id));
    expect(after.status).toBe("ordered");
    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.brideId, b.id));
    expect(order.totalAgorot).toBe(35000);
    expect(await db.select().from(schema.orderItems)).toHaveLength(2);
    expect(sent.map((e) => e.to)).toEqual(["shop@example.com", "admin@example.com"]);

    // can't order twice
    expect(await placeOrder(b.id, [{ productId: pot, quantity: 1 }])).toEqual({ ok: false, error: "כבר נשלחה הזמנה" });
  });

  it("rejects over-budget, expired, missing size, hidden product and bad quantity", async () => {
    const b = await approvedBride(100);
    const pot = await product("סט סירים", 160);
    const tights = await product("גרביונים", 10, { sizes: "S" });
    const hidden = await product("מוסתר", 5, { active: false });

    expect(await placeOrder(b.id, [{ productId: pot, quantity: 1 }])).toEqual({
      ok: false,
      error: "סכום ההזמנה גבוה מהסכום שהוקצב",
    });
    expect((await placeOrder(b.id, [{ productId: tights, quantity: 1 }])).ok).toBe(false);
    expect((await placeOrder(b.id, [{ productId: tights, size: "XXL", quantity: 1 }])).ok).toBe(false);
    expect((await placeOrder(b.id, [{ productId: hidden, quantity: 1 }])).ok).toBe(false);
    expect((await placeOrder(b.id, [{ productId: tights, size: "S", quantity: 0 }])).ok).toBe(false);
    expect((await placeOrder(b.id, [])).ok).toBe(false);

    const expired = await approvedBride(1000, "2020-01-01");
    expect(await placeOrder(expired.id, [{ productId: tights, size: "S", quantity: 1 }])).toEqual({
      ok: false,
      error: "תוקף הזכאות פג",
    });
    expect(await db.select().from(schema.orders)).toHaveLength(0);
  });
});

describe("saveProduct", () => {
  it("validates and normalizes option lists", async () => {
    const bad = await saveProduct(null, { name: "", category: "x", price: "-1" }, null);
    expect(bad.ok).toBe(false);
    const ok = await saveProduct(null, { name: "חולצה", category: "ביגוד", price: "49.9", sizes: "S, M,,M , L" }, null);
    if (!ok.ok) throw new Error("expected ok");
    const [p] = await db.select().from(schema.products).where(eq(schema.products.id, ok.id));
    expect(p.sizes).toEqual(["S", "M", "L"]);
    expect(p.priceAgorot).toBe(4990);
    expect(p.active).toBe(false); // checkbox not sent = hidden
  });
});

describe("bride login code", () => {
  it("logs in with the emailed code; wrong codes are limited", async () => {
    await approvedBride();
    await requestLoginCode("Shop@Example.com ");
    const code = sent[0].html.match(/>(\d{6})</)![1];
    expect(sent[0].subject).not.toContain(code);

    expect(await verifyLoginCode("shop@example.com", "000000" === code ? "111111" : "000000")).toBe(false);
    expect(await verifyLoginCode("shop@example.com", code)).toBe(true);
    expect(cookieJar.has("bride_session")).toBe(true);
    expect(await verifyLoginCode("shop@example.com", code)).toBe(false); // single use
  });

  it("does not send anything for an unknown email", async () => {
    await requestLoginCode("nobody@example.com");
    expect(sent).toHaveLength(0);
  });

  it("locks the code after 5 wrong attempts", async () => {
    await approvedBride();
    await requestLoginCode("shop@example.com");
    const code = sent[0].html.match(/>(\d{6})</)![1];
    const wrong = code === "999999" ? "888888" : "999999";
    for (let i = 0; i < 5; i++) await verifyLoginCode("shop@example.com", wrong);
    expect(await verifyLoginCode("shop@example.com", code)).toBe(false);
  });
});

describe("bride login with several applications", () => {
  it("logs into the active (approved) file, not a newer rejected one", async () => {
    const approved = await approvedBride();
    await db.insert(schema.brides).values({ ...approved, id: undefined, status: "rejected", createdAt: new Date() });
    await requestLoginCode("shop@example.com");
    const code = sent[0].html.match(/>(\d{6})</)![1];
    await verifyLoginCode("shop@example.com", code);
    const { getBride } = await import("@/lib/bride-auth");
    expect((await getBride())?.id).toBe(approved.id);
  });
});
