// Email templates. Plain HTML (inline styles, RTL) so they render well in every mail client.
// To change wording – edit the text here.
import type { Email } from "./send";

const GOLD = "#a8875a";

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function layout(title: string, body: string) {
  return `<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#f7f3ec;font-family:Arial,Helvetica,sans-serif;color:#3d3528">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ec;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e7dfcc">
        <tr><td style="padding:24px 28px 8px;text-align:center;font-size:22px;color:${GOLD};font-family:Georgia,serif">Royal Brides · כלות מלכות</td></tr>
        <tr><td style="padding:8px 28px 28px;font-size:16px;line-height:1.7;text-align:right" dir="rtl">${body}</td></tr>
      </table>
      <div style="font-size:12px;color:#9a8f7c;padding-top:12px">כלות מלכות</div>
    </td></tr>
  </table>
</body></html>`;
}

function button(href: string, label: string) {
  return `<p style="text-align:center;margin:24px 0"><a href="${escapeHtml(href)}" style="background:${GOLD};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;display:inline-block">${escapeHtml(label)}</a></p>`;
}

/** 1. To the bride – application received. */
export function applicationReceivedEmail(p: { to: string; firstName: string }): Email {
  const subject = "קיבלנו את הבקשה שלך – כלות מלכות";
  return {
    to: p.to,
    subject,
    html: layout(
      subject,
      `<p>${escapeHtml(p.firstName)} יקרה, שלום!</p>
       <p>תודה שמילאת את טופס הבקשה. הבקשה והמסמכים התקבלו אצלנו בהצלחה ויועברו לבדיקה.</p>
       <p>נעדכן אותך במייל ברגע שתתקבל החלטה.</p>
       <p>בברכת מזל טוב,<br>צוות כלות מלכות</p>`,
    ),
  };
}

/** 3. To the bride – approved, with budget and expiry. */
export function approvedEmail(p: {
  to: string;
  firstName: string;
  amount: string;
  expiresOn: string;
  shopLink: string;
}): Email {
  const subject = "מזל טוב! הבקשה שלך אושרה – כלות מלכות";
  return {
    to: p.to,
    subject,
    html: layout(
      subject,
      `<p>${escapeHtml(p.firstName)} יקרה, מזל טוב!</p>
       <p>שמחים לבשר שהבקשה שלך <b>אושרה</b>.</p>
       <p>הוקצב עבורך סכום של <b>${escapeHtml(p.amount)}</b> לבחירת מוצרים מהקטלוג שלנו,
          בתוקף עד <b>${escapeHtml(p.expiresOn)}</b>.</p>
       <p>לכניסה לקטלוג יש להזין את כתובת המייל הזו, ונשלח אלייך קוד כניסה.</p>
       ${button(p.shopLink, "לבחירת המוצרים")}
       <p>בברכת מזל טוב,<br>צוות כלות מלכות</p>`,
    ),
  };
}

/** 4. To the bride – rejected. */
export function rejectedEmail(p: { to: string; firstName: string; reason?: string | null }): Email {
  const subject = "עדכון לגבי הבקשה שלך – כלות מלכות";
  return {
    to: p.to,
    subject,
    html: layout(
      subject,
      `<p>${escapeHtml(p.firstName)} יקרה, שלום.</p>
       <p>לאחר בדיקת הבקשה, לצערנו לא נוכל לאשר אותה הפעם.</p>
       ${p.reason ? `<p><b>סיבה:</b> ${escapeHtml(p.reason)}</p>` : ""}
       <p>לשאלות ניתן להשיב למייל זה.</p>
       <p>מאחלים לך מזל טוב ובניין עדי עד,<br>צוות כלות מלכות</p>`,
    ),
  };
}

/** Login code for the shop. */
export function loginCodeEmail(p: { to: string; code: string }): Email {
  // The code is not in the subject: subjects are saved in the history log.
  const subject = "קוד כניסה – כלות מלכות";
  return {
    to: p.to,
    subject,
    html: layout(
      subject,
      `<p>קוד הכניסה לאתר כלות מלכות:</p>
       <p style="text-align:center;font-size:32px;letter-spacing:8px;font-weight:bold;margin:24px 0" dir="ltr">${escapeHtml(p.code)}</p>
       <p>הקוד בתוקף ל-10 דקות. אם לא ביקשת להיכנס, אפשר להתעלם מהודעה זו.</p>`,
    ),
  };
}

export type OrderLine = { name: string; size?: string | null; color?: string | null; quantity: number; total: string };

