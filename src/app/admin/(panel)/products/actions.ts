"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { saveProduct } from "@/lib/products-admin";

export type ProductFormState = { errors: Record<string, string> } | null;

export async function saveProductAction(id: string | null, _prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();
  const fields: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") fields[k] = v;
  const file = formData.get("image");
  const image = file instanceof File && file.size > 0 ? { data: Buffer.from(await file.arrayBuffer()) } : null;

  const res = await saveProduct(id, fields, image);
  if (!res.ok) return { errors: res.errors };
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  redirect("/admin/products");
}
