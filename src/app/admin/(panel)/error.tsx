"use client";

import Link from "next/link";

// Shown instead of a blank page if something fails in the admin portal.
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
      <h1 className="text-xl font-bold">משהו השתבש</h1>
      <p className="mt-2 text-muted">נסי שוב. אם הבעיה חוזרת, יש לפנות לתחזוקה עם הקוד הבא:</p>
      <code className="mt-3 block text-sm" dir="ltr">
        {error.digest ?? "—"}
      </code>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={reset} className="btn-primary">
          נסי שוב
        </button>
        <Link href="/admin" className="btn-outline">
          לרשימת הכלות
        </Link>
      </div>
    </div>
  );
}
