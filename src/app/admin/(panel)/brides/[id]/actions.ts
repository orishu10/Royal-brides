"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { approveBride, rejectBride, type WorkflowResult } from "@/lib/bride-workflow";

export type ActionState = WorkflowResult | null;

export async function approveAction(brideId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const amount = Number(String(formData.get("amount") ?? "").replace(/[,₪\s]/g, ""));
  const result = await approveBride(brideId, admin, {
    amountAgorot: Math.round(amount * 100),
    expiresOn: String(formData.get("expiresOn") ?? ""),
  });
  revalidatePath(`/admin/brides/${brideId}`);
  return result;
}

export async function rejectAction(brideId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const result = await rejectBride(brideId, admin, String(formData.get("reason") ?? ""));
  revalidatePath(`/admin/brides/${brideId}`);
  return result;
}
