import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = { robots: { index: true, follow: false } };

export default function HomePage() {
  return (
    <main className="bg-silk flex min-h-dvh flex-col items-center justify-center px-4 py-12 text-center">
      <Image
        src="/brand/logo-full.png"
        alt="Royal Brides – כלות מלכות"
        width={1091}
        height={992}
        priority
        className="h-auto w-56 sm:w-72"
      />
      <h1 className="mt-10 text-2xl font-bold text-gold-dark sm:text-3xl">כלה יקרה, ברוכה הבאה לכלות מלכות!</h1>
      <p className="mt-3 max-w-md text-lg text-gold-dark/90">
        אנו שמחים ומתרגשים ללוות אותך ברגעים המשמעותיים ביותר בחייך.
      </p>
      <p className="mt-10 text-muted">לבדיקת זכאותך, אנא מלאי את הטופס:</p>
      <Link href="/apply" className="btn-outline mt-3 bg-white/70 px-10 text-lg">
        בדיקת זכאות
      </Link>
    </main>
  );
}
