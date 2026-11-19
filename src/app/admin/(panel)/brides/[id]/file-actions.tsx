"use client";

import { useState, useTransition } from "react";
import { useFormAction } from "@/lib/use-form-action";
import { closeFileAction, pickupAction, type ActionState } from "./actions";

/** Set or change the pickup date/time/address. */
export function PickupForm(props: { brideId: string; defaultDateTime: string; defaultAddress: string; isChange: boolean }) {
  const [open, setOpen] = useState(!props.isChange);
  const [state, onSubmit, pending] = useFormAction<ActionState>(pickupAction.bind(null, props.brideId), null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline w-full">
        שינוי מועד האיסוף
      </button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-gold/40 bg-cream p-4">
      <p className="font-semibold">{props.isChange ? "שינוי מועד האיסוף" : "קביעת מועד איסוף"}</p>
      <label className="block">
        <span className="mb-1 block text-sm">תאריך ושעה</span>
        <input name="pickupAt" type="datetime-local" required defaultValue={props.defaultDateTime} className="field" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm">כתובת האיסוף</span>
        <textarea name="address" rows={2} required defaultValue={props.defaultAddress} className="field" />
      </label>
      <p className="text-sm text-muted">יישלח לכלה מייל עם המועד והכתובת, ובקשה לתאם הגעה יום לפני. יום לפני האיסוף תישלח תזכורת אוטומטית.</p>
      {state && !state.ok && <p className="text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="btn-gold">
        {pending ? "שומרת..." : "שמירה ושליחת מייל"}
      </button>
    </form>
  );
}

/** Close the file → archive. */
export function CloseFileButton({ brideId, label }: { brideId: string; label: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("לסגור את התיק ולהעביר לארכיון?")) return;
          start(async () => {
            const res = await closeFileAction(brideId);
            if (res && !res.ok) setError(res.error);
          });
        }}
        className="btn w-full border-2 border-ink/70 text-ink hover:bg-sand"
      >
        {pending ? "סוגרת..." : label}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
