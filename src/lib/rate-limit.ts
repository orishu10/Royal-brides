import "server-only";
import { headers } from "next/headers";

// Simple in-memory rate limit (the app runs as a single server process on Render).
const hits = new Map<string, number[]>();

export async function rateLimit(bucket: string, limit: number, windowMs: number): Promise<boolean> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
  recent.push(now);
  hits.set(key, recent);
  // Forget old entries now and then so memory doesn't grow forever.
  if (hits.size > 5000) {
    for (const [k, times] of hits) if (times[times.length - 1] < now - 60 * 60 * 1000) hits.delete(k);
  }
  return recent.length <= limit;
}
