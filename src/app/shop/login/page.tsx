import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getBride } from "@/lib/bride-auth";
import { BrideLoginForm } from "./login-form";

export const metadata: Metadata = { title: "כניסת כלה | כלות מלכות" };

export default async function BrideLoginPage() {
  if (await getBride()) redirect("/shop");
  return (
    <main className="bg-silk flex min-h-dvh flex-col items-center justify-center px-4">
      <Image src="/brand/logo-rb.png" alt="" width={670} height={552} className="mb-6 h-auto w-24" />
      <BrideLoginForm />
    </main>
  );
}
