import { existsSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { DOCUMENTS } from "@/lib/application";
import { submitApplication, type UploadedFile } from "@/lib/apply-service";
import { db, schema } from "@/lib/db";

const pdf = (): UploadedFile => ({ name: "doc.pdf", data: Buffer.from("%PDF-1.4\n%%EOF\n") });
const allFiles = () => Object.fromEntries(DOCUMENTS.map((d) => [d.kind, pdf()]));
const fields = {
  firstName: "רחל",
  lastName: "בדיקה",
  idNumber: "123456782",
  phone: "052-1234567",
  fatherName: "אברהם",
  motherName: "שרה",
  community: "גור",
  email: "bride@example.com",
  address: "בני ברק",
  weddingDate: new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10),
};

beforeEach(async () => {
  await db.delete(schema.events);
  await db.delete(schema.brides);
});

describe("submitApplication", () => {
  it("saves the bride, her 7 documents, history and both emails", async () => {
    const res = await submitApplication(fields, allFiles());
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const [bride] = await db.select().from(schema.brides).where(eq(schema.brides.id, res.brideId));
    expect(bride.status).toBe("submitted");
    expect(bride.phone).toBe("0521234567");

    const docs = await db.select().from(schema.documents).where(eq(schema.documents.brideId, res.brideId));
    expect(docs).toHaveLength(7);
    expect(existsSync(path.join(process.cwd(), ".data/uploads", docs[0].storageKey))).toBe(true);

    const events = await db.select().from(schema.events).where(eq(schema.events.brideId, res.brideId));
    expect(events.map((e) => e.type).sort()).toEqual(["application.submitted", "email.sent", "email.sent"]);
    expect(events.map((e) => e.payload.to)).toContain("admin@example.com");
  });

  it("returns field errors and saves nothing when input is invalid", async () => {
    const files = allFiles();
    delete files.death_certificate;
    files.bride_id = { name: "x.pdf", data: Buffer.from("not a pdf") };
    const res = await submitApplication({ ...fields, idNumber: "123" }, files);
    expect(res).toEqual({
      ok: false,
      errors: expect.objectContaining({
        idNumber: expect.any(String),
        death_certificate: "נא לצרף קובץ",
        bride_id: "ניתן לצרף רק תמונה או PDF",
      }),
    });
    expect(await db.select().from(schema.brides)).toHaveLength(0);
  });
});
