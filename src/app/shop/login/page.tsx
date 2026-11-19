import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getBride } from "@/lib/bride-auth";
import { BrideLoginForm } from "./login-form";

export const metadata: Metadata = { title: "כניסת כלה | כלות מלכות" };

export default async function BrideLoginPage() {
  if (await getBride()) redirect("/shop");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <Image src="/brand/logo-rb.png" alt="" width={670} height={552} className="mb-5 h-auto w-20" />
      <BrideLoginForm />
    </main>
  );
}
