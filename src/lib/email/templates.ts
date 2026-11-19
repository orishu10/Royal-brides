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
