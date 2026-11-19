import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

// Small signed tokens for cookies: "<payload>.<expiresAtMs>.<hmac>".

function sign(data: string) {
  return createHmac("sha256", env().SESSION_SECRET).update(data).digest("base64url");
}

export function createToken(payload: string, ttlMs: number) {
  const data = `${payload}.${Date.now() + ttlMs}`;
  return `${data}.${sign(data)}`;
}

/** Returns the payload if the token is authentic and not expired, otherwise null. */
export function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const data = token.slice(0, i);
  const given = Buffer.from(token.slice(i + 1));
  const expected = Buffer.from(sign(data));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const j = data.lastIndexOf(".");
  if (Number(data.slice(j + 1)) < Date.now()) return null;
  return data.slice(0, j);
}
