// Display helpers (Hebrew / Israel time).

const TZ = "Asia/Jerusalem";

export function formatShekels(agorot: number) {
  return `₪${(agorot / 100).toLocaleString("he-IL", { maximumFractionDigits: 2 })}`;
}

/** "2027-02-10" or a Date → "10/02/2027" */
export function formatDate(value: string | Date) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.split("-").reverse().join("/");
  }
  const p = israelParts(new Date(value));
  return `${p.day}/${p.month}/${p.year}`;
}

/** Date → "10/02/2027 14:30" (Israel time) */
export function formatDateTime(value: Date) {
  const p = israelParts(value);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

function israelParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  return Object.fromEntries(parts.map((x) => [x.type, x.value])) as Record<Intl.DateTimeFormatPartTypes, string>;
}

export const STATUS_LABELS = {
  submitted: "ממתינה לבדיקה",
  approved: "אושרה",
  rejected: "נדחתה",
  ordered: "הזמינה",
  pickup_scheduled: "נקבע איסוף",
} as const;

/** Date n days from today as "YYYY-MM-DD" (for date inputs). */
export function isoDateInDays(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}
