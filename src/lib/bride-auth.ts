import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, schema } from "@/lib/db";
import type { Bride } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import { loginCodeEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { createToken, verifyToken } from "@/lib/signed-token";

// Brides log in without a password: they get a 6-digit code by email.

const COOKIE = "bride_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const hashCode = (email: string, code: string) =>
  createHmac("sha256", env().SESSION_SECRET).update(`${email}:${code}`).digest("hex");

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** The open file for this email – an active one (approved / ordered / pickup) first, else the newest. */
async function findBrideByEmail(email: string) {
  const [bride] = await db
    .select()
    .from(schema.brides)
    .where(and(eq(schema.brides.email, email), isNull(schema.brides.archivedAt)))
    .orderBy(
      sql`case when ${schema.brides.status} in ('approved', 'ordered', 'pickup_scheduled') then 0 else 1 end`,
      desc(schema.brides.createdAt),
    )
    .limit(1);
  return bride;
}

/**
 * Sends a login code if a bride with this email exists.
 * Always "succeeds" from the caller's view, so the form doesn't reveal who is registered.
 */
export async function requestLoginCode(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const bride = await findBrideByEmail(email);
  if (!bride) return;

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.delete(schema.otpCodes).where(eq(schema.otpCodes.email, email));
  await db.insert(schema.otpCodes).values({
    email,
    codeHash: hashCode(email, code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });
  await sendEmail(loginCodeEmail({ to: email, code }), { brideId: bride.id, template: "login_code" });
}

/** Checks the code; on success sets the session cookie. */
export async function verifyLoginCode(rawEmail: string, rawCode: string): Promise<boolean> {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.replace(/\D/g, "");
  const [otp] = await db
    .select()
    .from(schema.otpCodes)
    .where(and(eq(schema.otpCodes.email, email), gt(schema.otpCodes.expiresAt, new Date())))
    .orderBy(desc(schema.otpCodes.createdAt))
    .limit(1);
  if (!otp || otp.attempts >= MAX_ATTEMPTS) return false;

  const given = Buffer.from(hashCode(email, code));
  const expected = Buffer.from(otp.codeHash);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    await db.update(schema.otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(schema.otpCodes.id, otp.id));
    return false;
  }

  const bride = await findBrideByEmail(email);
  if (!bride) return false;
  await db.delete(schema.otpCodes).where(eq(schema.otpCodes.email, email));
  await db.insert(schema.events).values({ brideId: bride.id, actor: "bride", type: "bride.logged_in" });
  (await cookies()).set(COOKIE, createToken(bride.id, SESSION_TTL_MS), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });
  return true;
}

export const getBride = cache(async (): Promise<Bride | null> => {
  const id = verifyToken((await cookies()).get(COOKIE)?.value);
  if (!id) return null;
  const [bride] = await db.select().from(schema.brides).where(eq(schema.brides.id, id));
  return bride ?? null;
});

export async function requireBride(): Promise<Bride> {
  const bride = await getBride();
  if (!bride) redirect("/shop/login");
  return bride;
}

export async function logoutBride() {
  (await cookies()).set(COOKIE, "", { maxAge: 0, path: "/" });
}
