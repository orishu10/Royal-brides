import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";

export type Email = { to: string; subject: string; html: string };

/**
 * Sends an email and records the result in the bride's history.
 * Never throws: a failed email must not break the action that triggered it.
 * Without RESEND_API_KEY (local dev) the email is saved to .data/emails/ for preview.
 */
export async function sendEmail(email: Email, opts: { brideId?: string; template: string }) {
  const e = env();
  let error: string | undefined;
  try {
    if (e.RESEND_API_KEY) {
      const res = await new Resend(e.RESEND_API_KEY).emails.send({
        from: e.EMAIL_FROM,
        replyTo: e.EMAIL_REPLY_TO,
        to: email.to,
        subject: email.subject,
        html: email.html,
      });
      if (res.error) error = res.error.message;
    } else {
      const dir = path.join(process.cwd(), ".data", "emails");
      await mkdir(dir, { recursive: true });
      const name = `${new Date().toISOString().replace(/[:.]/g, "-")}_${opts.template}.html`;
      await writeFile(
        path.join(dir, name),
        `<!-- to: ${email.to} | subject: ${email.subject} -->\n${email.html}`,
      );
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  await db.insert(schema.events).values({
    brideId: opts.brideId,
    actor: "system",
    type: error ? "email.failed" : "email.sent",
    payload: { template: opts.template, to: email.to, subject: email.subject, ...(error && { error }) },
  });
  if (error) console.error(`[email] ${opts.template} to ${email.to} failed: ${error}`);
  return !error;
}
