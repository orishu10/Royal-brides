import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/lib/db";
import { ProductForm, type ProductFormValues } from "../product-form";

export const metadata: Metadata = { title: "עריכת מוצר | פורטל מנהלת" };

// Handles both /admin/products/new and /admin/products/<id>
export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let values: ProductFormValues;

  if (id === "new") {
    values = { id: null, name: "", category: "", price: "", description: "", sizes: "", colors: "", sortOrder: "0", active: true, imageUrl: null };
  } else {
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
    const [p] = await db.select().from(schema.products).where(eq(schema.products.id, id));
    if (!p) notFound();
    values = {
      id: p.id,
      name: p.name,
      category: p.category,
      price: String(p.priceAgorot / 100),
      description: p.description,
      sizes: p.sizes.join(", "),
      colors: p.colors.join(", "),
      sortOrder: String(p.sortOrder),
      active: p.active,
      imageUrl: p.imageKey ? `/product-images/${p.id}?v=${encodeURIComponent(p.imageKey)}` : null,
    };
  }

  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-block text-sm text-rose-dark hover:underline">
        → חזרה למוצרים
      </Link>
      <h1 className="mb-4 font-display text-3xl">{values.id ? values.name : "מוצר חדש"}</h1>
      <ProductForm product={values} />
    </>
  );
}
