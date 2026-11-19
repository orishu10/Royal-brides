import type { Metadata } from "next";
import { hasApplyAccess } from "@/lib/apply-access";
import { AccessCodeForm } from "./access-code-form";
import { ApplicationForm } from "./application-form";

export const metadata: Metadata = { title: "טופס בקשה לזכאות | כלות מלכות" };

export default async function ApplyPage() {
  const allowed = await hasApplyAccess();
  return (
    <main className="bg-silk min-h-dvh px-4 py-10">
      <h1 className="mb-6 text-center text-3xl font-bold">טופס בקשה לזכאות</h1>
      {allowed ? <ApplicationForm /> : <AccessCodeForm />}
    </main>
  );
}
