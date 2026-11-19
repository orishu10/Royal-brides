import type { Metadata } from "next";
import Link from "next/link";
import { isTab, listBrides, PAGE_SIZE, tabCounts, TABS, type Tab } from "@/lib/admin-queries";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "כלות | פורטל מנהלת" };

export default async function BridesListPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const tab: Tab = isTab(sp.tab) ? sp.tab : "new";
  const q = (sp.q ?? "").slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ rows, total }, counts] = await Promise.all([listBrides(tab, q, page), tabCounts()]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: Record<string, string | number>) =>
    "/admin?" + new URLSearchParams({ tab, ...(q && { q }), ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])) });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">כלות</h1>
        <form className="flex gap-2" action="/admin">
          <input type="hidden" name="tab" value={tab} />
          <input name="q" defaultValue={q} placeholder="חיפוש: שם, ת״ז, טלפון, מייל" className="field w-64 py-2" />
          <button className="btn-outline py-2">חיפוש</button>
        </form>
      </div>

      <nav className="mb-4 flex flex-wrap gap-2" aria-label="סינון לפי סטטוס">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <Link
            key={t}
            href={`/admin?tab=${t}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              t === tab ? "bg-gold text-white" : "bg-white text-ink hover:bg-sand"
            }`}
          >
            {TABS[t].label}
            <span className={`ms-1.5 ${t === tab ? "text-white/80" : "text-muted"}`}>({counts[t]})</span>
          </Link>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-right text-sm">
          <thead className="bg-sand/60 text-ink">
            <tr>
              <th className="px-4 py-3">שם</th>
              <th className="px-4 py-3">ת״ז</th>
              <th className="px-4 py-3">נייד</th>
              <th className="px-4 py-3">קהילה</th>
              <th className="px-4 py-3">תאריך חתונה</th>
              <th className="px-4 py-3">{tab === "pickup" ? "איסוף" : "הוגשה"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-t border-sand/70 hover:bg-cream">
                <td className="px-4 py-3 font-semibold">
                  <Link href={`/admin/brides/${b.id}`} className="text-gold-dark hover:underline">
                    {b.firstName} {b.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 tabular-nums">{b.idNumber}</td>
                <td className="px-4 py-3 tabular-nums" dir="ltr">
                  {b.phone}
                </td>
                <td className="px-4 py-3">{b.community}</td>
                <td className="px-4 py-3">{formatDate(b.weddingDate)}</td>
                <td className="px-4 py-3">
                  {tab === "pickup" && b.pickupAt ? formatDateTime(b.pickupAt) : formatDate(b.createdAt)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  {q ? "לא נמצאו תוצאות" : "אין כלות ברשימה זו"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          {page > 1 && <Link href={href({ page: page - 1 })}>→ הקודם</Link>}
          <span>
            עמוד {page} מתוך {pages}
          </span>
          {page < pages && <Link href={href({ page: page + 1 })}>הבא ←</Link>}
        </div>
      )}
    </>
  );
}
