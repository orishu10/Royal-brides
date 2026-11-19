// Application form definition + validation.
// Shared by the browser form and the server, so the rules are written once.
import { z } from "zod";

export const COMMUNITIES = [
  "ספרדי",
  "ליטאי",
  "כלל חסידי",
  "גור",
  "סלונים",
  "בעלזא",
  "וויז'ניץ",
  "אחר",
] as const;

export const DOCUMENTS = [
  { kind: "bride_id", label: "ת.ז. של הכלה" },
  { kind: "bride_id_appendix", label: "ספח ת.ז. של הכלה" },
  { kind: "parent_id", label: "ת.ז. הורה הכלה" },
  { kind: "parent_id_appendix", label: "ספח ת.ז. הורה הכלה" },
  { kind: "death_certificate", label: "תעודת פטירה" },
  { kind: "recommendation_letter", label: "מכתב המלצה" },
  { kind: "wedding_invitation", label: "הזמנה לחתונה" },
] as const;

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_FILE_TYPES = "image/jpeg,image/png,image/webp,image/heic,application/pdf";

/** Israeli ID number check-digit validation. Accepts up to 9 digits (pads leading zeros). */
export function isValidIsraeliId(value: string): boolean {
  const digits = value.trim();
  if (!/^\d{5,9}$/.test(digits)) return false;
  const id = digits.padStart(9, "0");
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(id[i]) * ((i % 2) + 1);
    if (n > 9) n -= 9;
    sum += n;
  }
  return sum % 10 === 0;
}

/** Normalizes Israeli mobile numbers to 05XXXXXXXX, or returns null if invalid. */
export function normalizeIsraeliMobile(value: string): string | null {
  let d = value.replace(/[\s\-()]/g, "");
  if (d.startsWith("+972")) d = "0" + d.slice(4);
  else if (d.startsWith("972")) d = "0" + d.slice(3);
  return /^05\d{8}$/.test(d) ? d : null;
}

const required = (label: string) => z.string().trim().min(1, `נא למלא ${label}`).max(200);

export const applicationSchema = z.object({
  firstName: required("שם פרטי"),
  lastName: required("שם משפחה"),
  idNumber: z
    .string()
    .trim()
    .refine(isValidIsraeliId, "מספר תעודת זהות לא תקין")
    .transform((v) => v.padStart(9, "0")),
  phone: z
    .string()
    .refine((v) => normalizeIsraeliMobile(v) !== null, "מספר נייד לא תקין")
    .transform((v) => normalizeIsraeliMobile(v)!),
  fatherName: required("שם האב"),
  motherName: required("שם האם"),
  community: z.enum(COMMUNITIES, { message: "נא לבחור מגזר / קהילה" }),
  email: z.string().trim().toLowerCase().email("כתובת דוא\"ל לא תקינה"),
  address: required("כתובת"),
  weddingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "נא לבחור תאריך חתונה")
    .refine((v) => {
      const d = new Date(v + "T00:00:00Z").getTime();
      const day = 86_400_000;
      return d > Date.now() - 60 * day && d < Date.now() + 3 * 365 * day;
    }, "תאריך החתונה לא תקין"),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
export type ApplicationField = keyof ApplicationInput;
