"use client";

import Image from "next/image";
import { useActionState } from "react";
import { ArchCard } from "@/components/arch-card";
import { submitAccessCode } from "./actions";

export function AccessCodeForm() {
  const [error, action, pending] = useActionState(submitAccessCode, null);
  return (
    <ArchCard className="mx-auto mt-6">
    <form action={action}>
      <Image src="/brand/logo-rb.png" alt="" width={670} height={552} className="mx-auto h-12 w-auto" />
      <h1 className="mt-3 font-display text-3xl">טופס בקשה לזכאות</h1>
      <label htmlFor="code" className="mt-2 mb-4 block text-muted">
        נא להזין את קוד הכניסה לטופס
      </label>
      <input id="code" name="code" inputMode="numeric" autoComplete="off" required className="field text-center text-xl tracking-widest" />
      {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary mt-5 w-full">
        {pending ? "בודק..." : "כניסה"}
      </button>
    </form>
    </ArchCard>
  );
}
