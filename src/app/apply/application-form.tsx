"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { HumanCheck } from "@/components/human-check";
import { Pearls } from "@/components/pearls";
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

// Step 1 = personal details, step 2 = documents + consent.
const STEP1_FIELDS = new Set([
  ...TEXT_FIELDS.map((f) => f.name as string),
  "community",
  "weddingDate",
  "address",
]);

export function ApplicationForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

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

  function showErrors(errs: Errors) {
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (!first) return;
    if (STEP1_FIELDS.has(first)) setStep(1);
    setMessage("יש לתקן את השדות המסומנים");
    setTimeout(() => document.querySelector(`[name="${first}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
  }

  function goToDocuments() {
    const all = validate(new FormData(formRef.current!));
    const step1 = Object.fromEntries(Object.entries(all).filter(([k]) => STEP1_FIELDS.has(k)));
    setMessage(null);
    if (Object.keys(step1).length > 0) return showErrors(step1);
    setErrors({});
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step === 1) return goToDocuments();
    setMessage(null);
    const form = new FormData(e.currentTarget);
    const errs = validate(form);
    if (Object.keys(errs).length > 0) return showErrors(errs);

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
        if (body.errors) showErrors(body.errors);
        else setMessage(body.message ?? "אירעה שגיאה. נסי שוב.");
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
      <form ref={formRef} onSubmit={onSubmit} onChange={saveDraft} noValidate className="mx-auto max-w-2xl">
        {/* Arched header with progress */}
        <header className="rounded-t-[160px] border border-b-0 border-line bg-white px-6 pt-9 pb-5 text-center">
          <Image src="/brand/logo-rb.png" alt="" width={670} height={552} className="mx-auto h-9 w-auto" />
          <h1 className="mt-2 font-display text-3xl">טופס בקשה לזכאות</h1>
          <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
            <span className="h-1 w-14 rounded-full bg-rose" />
            <span className={`h-1 w-14 rounded-full ${step === 2 ? "bg-rose" : "bg-[#ead3d4]"}`} />
          </div>
          <p className="mt-1.5 text-sm text-muted">שלב {step} מתוך 2 · {step === 1 ? "פרטים אישיים" : "מסמכים"}</p>
        </header>

        <div className="rounded-b-3xl border border-t-0 border-line bg-white px-5 pb-7 sm:px-9">
          {/* ---------- Step 1: personal details ---------- */}
          <div hidden={step !== 1}>
            <div className="rounded-2xl bg-petal/60 p-4 text-[15px] leading-relaxed">
              <p>כלה יקרה, אנא מלאי את הטופס במלואו, והקפידי להעלות את כל המסמכים.</p>
              <p className="mt-2 font-bold">חשוב מאוד!</p>
              <ul className="list-disc space-y-1 pr-5">
                <li>טופס שלא ימולא כנדרש ו/או לא יישלחו כל המסמכים הנדרשים, לא יועבר לאישור הוועדה.</li>
                <li>כל הפרטים, ללא יוצא מן הכלל, חייבים להיות של הכלה המבקשת בלבד.</li>
              </ul>
            </div>

            <div className="mt-6 grid gap-x-5 gap-y-4 sm:grid-cols-2">
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
          </div>

          {/* ---------- Step 2: documents ---------- */}
          <div hidden={step !== 2}>
            <p className="text-[15px] leading-relaxed">
              אנא צרפי את המסמכים הבאים (צילום או קובץ PDF, עד 10MB).
              <br />
              במידה ולא מתאפשר לך להציג את אחד המסמכים, אנא צרפי מכתב הסבר במקומו.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {DOCUMENTS.map((d) => (
                <FileField key={d.kind} name={d.kind} label={d.label} error={errors[d.kind]} />
              ))}
            </div>

            <label className="mt-7 flex items-start gap-3">
              <input type="checkbox" name="privacyConsent" className="mt-1 h-5 w-5 shrink-0 accent-rose" aria-invalid={!!errors.privacyConsent} />
              <span>
                קראתי ואני מסכימה ל
                <Link href="/privacy" target="_blank" className="text-rose-dark underline">
                  מדיניות הפרטיות
                </Link>
                , ולשמירת הפרטים והמסמכים לצורך בדיקת הבקשה וליווי.
              </span>
            </label>
            {errors.privacyConsent && <p className="mt-1 text-sm text-red-700">{errors.privacyConsent}</p>}

            {/* trap for spam bots – hidden from people */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <HumanCheck />
          </div>

          {message && (
            <p className="mt-6 rounded-2xl bg-red-50 p-3 text-red-800" role="alert">
              {message}
            </p>
          )}

          <div className="mt-8 flex flex-col-reverse items-center gap-3 sm:flex-row">
            {step === 2 && (
              <button type="button" onClick={() => setStep(1)} disabled={sending} className="btn-soft w-full sm:w-auto">
                → חזרה לפרטים
              </button>
            )}
            <button type="submit" disabled={sending} className="btn-primary h-14 w-full text-lg sm:ms-auto sm:w-auto sm:px-14">
              {step === 1 ? "המשך למסמכים" : sending ? `שולחת... ${progress}%` : "שליחת הבקשה"}
            </button>
          </div>
        </div>
      </form>

      {done && <ThankYouDialog />}
    </>
  );
}

function Field(props: { label: string; name: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={props.name} className="mb-1 block text-sm font-semibold">
        {props.label} <span className="text-rose">*</span>
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
        className={`flex h-full cursor-pointer flex-col items-center gap-1 rounded-t-[50px] rounded-b-2xl border px-2 pt-4 pb-3 text-center text-sm font-semibold transition ${
          fileName
            ? "border-sage-ink/40 bg-sage"
            : error
              ? "border-2 border-red-700 bg-red-50"
              : "border-dashed border-[#c99aa1] bg-blush hover:bg-petal"
        }`}
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
          {fileName ? (
            <path d="M3 9.5 L7 13 L15 5" fill="none" stroke="#4F6351" strokeWidth="2" />
          ) : (
            <path d="M9 3 V15 M3 9 H15" fill="none" stroke="#8E4352" strokeWidth="2" />
          )}
        </svg>
        {label}
        <span className={`block max-w-full truncate text-xs font-normal ${fileName ? "text-sage-ink" : "text-muted"}`}>
          {fileName ?? "צילום או קובץ"}
        </span>
        <input
          type="file"
          name={name}
          accept={ACCEPTED_FILE_TYPES}
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

function ThankYouDialog() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true">
      <div className="arch w-full max-w-sm bg-white p-2.5 shadow-xl">
        <div className="arch border border-rose px-6 pt-12 pb-7 text-center">
          <Pearls />
          <h2 className="mt-4 font-display text-3xl">תודה על מילוי השאלון!</h2>
          <p className="mt-3 leading-relaxed text-muted">
            הבקשה והמסמכים התקבלו בהצלחה.
            <br />
            שלחנו אלייך מייל אישור, ונעדכן אותך במייל לאחר בדיקת הבקשה.
          </p>
          <Link href="/" className="btn-primary mt-6 w-full">
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
