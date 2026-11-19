import { describe, expect, it } from "vitest";
import { applicationSchema, isValidIsraeliId, normalizeIsraeliMobile } from "@/lib/application";

describe("isValidIsraeliId", () => {
  it("accepts valid ids, including short ones padded with zeros", () => {
    expect(isValidIsraeliId("123456782")).toBe(true);
    expect(isValidIsraeliId("000000018")).toBe(true);
    expect(isValidIsraeliId("18")).toBe(false); // too short to be real
  });
  it("rejects a wrong check digit or non digits", () => {
    expect(isValidIsraeliId("123456789")).toBe(false);
    expect(isValidIsraeliId("12345678a")).toBe(false);
  });
});

describe("normalizeIsraeliMobile", () => {
  it.each([
    ["052-123-4567", "0521234567"],
    ["+972 52 123 4567", "0521234567"],
    ["972521234567", "0521234567"],
  ])("%s → %s", (input, out) => expect(normalizeIsraeliMobile(input)).toBe(out));
  it("rejects landlines and junk", () => {
    expect(normalizeIsraeliMobile("02-6543210")).toBeNull();
    expect(normalizeIsraeliMobile("abc")).toBeNull();
  });
});

describe("applicationSchema", () => {
  const valid = {
    firstName: "רחל",
    lastName: "כהן",
    idNumber: "123456782",
    phone: "0521234567",
    fatherName: "אברהם",
    motherName: "שרה",
    community: "ליטאי",
    email: "Rachel@Example.com",
    address: "ירושלים",
    weddingDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
    privacyConsent: "on",
  };
  it("normalizes valid input", () => {
    const r = applicationSchema.parse(valid);
    expect(r.email).toBe("rachel@example.com");
  });
  it("rejects unknown community and far-past wedding date", () => {
    expect(applicationSchema.safeParse({ ...valid, community: "x" }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...valid, weddingDate: "2020-01-01" }).success).toBe(false);
  });
});

describe("format", async () => {
  const { formatDate, formatDateTime, formatShekels } = await import("@/lib/format");
  it("formats dates in Israel time as dd/mm/yyyy", () => {
    expect(formatDate("2027-02-10")).toBe("10/02/2027");
    expect(formatDate(new Date("2026-11-19T22:30:00Z"))).toBe("20/11/2026"); // already the 20th in Israel
    expect(formatDateTime(new Date("2026-11-19T12:05:00Z"))).toBe("19/11/2026 14:05");
    expect(formatShekels(150050)).toBe("₪1,500.5");
  });
});

describe("privacy consent", () => {
  it("is required", () => {
    const r = applicationSchema.safeParse({ firstName: "א" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path[0])).toContain("privacyConsent");
  });
});
