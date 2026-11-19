import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrideFile, TABS } from "@/lib/admin-queries";
import { DOCUMENTS } from "@/lib/application";
import { dateToIsraelLocal, formatDate, formatDateTime, formatShekels, isoDateInDays, israelWeekday, STATUS_LABELS } from "@/lib/format";
import { getSetting } from "@/lib/settings";
import { OrderSummary } from "@/components/order-summary";
import { getOrderForBride } from "@/lib/orders";
import { DecisionForms } from "./decision-forms";
import { CloseFileButton, PickupForm } from "./file-actions";

export const metadata: Metadata = { title: "תיק כלה | פורטל מנהלת" };

const EVENT_LABELS: Record<string, string> = {
  "application.submitted": "הטופס נשלח",
  "bride.approved": "הבקשה אושרה",
  "bride.rejected": "הבקשה נדחתה",
  "email.sent": "נשלח מייל",
  "email.failed": "⚠️ שליחת מייל נכשלה",
  "document.viewed": "צפייה במסמך",
  "document.downloaded": "הורדת מסמך",
  "bride.logged_in": "הכלה נכנסה לאתר",
  "order.submitted": "נשלחה הזמנה",
  "pickup.scheduled": "נקבע מועד איסוף",
  "pickup.reminder_sent": "נשלחה תזכורת איסוף",
  "file.closed": "התיק נסגר והועבר לארכיון",
};

export default async function BrideFilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await getBrideFile(id);
  if (!file) notFound();
  const { bride, documents, events, tab, prevId, nextId } = file;
  const order = await getOrderForBride(bride.id);
  const docLabel = (kind: string) => DOCUMENTS.find((d) => d.kind === kind)?.label ?? kind;
  const in30Days = isoDateInDays(30);
  const lastPickupAddress = (await getSetting("last_pickup_address")) ?? "";
  const canSchedulePickup = !bride.archivedAt && (bride.status === "ordered" || bride.status === "pickup_scheduled");
  const canClose = !bride.archivedAt && ["pickup_scheduled", "rejected", "approved"].includes(bride.status);

  return (
    <>
      <div className="mb-4 flex items-center justify-between text-sm">
        <Link href={`/admin?tab=${tab}`} className="text-gold-dark hover:underline">
          → חזרה לרשימת &quot;{TABS[tab].label}&quot;
        </Link>
        <div className="flex gap-4">
          {prevId && <Link href={`/admin/brides/${prevId}`}>→ הקודמת</Link>}
          {nextId && <Link href={`/admin/brides/${nextId}`}>הבאה ←</Link>}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">
          {bride.firstName} {bride.lastName}
        </h1>
        <span className="rounded-full bg-sand px-3 py-1 text-sm font-semibold">
          {bride.archivedAt ? "בארכיון" : STATUS_LABELS[bride.status]}
        </span>
        <span className="text-sm text-muted">הוגשה {formatDateTime(bride.createdAt)}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="פרטים אישיים">
            <Info label="שם פרטי" value={bride.firstName} />
            <Info label="שם משפחה" value={bride.lastName} />
            <Info label="מס' תעודת זהות" value={bride.idNumber} />
            <Info label="מגזר / קהילה" value={bride.community} />
            <Info label="שם האב" value={bride.fatherName} />
            <Info label="שם האם" value={bride.motherName} />
            <Info label="תאריך החתונה" value={formatDate(bride.weddingDate)} />
          </Card>

          <Card title="פרטי קשר">
            <Info label="נייד" value={<a href={`tel:${bride.phone}`} dir="ltr">{bride.phone}</a>} />
            <Info label='דוא"ל' value={<a href={`mailto:${bride.email}`} dir="ltr">{bride.email}</a>} />
            <Info label="כתובת" value={bride.address} wide />
          </Card>

          {order && (
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-bold">הזמנה</h2>
              <OrderSummary order={order} />
            </section>
          )}

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold">מסמכים</h2>
            <ul className="divide-y divide-sand/70">
              {documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="min-w-40 font-semibold">{docLabel(d.kind)}</span>
                  <span className="text-xs text-muted">
                    {d.mimeType === "application/pdf" ? "PDF" : "תמונה"} · {Math.ceil(d.sizeBytes / 1024)}KB
                  </span>
                  <span className="ms-auto flex gap-4 text-sm">
                    <a href={`/admin/documents/${d.id}`} target="_blank" rel="noopener" className="text-gold-dark hover:underline">
                      צפייה
                    </a>
                    <a href={`/admin/documents/${d.id}?download`} className="text-gold-dark hover:underline">
                      הורדה
                    </a>
                  </span>
                </li>
              ))}
              {documents.length === 0 && <li className="py-2 text-muted">אין מסמכים</li>}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold">סטטוס בקשה</h2>
            {bride.budgetAgorot != null && (
              <p className="mb-3 rounded-lg bg-green-50 p-3 text-sm">
                הוקצב: <b>{formatShekels(bride.budgetAgorot)}</b>
                {bride.budgetExpiresOn && <> · בתוקף עד {formatDate(bride.budgetExpiresOn)}</>}
              </p>
            )}
            {bride.status === "rejected" && (
              <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm">
                נדחתה{bride.rejectionReason && <>: {bride.rejectionReason}</>}
              </p>
            )}
            {!bride.archivedAt && (
              <DecisionForms
                key={bride.status}
                brideId={bride.id}
                canApprove={bride.status === "submitted" || bride.status === "rejected"}
                canReject={bride.status === "submitted" || bride.status === "approved"}
                defaultExpiresOn={bride.budgetExpiresOn ?? in30Days}
              />
            )}
            {bride.pickupAt && (
              <p className="mb-3 rounded-lg bg-sand/50 p-3 text-sm">
                איסוף: <b>{israelWeekday(bride.pickupAt)}, {formatDateTime(bride.pickupAt)}</b>
                <br />
                {bride.pickupAddress}
              </p>
            )}
            {canSchedulePickup && (
              <div className="mt-3">
                <PickupForm
                  key={bride.pickupAt?.toISOString() ?? "new"}
                  brideId={bride.id}
                  isChange={bride.status === "pickup_scheduled"}
                  defaultDateTime={bride.pickupAt ? dateToIsraelLocal(bride.pickupAt) : ""}
                  defaultAddress={bride.pickupAddress ?? lastPickupAddress}
                />
              </div>
            )}
            {canClose && (
              <div className="mt-3">
                <CloseFileButton
                  brideId={bride.id}
                  label={bride.status === "pickup_scheduled" ? "ההזמנה נאספה – סגירת התיק" : "סגירת התיק (ארכיון)"}
                />
              </div>
            )}
            {bride.archivedAt && <p className="text-sm text-muted">התיק נסגר ב-{formatDateTime(bride.archivedAt)}</p>}
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold">היסטוריה</h2>
            <ol className="space-y-2 text-sm">
              {events.map((e) => (
                <li key={e.id} className="border-s-2 border-sand ps-3">
                  <div className="font-semibold">
                    {EVENT_LABELS[e.type] ?? e.type}
                    {typeof e.payload.subject === "string" && <span className="font-normal">: {e.payload.subject}</span>}
                  </div>
                  <div className="text-xs text-muted">
                    {formatDateTime(e.createdAt)} · {e.actor === "bride" ? "הכלה" : e.actor === "system" ? "מערכת" : e.actor}
                    {typeof e.payload.error === "string" && <span className="text-red-700"> · {e.payload.error}</span>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Info({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
