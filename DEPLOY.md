# מדריך עלייה לאוויר – כלות מלכות

מסמך צעד-אחר-צעד. כל שלב מסומן מי עושה אותו: **[אתם]** = פעולה בחשבון/דשבורד שלכם, **[Claude]** = אני יכול לעשות/לבדוק.
סדר מומלץ: 1 → 9. עד שלב 8 האתר הישן ב-Wix ממשיך לעבוד כרגיל.

> עלות חודשית צפויה: Render Starter (~$7). כל השאר בשכבה החינמית.

---

## 0. לפני הכל – תיקון דחוף ב-Wix [אתם]
עד המעבר, האתר הישן חושף מידע אישי (ראו PLAN.md סעיף 0):
- Wix → CMS → **Submissions** → More actions → **Permissions**: קריאה / עדכון / מחיקה = **Admin**. הוספה = Anyone.
- דף "Kallah Page (Submissions Item)" → Permissions → **Members only**, ו-SEO → **לא להציג במנועי חיפוש**.

---

## 1. Neon – מסד הנתונים [אתם]
1. https://neon.tech → Sign up (עם מייל הארגון).
2. **New project**: שם `royal-brides`, Postgres **17**, Region **AWS Europe Central (Frankfurt)** – ליד שרת Render.
3. Dashboard → **Connect** → העתיקו את ה-connection string **הישיר** (בלי `-pooler` בכתובת), עם `?sslmode=require`.
   זה ה-`DATABASE_URL`.

## 2. Cloudflare – קבצים, גיבויים והגנה מספאם [אתם]
1. https://dash.cloudflare.com → Sign up.
2. **R2** → Enable (מבקש כרטיס אשראי; 10GB ראשונים חינם).
3. צרו 2 buckets (Location: Automatic, **פרטיים** – אל תפעילו Public access):
   - `royal-brides-files` – מסמכי הכלות ותמונות מוצרים
   - `royal-brides-backups` – גיבויי מסד הנתונים
4. R2 → **Manage API tokens** → Create → הרשאה **Object Read & Write**, מוגבל לשני ה-buckets.
   שמרו: `Access Key ID`, `Secret Access Key`, ו-**Account ID** (מופיע בצד הדף).
5. **Turnstile** → Add widget: שם `royal-brides`, Hostnames: `xn--9dbaqbdbn9ge.xn--4dbrk0ce` וגם הכתובת הזמנית של Render (שלב 4), Mode: **Managed**.
   שמרו: `Site Key` ו-`Secret Key`.

## 3. Resend – מיילים [אתם, עם גישה ל-DNS]
1. https://resend.com → Sign up.
2. **Domains → Add domain** → `royalbrides.co.il` (המיילים יוצאים מכתובת לטינית – פחות ספאם).
3. Resend יציג 3–4 רשומות DNS (TXT ל-SPF/DKIM, MX ל-bounce). הוסיפו אותן אצל מי שמנהל את ה-DNS של `royalbrides.co.il`:
   - אם הדומיין מחובר ל-Wix דרך **nameservers של Wix** – מוסיפים ב-Wix → Domains → DNS Records.
   - אחרת – אצל Internic.
   הרשומות האלה **לא** פוגעות באתר הקיים.
4. הוסיפו גם DMARC: רשומת TXT בשם `_dmarc` עם הערך `v=DMARC1; p=none; rua=mailto:bracha@bjs.co.il`.
5. אחרי האימות (✓ ירוק) → **API Keys** → Create (Sending access). זה ה-`RESEND_API_KEY`.

## 4. Render – האתר עצמו [אתם, Claude יכול ללוות]
1. https://dashboard.render.com → **New → Blueprint** → חברו את GitHub ובחרו את `orishu10/royal-brides`, ענף `main`.
   (לפני כן צריך למזג את הענף `ccr-2724badf-d92q40` ל-`main` – אפשר לבקש ממני Pull Request.)
2. Render יקרא את `render.yaml` ויבקש למלא את המשתנים הסודיים:

