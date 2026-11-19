import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { CATEGORIES } from "@/lib/catalog";
import { db, schema } from "@/lib/db";
import { newStorageKey, sniffFileType, storage } from "@/lib/storage";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** "S, M ,L" → ["S","M","L"] */
const optionList = z
  .string()
  .default("")
  .transform((s) => [...new Set(s.split(/[,،\n]/).map((x) => x.trim()).filter(Boolean))].slice(0, 30));

const productSchema = z.object({
  name: z.string().trim().min(1, "נא למלא שם").max(120),
  category: z.enum(CATEGORIES, { message: "נא לבחור קטגוריה" }),
  price: z.coerce.number({ message: "מחיר לא תקין" }).min(0, "מחיר לא תקין").max(100_000, "מחיר לא תקין"),
  description: z.string().trim().max(500).default(""),
  sizes: optionList,
  colors: optionList,
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  active: z.literal("on").optional(),
});

export type SaveProductResult = { ok: true; id: string } | { ok: false; errors: Record<string, string> };

/** Creates (id = null) or updates a product. Optional new image replaces the old one. */
export async function saveProduct(
  id: string | null,
  fields: Record<string, string>,
  image: { data: Buffer } | null,
): Promise<SaveProductResult> {
  const parsed = productSchema.safeParse(fields);
  const errors: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;

  let imageType: { mime: string; ext: string } | null = null;
  if (image && image.data.length > 0) {
    imageType = sniffFileType(image.data);
    if (!imageType || !imageType.mime.startsWith("image/") || imageType.mime === "image/heic") {
      errors.image = "ניתן להעלות תמונה מסוג JPG, PNG או WEBP";
    } else if (image.data.length > MAX_IMAGE_BYTES) errors.image = "התמונה גדולה מדי (עד 5MB)";
  }
  if (!parsed.success || Object.keys(errors).length) return { ok: false, errors };

  const v = parsed.data;
  const values = {
    name: v.name,
    category: v.category,
    priceAgorot: Math.round(v.price * 100),
    description: v.description,
    sizes: v.sizes,
    colors: v.colors,
    sortOrder: v.sortOrder,
    active: v.active === "on",
  };

  let imageKey: string | undefined;
  if (image && imageType) {
    imageKey = newStorageKey("products", imageType.ext);
    await storage().put(imageKey, image.data, imageType.mime);
  }

  if (id) {
    const [old] = await db.select().from(schema.products).where(eq(schema.products.id, id));
    if (!old) return { ok: false, errors: { name: "המוצר לא נמצא" } };
    await db
      .update(schema.products)
      .set({ ...values, ...(imageKey && { imageKey }) })
      .where(eq(schema.products.id, id));
    if (imageKey && old.imageKey) await storage().remove(old.imageKey).catch(() => {});
    return { ok: true, id };
  }
  const [created] = await db
    .insert(schema.products)
    .values({ ...values, imageKey })
    .returning({ id: schema.products.id });
  return { ok: true, id: created.id };
}
