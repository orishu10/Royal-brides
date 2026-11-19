import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E_DATA } from "../playwright.config";

// The whole process, as in the original spec:
// apply → manager approves → bride logs in and orders → manager schedules pickup → closes the file.

const BRIDE_EMAIL = "kalla@example.com";
const tiny = (name: string, mimeType: string, body: string) => ({ name, mimeType, buffer: Buffer.from(body) });
const PDF = tiny("doc.pdf", "application/pdf", "%PDF-1.4\n%%EOF\n");
const DOCS = ["bride_id", "bride_id_appendix", "parent_id", "parent_id_appendix", "death_certificate", "recommendation_letter", "wedding_invitation"];

function emails(template: string) {
  const dir = path.join(E2E_DATA, "emails");
  return readdirSync(dir)
    .filter((f) => f.includes(template))
    .sort()
    .map((f) => readFileSync(path.join(dir, f), "utf8"));
}

async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.fill("#email", "bracha@example.com");
  await page.fill("#password", "E2e-Password-1");
  await page.click("button[type=submit]");
  await expect(page.getByRole("heading", { name: "כלות" })).toBeVisible();
}

test("full bride journey", async ({ browser }) => {
  const bride = await (await browser.newContext()).newPage();
  const admin = await (await browser.newContext()).newPage();

  // 1. Application form (step 1 is validated before moving on)
  await bride.goto("/");
  await bride.getByRole("link", { name: "בדיקת זכאות" }).click();
  await bride.fill("#code", "06130");
  await bride.click("button:has-text('כניסה')");
  await bride.click("button:has-text('המשך למסמכים')");
  await expect(bride.getByText("נא למלא שם פרטי")).toBeVisible(); // empty step 1 can't continue
  for (const [field, value] of Object.entries({
    firstName: "שרה",
    lastName: "כהן",
    idNumber: "123456782",
    phone: "0527654321",
    fatherName: "יעקב",
    motherName: "רבקה",
    email: BRIDE_EMAIL,
    address: "רחוב הנביאים 1, ירושלים",
    weddingDate: new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10),
  })) {
    await bride.fill(`#${field}`, value);
  }
  await bride.selectOption("#community", "ספרדי");
  await bride.click("button:has-text('המשך למסמכים')");
  await expect(bride.getByText("שלב 2 מתוך 2")).toBeVisible();
  for (const kind of DOCS) await bride.setInputFiles(`input[name=${kind}]`, PDF);
  await bride.click("button:has-text('שליחת הבקשה')");
  await expect(bride.getByText("יש לאשר את מדיניות הפרטיות")).toBeVisible(); // consent is required
  await bride.check("input[name=privacyConsent]");
  await bride.click("button:has-text('שליחת הבקשה')");
  await expect(bride.getByRole("heading", { name: "תודה על מילוי השאלון!" })).toBeVisible();
  expect(emails("application_received")).toHaveLength(1);
  expect(emails("application_new_admin")).toHaveLength(1);

  // 2. Manager reviews and approves with a budget
  await adminLogin(admin);
  await admin.getByRole("link", { name: "שרה כהן" }).click();
  const docResponse = await admin.request.get((await admin.getByRole("link", { name: "צפייה" }).first().getAttribute("href"))!);
  expect(docResponse.headers()["content-type"]).toBe("application/pdf");
  await admin.click("button:has-text('אישור הבקשה')");
  await admin.fill("input[name=amount]", "600");
  await admin.click("button:has-text('אישור ושליחת מייל')");
  await expect(admin.getByText("הוקצב:")).toBeVisible();
  expect(emails("bride_approved")[0]).toContain("₪600");

  // 3. Bride logs in with an emailed code and orders within budget
  await bride.goto("/shop");
  await bride.fill("input[name=email]", BRIDE_EMAIL);
  await bride.click("button:has-text('שליחת קוד')");
  await expect(bride.locator("input[name=code]")).toBeVisible();
  const code = emails("login_code").at(-1)!.match(/>(\d{6})</)![1];
  await bride.fill("input[name=code]", code);
  await bride.click("button:has-text('כניסה')");
  await expect(bride.getByText("נותר לך")).toBeVisible();

  const card = (name: string) => bride.locator("div.card", { has: bride.locator(`div.font-display:text-is("${name}")`) });
  await card("סט כלי מיטה").getByRole("button").click(); // ₪500
  await expect(card("מכשיר פנקייק").getByRole("button")).toHaveText("חורג מהסכום"); // ₪200 > ₪100 left
  await card("שעון שבת 24 שעות").getByRole("button").click(); // ₪20
  await bride.click("button:has-text('הסל שלי')");
  bride.once("dialog", (d) => d.accept());
  await bride.click("button:has-text('שליחת הזמנה')");
  await expect(bride.getByRole("heading", { name: "תודה שרכשת!" })).toBeVisible();
  expect(emails("order_confirmation")[0]).toContain("₪520");
  expect(emails("order_new_admin")).toHaveLength(1);

  // 4. Manager schedules pickup
  await admin.reload();
  await expect(admin.getByRole("heading", { name: "הזמנה" })).toBeVisible();
  const when = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10) + "T11:00";
  await admin.fill("input[name=pickupAt]", when);
  await admin.fill("textarea[name=address]", "רחוב הרב קוק 12, בני ברק");
  await admin.click("button:has-text('שמירה ושליחת מייל')");
  await expect(admin.getByRole("button", { name: "שינוי מועד האיסוף" })).toBeVisible();
  expect(emails("pickup_scheduled")[0]).toContain("יום לפני");

  await bride.goto("/shop");
  await expect(bride.getByText("מועד האיסוף:")).toBeVisible();

  // 5. Order collected → close the file
  admin.once("dialog", (d) => d.accept());
  await admin.click("button:has-text('ההזמנה נאספה')");
  await expect(admin.getByText("התיק נסגר ב-")).toBeVisible();
  await admin.goto("/admin?tab=archive");
  await expect(admin.getByRole("link", { name: "שרה כהן" })).toBeVisible();
});

test("admin pages and documents need login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  const res = await page.request.get("/admin/documents/00000000-0000-0000-0000-000000000000");
  expect(res.status()).toBe(401);
});
