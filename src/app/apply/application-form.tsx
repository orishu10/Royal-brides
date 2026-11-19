"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ACCEPTED_FILE_TYPES,
  applicationSchema,
  COMMUNITIES,
  DOCUMENTS,
  MAX_FILE_BYTES,
} from "@/lib/application";

const DRAFT_KEY = "rb-apply-draft";

const TEXT_FIELDS = [
  { name: "firstName", label: "שם פרטי", autoComplete: "given-name" },
  { name: "lastName", label: "שם משפחה", autoComplete: "family-name" },
  { name: "idNumber", label: "מס' תעודת זהות", inputMode: "numeric" },
  { name: "phone", label: "מס' נייד", type: "tel", autoComplete: "tel" },
  { name: "fatherName", label: "שם האב" },
  { name: "motherName", label: "שם האם" },
  { name: "email", label: 'דוא"ל', type: "email", autoComplete: "email" },
] as const;

type Errors = Record<string, string>;

export function ApplicationForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  // Restore a draft of the text fields (files can't be saved by the browser).
  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}") as Record<string, string>;
      for (const [k, v] of Object.entries(draft)) {
        const el = formRef.current?.elements.namedItem(k);
        if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) el.value = v;
      }
    } catch {}
  }, []);

  function saveDraft() {
    if (!formRef.current) return;
    const data: Record<string, string> = {};
    for (const [k, v] of new FormData(formRef.current)) if (typeof v === "string") data[k] = v;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch {}
  }

  function validate(form: FormData): Errors {
    const errs: Errors = {};
    const fields = Object.fromEntries([...form].filter(([, v]) => typeof v === "string")) as Record<string, string>;
    const parsed = applicationSchema.safeParse(fields);
    if (!parsed.success) for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
    for (const { kind } of DOCUMENTS) {
      const f = form.get(kind);
      if (!(f instanceof File) || f.size === 0) errs[kind] = "נא לצרף קובץ";
      else if (f.size > MAX_FILE_BYTES) errs[kind] = "הקובץ גדול מדי (עד 10MB)";
    }
    return errs;
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const form = new FormData(e.currentTarget);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setMessage("יש לתקן את השדות המסומנים");
      document.querySelector(`[name="${Object.keys(errs)[0]}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    // XMLHttpRequest (not fetch) so we can show upload progress.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/apply");
    xhr.upload.onprogress = (ev) => ev.lengthComputable && setProgress(Math.round((ev.loaded / ev.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      let body: { ok?: boolean; errors?: Errors; message?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status === 200 && body.ok) {
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {}
        setDone(true);
      } else if (xhr.status === 401) {
        window.location.reload();
      } else {
        setErrors(body.errors ?? {});
        setMessage(body.message ?? (body.errors ? "יש לתקן את השדות המסומנים" : "אירעה שגיאה. נסי שוב."));
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setMessage("בעיית תקשורת. בדקי את החיבור לאינטרנט ונסי שוב.");
    };
    setProgress(0);
    xhr.send(form);
  }

  const sending = progress !== null;

  return (
    <>
      <form
        ref={formRef}
        onSubmit={onSubmit}
        onChange={saveDraft}
        noValidate
        className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm sm:p-9"
      >
        <div className="space-y-1 text-base leading-relaxed">
          <p>כלה יקרה,</p>
          <p>אנא מלאי את הטופס במלואו, והקפידי להעלות את כל המסמכים.</p>
          <p className="pt-2 font-bold">חשוב מאוד!</p>
          <ul className="list-disc space-y-1 pr-6">
            <li>טופס שלא ימולא כנדרש ו/או לא יישלחו כל המסמכים הנדרשים, לא יועבר לאישור הוועדה.</li>
            <li>כל הפרטים, ללא יוצא מן הכלל, חייבים להיות של הכלה המבקשת בלבד.</li>
          </ul>
        </div>

        <h2 className="mt-8 mb-4 text-xl font-bold">פרטים אישיים:</h2>
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {TEXT_FIELDS.map((f) => (
            <Field key={f.name} label={f.label} name={f.name} error={errors[f.name]}>
              <input
                id={f.name}
                name={f.name}
                type={"type" in f ? f.type : "text"}
                inputMode={"inputMode" in f ? f.inputMode : undefined}
                autoComplete={"autoComplete" in f ? f.autoComplete : "off"}
                dir={f.name === "email" || f.name === "phone" ? "ltr" : undefined}
                className="field text-right"
                aria-invalid={!!errors[f.name]}
              />
            </Field>
          ))}
          <Field label="מגזר / קהילה" name="community" error={errors.community}>
            <select id="community" name="community" defaultValue="" className="field" aria-invalid={!!errors.community}>
              <option value="" disabled>
                בחרי...
              </option>
              {COMMUNITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="תאריך החתונה" name="weddingDate" error={errors.weddingDate}>
            <input id="weddingDate" name="weddingDate" type="date" className="field" aria-invalid={!!errors.weddingDate} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="כתובת" name="address" error={errors.address}>
              <input id="address" name="address" autoComplete="street-address" className="field" aria-invalid={!!errors.address} />
            </Field>
          </div>
        </div>

        <h2 className="mt-10 mb-2 text-xl font-bold">מסמכים נדרשים:</h2>
        <p className="mb-5 text-base">
          אנא צרפי את המסמכים הבאים (תמונה או PDF, עד 10MB לקובץ).
          <br />
          במידה ולא מתאפשר לך להציג את אחד המסמכים, אנא צרפי מכתב הסבר במקומו.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {DOCUMENTS.map((d) => (
            <FileField key={d.kind} name={d.kind} label={d.label} error={errors[d.kind]} />
          ))}
        </div>

        {message && (
          <p className="mt-6 rounded-lg bg-red-50 p-3 text-red-800" role="alert">
            {message}
          </p>
        )}

        <button type="submit" disabled={sending} className="btn-gold mt-8 w-full text-lg sm:w-auto sm:px-14">
          {sending ? `שולח... ${progress}%` : "שליחה"}
        </button>
      </form>

      {done && <ThankYouDialog />}
    </>
  );
}

function Field(props: { label: string; name: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={props.name} className="mb-1 block text-sm font-semibold">
        {props.label} <span className="text-gold">*</span>
      </label>
      {props.children}
      {props.error && <p className="mt-1 text-sm text-red-700">{props.error}</p>}
    </div>
  );
}

function FileField({ name, label, error }: { name: string; label: string; error?: string }) {
  const [fileName, setFileName] = useState<string | null>(null);
  return (
    <div>
      <label
        className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 transition ${
          fileName ? "border-green-600/60 bg-green-50" : error ? "border-red-400 bg-red-50" : "border-gold/50 bg-sand/40 hover:bg-sand/70"
        }`}
      >
        <span className="text-xl" aria-hidden>
          {fileName ? "✓" : "+"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{label}</span>
          <span className="block truncate text-sm text-muted">{fileName ?? "לחצי לבחירת קובץ או צילום"}</span>
        </span>
        <input
          type="file"
          name={name}
          accept={ACCEPTED_FILE_TYPES}
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

function ThankYouDialog() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="text-4xl text-gold" aria-hidden>
          ♛
        </div>
        <h2 className="mt-3 text-2xl font-bold">תודה על מילוי השאלון!</h2>
        <p className="mt-3 leading-relaxed">
          הבקשה והמסמכים התקבלו בהצלחה.
          <br />
          שלחנו אלייך מייל אישור, ונעדכן אותך במייל לאחר בדיקת הבקשה.
        </p>
        <Link href="/" className="btn-gold mt-6 w-full">
          חזרה לדף הבית
        </Link>
      </div>
    </div>
  );
}
