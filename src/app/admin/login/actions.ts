"use server";

import { redirect } from "next/navigation";
import { loginAdmin, logoutAdmin } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function login(_prev: string | null, formData: FormData) {
  if (!(await rateLimit("admin-login", 10, 15 * 60 * 1000))) {
    return "יותר מדי ניסיונות. נסי שוב בעוד כמה דקות.";
  }
  const ok = await loginAdmin(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
  if (!ok) return "דוא\"ל או סיסמה שגויים";
  redirect("/admin");
}

export async function logout() {
  await logoutAdmin();
  redirect("/admin/login");
}
