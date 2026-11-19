"use client";

import { useState } from "react";
import { useFormAction } from "@/lib/use-form-action";
import { approveAction, rejectAction, type ActionState } from "./actions";

export function DecisionForms({
  brideId,
  canApprove,
  canReject,
  defaultExpiresOn,
}: {
  brideId: string;
  canApprove: boolean;
  canReject: boolean;
  defaultExpiresOn: string;
}) {
  const [open, setOpen] = useState<"approve" | "reject" | null>(null);
  const [approveState, approve, approving] = useFormAction<ActionState>(approveAction.bind(null, brideId), null);
  const [rejectState, reject, rejecting] = useFormAction<ActionState>(rejectAction.bind(null, brideId), null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {canApprove && (
          <button type="button" onClick={() => setOpen(open === "approve" ? null : "approve")} className="btn-primary">
            אישור הבקשה
          </button>
        )}
        {canReject && (
          <button type="button" onClick={() => setOpen(open === "reject" ? null : "reject")} className="btn-outline">
            דחיית הבקשה
          </button>
        )}
      </div>

      {open === "approve" && (
        <form onSubmit={approve} className="space-y-3 rounded-xl border border-rose/40 bg-blush p-4">
          <p className="font-semibold">אישור – הקצאת סכום לכלה</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm">סכום (₪)</span>
              <input name="amount" type="number" min="1" step="1" required className="field" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm">בתוקף עד</span>
              <input name="expiresOn" type="date" required defaultValue={defaultExpiresOn} className="field" />
            </label>
          </div>
          <p className="text-sm text-muted">לאחר האישור יישלח לכלה מייל עם הסכום, התוקף וקישור לקטלוג.</p>
          {approveState && !approveState.ok && <p className="text-sm text-red-700">{approveState.error}</p>}
          <button disabled={approving} className="btn-primary">
            {approving ? "מאשרת..." : "אישור ושליחת מייל"}
          </button>
        </form>
      )}

      {open === "reject" && (
        <form onSubmit={reject} className="space-y-3 rounded-xl border border-red-200 bg-red-50/50 p-4">
          <p className="font-semibold">דחיית הבקשה</p>
          <label className="block">
            <span className="mb-1 block text-sm">סיבה (לא חובה – תופיע במייל לכלה)</span>
            <textarea name="reason" rows={3} maxLength={1000} className="field" />
          </label>
          {rejectState && !rejectState.ok && <p className="text-sm text-red-700">{rejectState.error}</p>}
          <button disabled={rejecting} className="btn border-2 border-red-700 text-red-800 hover:bg-red-100">
            {rejecting ? "דוחה..." : "דחייה ושליחת מייל"}
          </button>
        </form>
      )}
    </div>
  );
}
