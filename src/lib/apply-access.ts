import "server-only";
import { cookies } from "next/headers";
import { getSetting } from "@/lib/settings";
import { createToken, verifyToken } from "@/lib/signed-token";

// The application form is behind a short access code (set in the "settings" table).
const COOKIE = "apply_access";
const TTL_MS = 12 * 60 * 60 * 1000;

export async function hasApplyAccess() {
  return verifyToken((await cookies()).get(COOKIE)?.value) === "apply";
}

export async function grantApplyAccess(code: string): Promise<boolean> {
  const expected = await getSetting("apply_access_code");
  if (!expected || code.trim() !== expected) return false;
  (await cookies()).set(COOKIE, createToken("apply", TTL_MS), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TTL_MS / 1000,
    path: "/",
  });
  return true;
}
