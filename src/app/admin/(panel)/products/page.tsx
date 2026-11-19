import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { db, schema } from "@/lib/db";
import { formatShekels } from "@/lib/format";

export const metadata: Metadata = { title: "מוצרים | פורטל מנהלת" };

export default async function ProductsPage() {
  const products = await db
    .select()
    .from(schema.products)
    .orderBy(asc(schema.products.sortOrder), asc(schema.products.name));

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">מוצרים</h1>
        <Link href="/admin/products/new" className="btn-gold py-2">
          + מוצר חדש
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-right text-sm">
          <thead className="bg-sand/60">
            <tr>
              <th className="px-4 py-3">מוצר</th>
              <th className="px-4 py-3">קטגוריה</th>
              <th className="px-4 py-3">מחיר</th>
              <th className="px-4 py-3">מידות / צבעים</th>
              <th className="px-4 py-3">מוצג לכלות</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className={`border-t border-sand/70 hover:bg-cream ${p.active ? "" : "text-muted"}`}>
                <td className="px-4 py-3 font-semibold">
                  <Link href={`/admin/products/${p.id}`} className="text-gold-dark hover:underline">
                    {p.name}
                  </Link>
                  {!p.imageKey && <span className="ms-2 text-xs font-normal text-muted">(אין תמונה)</span>}
                </td>
                <td className="px-4 py-3">{p.category}</td>
                <td className="px-4 py-3 tabular-nums">{formatShekels(p.priceAgorot)}</td>
                <td className="px-4 py-3 text-xs">{[p.sizes.join(", "), p.colors.join(", ")].filter(Boolean).join(" | ") || "—"}</td>
                <td className="px-4 py-3">{p.active ? "✓" : "מוסתר"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
