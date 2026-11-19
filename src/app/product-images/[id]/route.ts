import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { sniffFileType, storage } from "@/lib/storage";

// Product photos are not sensitive, so they're served publicly and cached.
// The URL carries ?v=<imageKey>, so a new photo gets a new URL.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const [p] = await db.select({ imageKey: schema.products.imageKey }).from(schema.products).where(eq(schema.products.id, id));
  if (!p?.imageKey) return new Response("Not found", { status: 404 });
  const body = await storage().get(p.imageKey);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": sniffFileType(body)?.mime ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
