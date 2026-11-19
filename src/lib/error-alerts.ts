import { Resend } from "resend";

// Emails the maintainer when the server hits an unexpected error.
// Throttled so a broken page can't flood the inbox: one email per 15 minutes,
// with a count of how many more errors happened meanwhile.

const WINDOW_MS = 15 * 60 * 1000;
let lastSentAt = 0;
let suppressed = 0;

export async function reportServerError(err: unknown, where: { path: string; method: string }) {
  const message = err instanceof Error ? err.message : String(err);
  const digest = typeof err === "object" && err && "digest" in err ? String(err.digest) : undefined;
  const stack = err instanceof Error ? err.stack : undefined;

  // Always log (Render keeps the logs).
  console.error(JSON.stringify({ level: "error", at: new Date().toISOString(), ...where, message, digest, stack }));

  const to = process.env.MAINTAINER_EMAIL;
  const key = process.env.RESEND_API_KEY;
  if (!to || !key) return;
  if (Date.now() - lastSentAt < WINDOW_MS) {
    suppressed++;
    return;
  }
  const extra = suppressed;
  lastSentAt = Date.now();
  suppressed = 0;
  try {
    await new Resend(key).emails.send({
      from: process.env.EMAIL_FROM ?? "noreply@royalbrides.co.il",
      to,
      subject: `[כלות מלכות] שגיאת שרת: ${message.slice(0, 80)}`,
      text: [
        `${where.method} ${where.path}`,
        `digest: ${digest ?? "-"}`,
        extra ? `(+${extra} more errors in the previous 15 minutes)` : "",
        "",
        stack ?? message,
        "",
        "Full logs: Render dashboard → royal-brides → Logs",
      ].join("\n"),
    });
  } catch (e) {
    console.error("failed to send error alert", e);
  }
}