| משתנה | ערך |
|---|---|
| `DATABASE_URL` | משלב 1 |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | משלב 2 |
| `R2_BUCKET` | `royal-brides-files` |
| `RESEND_API_KEY` | משלב 3 |
| `CRON_SECRET` | מחרוזת אקראית ארוכה (למשל מ-https://1password.com/password-generator, 40 תווים) |
| `MAINTAINER_EMAIL` | המייל שלכם (התראות על תקלות) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | משלב 2 |

   `SESSION_SECRET` נוצר אוטומטית. `APP_URL`, `ADMIN_NOTIFY_EMAIL`, `EMAIL_FROM`, `EMAIL_REPLY_TO` כבר מוגדרים בקובץ.
3. **Apply**. ה-deploy הראשון יוצר את הטבלאות ומכניס את 15 המוצרים. בסוף תקבלו כתובת זמנית `https://royal-brides-xxxx.onrender.com`.
4. בדיקה: `https://<הכתובת הזמנית>/api/health` צריך להחזיר `{"ok":true}`.
5. **זמנית**, עד חיבור הדומיין: שנו את `APP_URL` לכתובת הזמנית (כדי שהקישורים במיילים יעבדו בבדיקות). אחרי שלב 7 – החזירו.

## 5. יצירת משתמשי ניהול [אתם, דרך Render]
Render → השירות → **Shell**, והריצו (סיסמאות חזקות, 10+ תווים):
```bash
npm run admin:create -- bracha@bjs.co.il manager "ברכה" "<סיסמה לברכה>"
npm run admin:create -- <המייל שלכם> maintainer "<השם שלכם>" "<סיסמה>"
```
אותה פקודה גם מאפסת סיסמה שנשכחה.

## 6. GitHub – משימות יומיות וגיבוי [אתם]
`github.com/orishu10/royal-brides` → Settings → **Secrets and variables → Actions**:
- **Variables**: `APP_URL` = כתובת האתר (זמנית או סופית).
- **Secrets**:
  - `CRON_SECRET` – אותו ערך כמו ב-Render
  - `PROD_DATABASE_URL` – משלב 1
  - `BACKUP_PASSPHRASE` – סיסמה ארוכה להצפנת הגיבויים. **שמרו אותה במקום בטוח** – בלעדיה אי אפשר לשחזר.
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` – משלב 2
  - `R2_BACKUP_BUCKET` = `royal-brides-backups`

בדיקה: Actions → **Nightly DB backup** → Run workflow → אמור להסתיים בירוק, ובקובץ חדש ב-bucket הגיבויים.

## 7. בדיקת קבלה – לפני חיבור הדומיין [אתם + ברכה, Claude יכול לעזור]
על הכתובת הזמנית, עם מייל אמיתי שלכם ככלה-בדיקה:
- [ ] טופס זכאות → חלון תודה → מייל לכלה + מייל לברכה (לא בספאם? בדקו גם Gmail וגם Outlook)
- [ ] ברכה נכנסת, רואה את הכלה, פותחת מסמכים, מאשרת עם סכום → מייל אישור
- [ ] כניסת כלה בקוד → הזמנה → חלון תודה → 2 מיילים
- [ ] קביעת איסוף → מייל; סגירת תיק → ארכיון
- [ ] ברכה מעלה תמונות למוצרים ומעדכנת מחירים/קטגוריות/מידות
- [ ] מחיקת כלת-הבדיקה: Render Shell → `psql "$DATABASE_URL" -c "delete from brides where email='<המייל>'"`

## 8. חיבור הדומיינים – המעבר בפועל [אתם, עם גישה ל-DNS ב-Internic]
1. Render → השירות → Settings → **Custom Domains** → הוסיפו:
   `xn--9dbaqbdbn9ge.xn--4dbrk0ce` (= כלותמלכות.ישראל), `www.xn--9dbaqbdbn9ge.xn--4dbrk0ce`, `royalbrides.co.il`, `www.royalbrides.co.il`.
2. Render יציג לכל אחד רשומת DNS (A לדומיין הראשי, CNAME ל-www). הזינו אותן ב-Internic.
   ⚠️ שינוי ה-DNS של `royalbrides.co.il` **מנתק את אתר Wix**. עשו זאת רק אחרי שלב 7.
3. Render מנפיק SSL אוטומטית (עד שעה). `royalbrides.co.il` מפנה אוטומטית לכתובת העברית.
4. החזירו את `APP_URL` ב-Render ל-`https://xn--9dbaqbdbn9ge.xn--4dbrk0ce`, וכך גם ב-GitHub Variables.
5. ב-Turnstile ודאו שהדומיין הסופי ברשימת ה-Hostnames.

## 9. ניטור ואחרי העלייה [אתם]
- https://uptimerobot.com (חינם) → New monitor → HTTP(s) → `https://xn--9dbaqbdbn9ge.xn--4dbrk0ce/api/health`, כל 5 דקות, התראה למייל.
- תקלות שרת מגיעות אוטומטית ל-`MAINTAINER_EMAIL`. לוגים מלאים: Render → Logs.
- להשאיר את מנוי Wix שבועיים (גיבוי), לייצא משם מה שצריך, ואז לבטל.
- **מדיניות הפרטיות** (`/privacy`) היא טיוטה – יש להשלים את החלקים בסוגריים מרובעים ולהעביר לבדיקת עו"ד לפני העלייה.

---

## שחזור גיבוי (למקרה חירום)
1. R2 → `royal-brides-backups/db/` → הורידו את הקובץ הרצוי (`royalbrides-<תאריך>.sql.gz.gpg`).
2. במחשב עם `gpg` ו-`psql`:
```bash
gpg --batch --passphrase "<BACKUP_PASSPHRASE>" -d royalbrides-<תאריך>.sql.gz.gpg | gunzip > backup.sql
psql "<DATABASE_URL של מסד ריק חדש>" -f backup.sql
```
3. מומלץ לשחזר ל-branch חדש ב-Neon, לבדוק, ורק אז להחליף את `DATABASE_URL` ב-Render.
המסמכים עצמם יושבים ב-R2 (שמור ומשוכפל ע"י Cloudflare) ולא נכללים בגיבוי הלילי.
