import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin-auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "כניסת מנהלת | כלות מלכות" };

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <Image src="/brand/logo-rb.png" alt="" width={670} height={552} className="mb-5 h-auto w-20" />
      <LoginForm />
    </main>
  );
}
