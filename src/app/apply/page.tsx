import type { Metadata } from "next";
import { hasApplyAccess } from "@/lib/apply-access";
import { AccessCodeForm } from "./access-code-form";
import { ApplicationForm } from "./application-form";

export const metadata: Metadata = { title: "טופס בקשה לזכאות | כלות מלכות" };

export default async function ApplyPage() {
  const allowed = await hasApplyAccess();
  return (
    <main className="min-h-dvh px-4 py-8">{allowed ? <ApplicationForm /> : <AccessCodeForm />}</main>
  );
}
