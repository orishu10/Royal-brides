"use server";

import { redirect } from "next/navigation";
import { grantApplyAccess } from "@/lib/apply-access";
import { rateLimit } from "@/lib/rate-limit";

export async function submitAccessCode(_prev: string | null, formData: FormData) {
  if (!(await rateLimit("apply-code", 10, 15 * 60 * 1000))) {
    return "יותר מדי ניסיונות. נסי שוב בעוד כמה דקות.";
  }
  const ok = await grantApplyAccess(String(formData.get("code") ?? ""));
  if (!ok) return "הקוד שגוי";
  redirect("/apply");
}
