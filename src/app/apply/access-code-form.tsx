"use client";

import { useActionState } from "react";
import { submitAccessCode } from "./actions";

export function AccessCodeForm() {
  const [error, action, pending] = useActionState(submitAccessCode, null);
  return (
    <form action={action} className="mx-auto max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
      <label htmlFor="code" className="mb-3 block text-lg">
        נא להזין את קוד הכניסה לטופס
      </label>
      <input id="code" name="code" inputMode="numeric" autoComplete="off" required className="field text-center text-xl tracking-widest" />
      {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
      <button type="submit" disabled={pending} className="btn-gold mt-4 w-full">
        {pending ? "בודק..." : "כניסה"}
      </button>
    </form>
  );
}
