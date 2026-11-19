"use client";

import { ArchCard } from "@/components/arch-card";
import { HumanCheck } from "@/components/human-check";
import { useFormAction } from "@/lib/use-form-action";
import { loginStep, type LoginState } from "../actions";

export function BrideLoginForm() {
  const [state, onSubmit, pending] = useFormAction<LoginState>(loginStep, { step: "email" });

  return (
    <ArchCard>
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="font-display text-3xl">כניסת כלה</h1>

      {state.step === "email" ? (
        <>
          <p className="text-muted">הזיני את כתובת המייל שאיתה נרשמת, ונשלח אלייך קוד כניסה.</p>
          <input
            name="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            required
            defaultValue={state.email}
            aria-label='דוא"ל'
            className="field text-center"
          />
          <HumanCheck />
        </>
      ) : (
        <>
          <p className="text-muted">
            אם הכתובת <b dir="ltr">{state.email}</b> רשומה אצלנו, נשלח אליה קוד בן 6 ספרות.
          </p>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            aria-label="קוד כניסה"
            className="field text-center text-2xl tracking-[0.5em]"
          />
        </>
      )}

      {state.error && (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "רגע..." : state.step === "email" ? "שליחת קוד" : "כניסה"}
      </button>
      {state.step === "code" && (
        <button type="submit" name="resend" value="1" disabled={pending} className="text-sm text-rose-dark underline">
          לא קיבלתי – שלחו שוב
        </button>
      )}
    </form>
    </ArchCard>
  );
}
