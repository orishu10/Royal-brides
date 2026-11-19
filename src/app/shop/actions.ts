"use server";

import { redirect } from "next/navigation";
import { logoutBride, requestLoginCode, requireBride, verifyLoginCode } from "@/lib/bride-auth";
import { placeOrder, type CartLine, type WorkflowResult } from "@/lib/bride-workflow";
import { rateLimit } from "@/lib/rate-limit";
import { verifyHuman } from "@/lib/turnstile";

export type LoginState = { step: "email" | "code"; email?: string; error?: string };

export async function loginStep(prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? prev.email ?? "").trim();

  if (prev.step === "email" || formData.get("resend")) {
    if (!/^\S+@\S+\.\S+$/.test(email)) return { step: "email", error: 'כתובת דוא"ל לא תקינה' };
    if (!(await rateLimit("otp-request", 5, 15 * 60 * 1000))) {
      return { step: "email", email, error: "יותר מדי בקשות. נסי שוב בעוד כמה דקות." };
    }
    if (prev.step === "email" && !(await verifyHuman(formData.get("cf-turnstile-response")))) {
      return { step: "email", email, error: "אימות האבטחה נכשל. נא לרענן את הדף ולנסות שוב." };
    }
    await requestLoginCode(email);
    return { step: "code", email };
  }

  if (!(await rateLimit("otp-verify", 15, 15 * 60 * 1000))) {
    return { step: "code", email, error: "יותר מדי ניסיונות. נסי שוב בעוד כמה דקות." };
  }
  const ok = await verifyLoginCode(email, String(formData.get("code") ?? ""));
  if (!ok) return { step: "code", email, error: "הקוד שגוי או שפג תוקפו" };
  redirect("/shop");
}

export async function submitOrder(cart: CartLine[]): Promise<WorkflowResult> {
  const bride = await requireBride();
  return placeOrder(bride.id, cart);
}

export async function logout() {
  await logoutBride();
  redirect("/");
}
