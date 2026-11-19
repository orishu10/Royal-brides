import { eq } from "drizzle-orm";
import { getAdmin } from "@/lib/admin-auth";
import { db, schema } from "@/lib/db";
import { storage } from "@/lib/storage";

// Streams a bride's document to a logged-in admin only. Every view is logged.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const [doc] = await db.select().from(schema.documents).where(eq(schema.documents.id, id));
  if (!doc) return new Response("Not found", { status: 404 });

  const download = new URL(request.url).searchParams.has("download");
  const body = await storage().get(doc.storageKey);
  await db.insert(schema.events).values({
    brideId: doc.brideId,
    actor: admin.email,
    type: download ? "document.downloaded" : "document.viewed",
    payload: { kind: doc.kind },
  });

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
