import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, schema } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createToken, verifyToken } from "@/lib/signed-token";

const COOKIE = "admin_session";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type Admin = typeof schema.admins.$inferSelect;

/** The logged-in admin, or null. Cached per request. */
export const getAdmin = cache(async (): Promise<Admin | null> => {
  const id = verifyToken((await cookies()).get(COOKIE)?.value);
  if (!id) return null;
  const [admin] = await db.select().from(schema.admins).where(eq(schema.admins.id, id));
  return admin ?? null;
});

/** Use at the top of every admin page / action / route. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function loginAdmin(email: string, password: string): Promise<boolean> {
  const [admin] = await db
    .select()
    .from(schema.admins)
    .where(eq(schema.admins.email, email.trim().toLowerCase()));
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) return false;
  (await cookies()).set(COOKIE, createToken(admin.id, TTL_MS), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TTL_MS / 1000,
    path: "/",
  });
  return true;
}

export async function logoutAdmin() {
  (await cookies()).set(COOKIE, "", { maxAge: 0, path: "/" });
}
