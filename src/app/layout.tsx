import type { Metadata } from "next";
import "@fontsource-variable/assistant";
import "@fontsource/bellefair/hebrew-400.css";
import "@fontsource/bellefair/latin-400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "כלות מלכות",
  description: "כלות מלכות – ליווי כלות לקראת החתונה",
  // Only the home page should be indexed; pages opt in explicitly.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
