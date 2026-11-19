import "server-only";
import { headers } from "next/headers";
import { env } from "@/lib/env";

/**
 * Verifies the Cloudflare Turnstile token sent by a form ("am I a human?").
 * Without TURNSTILE_SECRET_KEY (local dev / tests) the check is skipped.
 */
export async function verifyHuman(token: FormDataEntryValue | null): Promise<boolean> {
  const secret = env().TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || !token) return false;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, ...(ip && { remoteip: ip }) }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (e) {
    // If Cloudflare is unreachable, don't block real brides.
    console.error("turnstile verify failed", e);
    return true;
  }
}
