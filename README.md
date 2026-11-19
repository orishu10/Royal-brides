# כלות מלכות – Royal Brides

מערכת לניהול בקשות כלות: טופס זכאות → בדיקה ואישור ע"י המנהלת → "קנייה" בתקציב שהוקצב → קביעת איסוף → ארכיון.
תוכנית מלאה: [PLAN.md](PLAN.md).

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind 4 · Postgres (Neon) + Drizzle · Cloudflare R2 · Resend · Render.

## Running locally
```bash
cp .env.example .env.local          # defaults work with a local Postgres
npm install
npm run db:migrate                  # create tables + default settings
npm run dev                         # http://localhost:3000
```
Without R2/Resend keys, uploaded files go to `.data/uploads/` and emails are saved as HTML in `.data/emails/` (open them in a browser).

Form access code (default `06130`) lives in the `settings` table, key `apply_access_code`.

## Commands
| | |
|---|---|
| `npm test` | unit + DB tests (needs Postgres DB `royalbrides_test`, see `vitest.config.mts`) |
| `npm run test:e2e` | full bride journey in a real browser (resets `royalbrides_test`) |
| `npm run lint` / `npm run typecheck` | static checks |
| `npm run db:generate` | after editing `src/lib/db/schema.ts` – creates a migration in `drizzle/` |
| `npm run db:migrate` | applies migrations (runs automatically on every Render deploy) |
| `npm run admin:create -- <email> <manager\|maintainer> "<name>" <password>` | create an admin / reset a password |

## Where things are
| Path | What |
|---|---|
| `src/lib/db/schema.ts` | all tables (single source of truth) |
| `src/lib/application.ts` | form fields, document list, validation (shared by browser + server) |
| `src/lib/apply-service.ts` | what happens when a bride submits |
| `src/lib/bride-workflow.ts` | every status change (approve, reject, ...) – checks, history, emails |
| `src/lib/admin-queries.ts` | admin list tabs, search, bride file |
| `src/lib/bride-auth.ts` | bride login with a one-time email code |
| `src/lib/catalog.ts` | categories + the initial product list (seeded once) |
| `src/app/shop/` | bride login, catalog, cart, order |
| `src/lib/email/templates.ts` | email wording |
| `src/lib/email/send.ts` | sending + logging every email to `events` |
| `src/lib/storage.ts` | private file storage (R2 / local) |
| `src/app/` | pages and API routes |

**Server errors** are logged and emailed to `MAINTAINER_EMAIL` (max one email / 15 min). `/api/health` checks app + DB.

**Debugging:** every action and every email (including failures) is written to the `events` table, per bride.

## Daily jobs
`.github/workflows/daily.yml` calls `/api/cron/pickup-reminders` every day (reminder email the day before pickup).
In GitHub → Settings → Secrets and variables → Actions set variable `APP_URL` and secret `CRON_SECRET` (same value as on Render).

## Deploy (Render)
`render.yaml` defines the service. In Render: New → Blueprint → this repo, then fill the secret env vars (`DATABASE_URL`, `RESEND_API_KEY`, `R2_*`, `CRON_SECRET`).
