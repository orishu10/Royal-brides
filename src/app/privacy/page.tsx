import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "מדיניות פרטיות | כלות מלכות", robots: { index: true, follow: false } };

// DRAFT – must be reviewed by a lawyer before go-live. Items in [brackets] need filling in.
// When the text changes, bump PRIVACY_POLICY_VERSION in src/lib/application.ts.
export default function PrivacyPage() {
  return (
    <main className="bg-blush min-h-dvh px-4 py-10">
      <article className="mx-auto max-w-2xl space-y-5 rounded-2xl bg-white p-6 leading-relaxed shadow-sm sm:p-10">
        <h1 className="text-2xl font-bold">מדיניות פרטיות</h1>
        <p className="text-sm text-muted">עודכן: נובמבר 2026</p>

        <Section title="מי אנחנו">
          האתר &quot;כלות מלכות&quot; מופעל על ידי [שם הארגון ומספר רישום], לצורך סיוע לכלות לקראת חתונתן. לפניות בנושא פרטיות:{" "}
          <a href="mailto:bracha@bjs.co.il" className="text-rose-dark underline" dir="ltr">
            bracha@bjs.co.il
          </a>
          .
        </Section>

        <Section title="איזה מידע אנחנו אוספות">
          <ul className="list-disc space-y-1 pr-6">
            <li>פרטים אישיים: שם, מספר תעודת זהות, שמות ההורים, מגזר/קהילה, תאריך החתונה.</li>
            <li>פרטי קשר: טלפון נייד, דוא&quot;ל וכתובת.</li>
            <li>מסמכים: צילומי תעודות זהות וספחים, תעודת פטירה, מכתב המלצה והזמנה לחתונה.</li>
            <li>פרטי ההזמנה מהקטלוג ומועד האיסוף.</li>
          </ul>
          חלק מהמידע, ובפרט המסמכים, הוא מידע בעל רגישות מיוחדת. מסירת המידע אינה חובה על פי חוק, אך ללא המידע לא נוכל לבדוק את הבקשה.
        </Section>

        <Section title="למה אנחנו משתמשות במידע">
          לבדיקת הזכאות על ידי הוועדה, ליצירת קשר איתך לגבי הבקשה וההזמנה, לתיאום איסוף, ולתיעוד פעילות הארגון. איננו משתמשות במידע
          לשיווק ואיננו מוכרות אותו.
        </Section>

        <Section title="מי רואה את המידע">
          רק צוות הניהול המורשה של הארגון ומתחזק המערכת הטכני. המידע נשמר אצל ספקי שירות מאובטחים: Render (שרתי האתר), Neon (מסד
          נתונים), Cloudflare (אחסון קבצים) ו-Resend (שליחת מיילים), בשרתים באירופה ו/או בארה&quot;ב. איננו מעבירות מידע לגורם אחר אלא
          אם נדרש על פי דין.
        </Section>

        <Section title="אבטחת מידע">
          החיבור לאתר מוצפן, המסמכים נשמרים באחסון פרטי ונגישים רק למנהלות מחוברות, וכל צפייה במסמך נרשמת ביומן.
        </Section>

        <Section title="כמה זמן נשמר המידע">[להשלים לאחר ייעוץ משפטי: תקופת השמירה של התיקים והמסמכים.]</Section>

        <Section title="הזכויות שלך">
          את רשאית לעיין במידע עלייך, ולבקש לתקן או למחוק מידע שאינו נכון, שלם, ברור או מעודכן, בפנייה לכתובת המייל שלמעלה.
        </Section>

        <Link href="/" className="inline-block text-rose-dark underline">
          חזרה לדף הבית
        </Link>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 text-lg font-bold">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
