import { timingSafeEqual } from "node:crypto";
import { sendPickupReminders } from "@/lib/bride-workflow";
import { env } from "@/lib/env";

// Called once a day by .github/workflows/daily.yml
export async function POST(request: Request) {
  const secret = env().CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const sent = await sendPickupReminders();
  return Response.json({ ok: true, sent });
}
