import "server-only";
import { z } from "zod";

// All environment variables are read and validated here, in one place.
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  ADMIN_NOTIFY_EMAIL: z.string().email(),
  CRON_SECRET: z.string().min(20).optional(), // protects /api/cron/* (called by GitHub Actions)
  MAINTAINER_EMAIL: z.string().email().optional(), // receives server-error alerts
  TURNSTILE_SECRET_KEY: z.string().optional(), // Cloudflare Turnstile (anti-spam). Empty = check skipped.

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("כלות מלכות <noreply@royalbrides.co.il>"),
  EMAIL_REPLY_TO: z.string().email().optional(),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
});

let cached: z.infer<typeof schema> | undefined;

export function env() {
  if (!cached) {
    // Treat empty strings as "not set".
    const raw = Object.fromEntries(
      Object.entries(process.env).filter(([, v]) => v !== ""),
    );
    cached = schema.parse(raw);
  }
  return cached;
}
