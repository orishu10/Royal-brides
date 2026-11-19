"use client";

import Link from "next/link";
import { CATEGORIES } from "@/lib/catalog";
import { useFormAction } from "@/lib/use-form-action";
import { saveProductAction, type ProductFormState } from "./actions";

export type ProductFormValues = {
  id: string | null;
  name: string;
  category: string;
  price: string;
  description: string;
  sizes: string;
  colors: string;
  sortOrder: string;
  active: boolean;
  imageUrl: string | null;
};

export function ProductForm({ product }: { product: ProductFormValues }) {
  const [state, onSubmit, pending] = useFormAction<ProductFormState>(saveProductAction.bind(null, product.id), null);
  const err = (k: string) => state?.errors[k] && <p className="mt-1 text-sm text-red-700">{state.errors[k]}</p>;

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-semibold">שם המוצר</span>
          <input name="name" defaultValue={product.name} required className="field" />
          {err("name")}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">קטגוריה</span>
          <select name="category" defaultValue={product.category} required className="field">
            <option value="">בחרי...</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {err("category")}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">מחיר (₪)</span>
          <input name="price" type="number" min="0" step="0.01" defaultValue={product.price} required className="field" />
          {err("price")}
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-semibold">תיאור (לא חובה)</span>
          <textarea name="description" rows={2} defaultValue={product.description} className="field" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">מידות</span>
          <input name="sizes" defaultValue={product.sizes} placeholder="למשל: S, M, L" className="field" />
          <span className="text-xs text-muted">מופרדות בפסיק. ריק = בלי בחירת מידה</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">צבעים</span>
          <input name="colors" defaultValue={product.colors} placeholder="למשל: שחור, לבן, בז'" className="field" />
          <span className="text-xs text-muted">מופרדים בפסיק. ריק = בלי בחירת צבע</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">סדר הצגה</span>
          <input name="sortOrder" type="number" min="0" defaultValue={product.sortOrder} className="field" />
          <span className="text-xs text-muted">מספר נמוך = מוצג קודם</span>
        </label>
        <label className="flex items-center gap-2 self-center pt-4">
          <input name="active" type="checkbox" defaultChecked={product.active} className="h-5 w-5 accent-gold" />
          <span className="font-semibold">מוצג לכלות</span>
        </label>
        <div className="sm:col-span-2">
          <span className="mb-1 block text-sm font-semibold">תמונה</span>
          <div className="flex items-center gap-4">
            {product.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- our own image route
              <img src={product.imageUrl} alt="" className="h-20 w-20 rounded-lg object-cover" />
            )}
            <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
          </div>
          {err("image")}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button disabled={pending} className="btn-gold">
          {pending ? "שומרת..." : "שמירה"}
        </button>
        <Link href="/admin/products" className="btn-outline">
          ביטול
        </Link>
      </div>
    </form>
  );
}
