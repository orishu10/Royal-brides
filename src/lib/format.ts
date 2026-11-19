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

/** Today's date in Israel as "YYYY-MM-DD". */
export function todayInIsrael() {
  const p = israelParts(new Date());
  return `${p.year}-${p.month}-${p.day}`;
}

/** "2026-12-01T14:30" typed in Israel → the exact moment (Date). Handles summer/winter time. */
export function israelLocalToDate(local: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // How far Israel is ahead of UTC at that moment (2 or 3 hours).
  const p = israelParts(new Date(asUtc));
  const offset = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - asUtc;
  const result = new Date(asUtc - offset);
  return Number.isNaN(result.getTime()) ? null : result;
}

/** Date → "2026-12-01T14:30" in Israel time (for datetime-local inputs). */
export function dateToIsraelLocal(d: Date) {
  const p = israelParts(d);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Hebrew weekday name in Israel, e.g. "יום שלישי". */
export function israelWeekday(d: Date) {
  return new Intl.DateTimeFormat("he-IL", { timeZone: TZ, weekday: "long" }).format(d);
}
