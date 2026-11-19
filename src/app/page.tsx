import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Pearls } from "@/components/pearls";

export const metadata: Metadata = { robots: { index: true, follow: false } };

const STEPS = ["טופס ומסמכים", "אישור במייל", "בחירת מוצרים"];

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center px-6 py-8">
      <div className="flex w-full max-w-sm flex-1 flex-col items-center">
        {/* The arch window */}
        <section className="arch card w-full p-2.5">
          <div className="arch flex flex-col items-center border border-rose px-6 pt-12 pb-7 text-center">
            <Image
              src="/brand/logo-full.png"
              alt="Royal Brides – כלות מלכות"
              width={1091}
              height={992}
              priority
              className="h-auto w-36"
            />
            <Pearls className="mt-4" />
            <h1 className="mt-4 font-display text-[32px] leading-tight">
              כלה יקרה,
              <br />
              ברוכה הבאה
            </h1>
            <p className="mt-2.5 leading-relaxed text-muted">אנו שמחים ומתרגשים ללוות אותך ברגעים המשמעותיים ביותר בחייך.</p>
          </div>
        </section>

        <ol className="mt-5 flex w-full gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1 rounded-t-[40px] rounded-b-2xl bg-petal px-1.5 pt-3.5 pb-3 text-center">
              <div className="font-display text-2xl text-rose">{i + 1}</div>
              <div className="text-[13px]">{s}</div>
            </li>
          ))}
        </ol>

        <div className="min-h-8 flex-1" />

        <Link href="/apply" className="btn-primary h-14 w-full text-lg">
          בדיקת זכאות
        </Link>
        <Link href="/shop" className="mt-4 font-semibold text-rose-dark underline underline-offset-4">
          כלה שאושרה? כניסה לבחירת המוצרים
        </Link>
        <Link href="/privacy" className="mt-4 text-xs text-muted hover:underline">
          מדיניות פרטיות
        </Link>
      </div>
    </main>
  );
}