function orderTable(lines: OrderLine[], total: string) {
  const rows = lines
    .map((l) => {
      const opts = [l.size && `מידה ${l.size}`, l.color && `צבע ${l.color}`].filter(Boolean).join(", ");
      return `<tr><td style="padding:6px 0">${escapeHtml(l.name)}${opts ? ` <span style="color:#8b806d">(${escapeHtml(opts)})</span>` : ""} × ${l.quantity}</td>
              <td style="padding:6px 0;text-align:left;white-space:nowrap">${escapeHtml(l.total)}</td></tr>`;
    })
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e7dfcc;border-bottom:1px solid #e7dfcc;margin:16px 0">${rows}
    <tr><td style="padding:8px 0;font-weight:bold;border-top:1px solid #e7dfcc">סה"כ</td>
        <td style="padding:8px 0;text-align:left;font-weight:bold;border-top:1px solid #e7dfcc">${escapeHtml(total)}</td></tr></table>`;
}

/** 5. To the bride – order received. */
export function orderConfirmationEmail(p: { to: string; firstName: string; lines: OrderLine[]; total: string }): Email {
  const subject = "ההזמנה שלך התקבלה – כלות מלכות";
  return {
    to: p.to,
    subject,
    html: layout(
      subject,
      `<p>${escapeHtml(p.firstName)} יקרה,</p>
       <p>תודה! ההזמנה שלך התקבלה:</p>
       ${orderTable(p.lines, p.total)}
       <p>נעדכן אותך במייל על מועד ומקום איסוף ההזמנה.</p>
       <p>בברכת מזל טוב,<br>צוות כלות מלכות</p>`,
    ),
  };
}

/** 6. To the manager – a new order. */
export function newOrderAdminEmail(p: { to: string; fullName: string; lines: OrderLine[]; total: string; link: string }): Email {
  const subject = `הזמנה חדשה: ${p.fullName}`;
  return {
    to: p.to,
    subject,
    html: layout(subject, `<p>${escapeHtml(p.fullName)} שלחה הזמנה:</p>${orderTable(p.lines, p.total)}${button(p.link, "לתיק הכלה")}`),
  };
}

/** 7. To the bride – pickup scheduled. */
export function pickupScheduledEmail(p: { to: string; firstName: string; when: string; address: string }): Email {
  const subject = "מועד איסוף ההזמנה שלך – כלות מלכות";
  return {
    to: p.to,
    subject,
    html: layout(
      subject,
      `<p>${escapeHtml(p.firstName)} יקרה,</p>
       <p>ההזמנה שלך מוכנה! נקבע עבורך מועד איסוף:</p>
       <p style="background:#f7f3ec;border-radius:8px;padding:14px 18px;margin:16px 0">
         <b>מתי:</b> ${escapeHtml(p.when)}<br><b>איפה:</b> ${escapeHtml(p.address)}</p>
       <p><b>חשוב:</b> נא לתאם את ההגעה יום לפני המועד, בהשבה למייל זה.</p>
       <p>בברכת מזל טוב,<br>צוות כלות מלכות</p>`,
    ),
  };
}

/** 8. To the bride – reminder the day before pickup. */
export function pickupReminderEmail(p: { to: string; firstName: string; when: string; address: string }): Email {
  const subject = "תזכורת: איסוף ההזמנה מחר – כלות מלכות";
  return {
    to: p.to,
    subject,
    html: layout(
      subject,
      `<p>${escapeHtml(p.firstName)} יקרה,</p>
       <p>תזכורת: מחר נקבע איסוף ההזמנה שלך.</p>
       <p style="background:#f7f3ec;border-radius:8px;padding:14px 18px;margin:16px 0">
         <b>מתי:</b> ${escapeHtml(p.when)}<br><b>איפה:</b> ${escapeHtml(p.address)}</p>
       <p>נא לאשר את הגעתך בהשבה למייל זה.</p>
       <p>מחכות לך,<br>צוות כלות מלכות</p>`,
    ),
  };
}

/** 2. To the manager – a new bride applied. */
export function newApplicationAdminEmail(p: {
  to: string;
  fullName: string;
  weddingDate: string;
  community: string;
  link: string;
}): Email {
  const subject = `כלה חדשה: ${p.fullName}`;
  return {
    to: p.to,
    subject,
    html: layout(
      subject,
      `<p>התקבלה בקשה חדשה.</p>
       <p><b>שם:</b> ${escapeHtml(p.fullName)}<br>
          <b>תאריך החתונה:</b> ${escapeHtml(p.weddingDate)}<br>
          <b>מגזר / קהילה:</b> ${escapeHtml(p.community)}</p>
       ${button(p.link, "לצפייה בתיק הכלה")}`,
    ),
  };
}
