"use client";

import { ArchCard } from "@/components/arch-card";
import { useFormAction } from "@/lib/use-form-action";
import { login } from "./actions";

export function LoginForm() {
  const [error, onSubmit, pending] = useFormAction(login, null);
  return (
    <ArchCard>
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="font-display text-3xl">כניסת מנהלת</h1>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-semibold">
          דוא&quot;ל
        </label>
        <input id="email" name="email" type="email" dir="ltr" autoComplete="username" required className="field" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-semibold">
          סיסמה
        </label>
        <input id="password" name="password" type="password" dir="ltr" autoComplete="current-password" required className="field" />
      </div>
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "נכנסת..." : "כניסה"}
      </button>
    </form>
    </ArchCard>
  );
}
