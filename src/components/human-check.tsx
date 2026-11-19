"use client";

import Script from "next/script";

// Cloudflare Turnstile widget. Adds a hidden "cf-turnstile-response" field to the surrounding form.
// Renders nothing when no site key is configured (local dev).
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function HumanCheck() {
  if (!SITE_KEY) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <div className="cf-turnstile my-4" data-sitekey={SITE_KEY} data-language="he" data-theme="light" />
    </>
  );
}
