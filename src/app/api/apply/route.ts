import { NextResponse } from "next/server";
import { DOCUMENTS } from "@/lib/application";
import { hasApplyAccess } from "@/lib/apply-access";
import { submitApplication, type UploadedFile } from "@/lib/apply-service";
import type { DocumentKind } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { verifyHuman } from "@/lib/turnstile";

export async function POST(request: Request) {
  if (!(await hasApplyAccess())) {
    return NextResponse.json({ ok: false, message: "נא להזין קוד גישה מחדש" }, { status: 401 });
  }
  if (!(await rateLimit("apply", 10, 60 * 60 * 1000))) {
    return NextResponse.json({ ok: false, message: "יותר מדי ניסיונות, נסי שוב מאוחר יותר" }, { status: 429 });
  }

  const form = await request.formData();
  // "website" is a hidden trap field – people never see it, spam bots fill it.
  if (form.get("website")) return NextResponse.json({ ok: false, message: "שגיאה בשליחה" }, { status: 400 });
  if (!(await verifyHuman(form.get("cf-turnstile-response")))) {
    return NextResponse.json({ ok: false, message: "אימות האבטחה נכשל. נא לרענן את הדף ולנסות שוב." }, { status: 400 });
  }
  const fields: Record<string, string> = {};
  const files: Partial<Record<DocumentKind, UploadedFile>> = {};
  for (const [name, value] of form.entries()) {
    if (typeof value === "string") fields[name] = value;
  }
  for (const { kind } of DOCUMENTS) {
    const f = form.get(kind);
    if (f instanceof File) files[kind] = { name: f.name, data: Buffer.from(await f.arrayBuffer()) };
  }

  const result = await submitApplication(fields, files);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
