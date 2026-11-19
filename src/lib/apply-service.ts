import "server-only";
import { applicationSchema, DOCUMENTS, MAX_FILE_BYTES, PRIVACY_POLICY_VERSION } from "@/lib/application";
import { db, schema } from "@/lib/db";
import type { DocumentKind } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import { applicationReceivedEmail, newApplicationAdminEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { newStorageKey, sniffFileType, storage } from "@/lib/storage";

export type UploadedFile = { name: string; data: Buffer };

export type SubmitResult =
  | { ok: true; brideId: string }
  | { ok: false; errors: Record<string, string> };

/**
 * A new bride submits the application form:
 * validate → store files → save bride + documents → log → email bride and manager.
 */
export async function submitApplication(
  fields: Record<string, string>,
  files: Partial<Record<DocumentKind, UploadedFile>>,
): Promise<SubmitResult> {
  const errors: Record<string, string> = {};

  const parsed = applicationSchema.safeParse(fields);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
  }

  const checked: { kind: DocumentKind; file: UploadedFile; mime: string; ext: string }[] = [];
  for (const { kind } of DOCUMENTS) {
    const file = files[kind];
    if (!file || file.data.length === 0) {
      errors[kind] = "נא לצרף קובץ";
      continue;
    }
    if (file.data.length > MAX_FILE_BYTES) {
      errors[kind] = "הקובץ גדול מדי (עד 10MB)";
      continue;
    }
    const type = sniffFileType(file.data);
    if (!type) {
      errors[kind] = "ניתן לצרף רק תמונה או PDF";
      continue;
    }
    checked.push({ kind, file, ...type });
  }

  if (!parsed.success || Object.keys(errors).length > 0) return { ok: false, errors };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- consent is logged in the event, not a column
  const { privacyConsent, ...input } = parsed.data;

  // Upload files first; if saving to the DB fails we delete them again.
  const stored: { kind: DocumentKind; key: string; name: string; mime: string; size: number }[] = [];
  try {
    for (const c of checked) {
      const key = newStorageKey("documents", c.ext);
      await storage().put(key, c.file.data, c.mime);
      stored.push({ kind: c.kind, key, name: c.file.name.slice(0, 200), mime: c.mime, size: c.file.data.length });
    }

    const brideId = await db.transaction(async (tx) => {
      const [bride] = await tx.insert(schema.brides).values(input).returning({ id: schema.brides.id });
      await tx.insert(schema.documents).values(
        stored.map((s) => ({
          brideId: bride.id,
          kind: s.kind,
          storageKey: s.key,
          fileName: s.name,
          mimeType: s.mime,
          sizeBytes: s.size,
        })),
      );
      await tx.insert(schema.events).values({
        brideId: bride.id,
        actor: "bride",
        type: "application.submitted",
        // proof of consent to the privacy policy (sensitive data)
        payload: { privacyConsent: true, privacyPolicyVersion: PRIVACY_POLICY_VERSION },
      });
      return bride.id;
    });

    const fullName = `${input.firstName} ${input.lastName}`;
    await sendEmail(applicationReceivedEmail({ to: input.email, firstName: input.firstName }), {
      brideId,
      template: "application_received",
    });
    await sendEmail(
      newApplicationAdminEmail({
        to: env().ADMIN_NOTIFY_EMAIL,
        fullName,
        weddingDate: input.weddingDate.split("-").reverse().join("/"),
        community: input.community,
        link: `${env().APP_URL}/admin/brides/${brideId}`,
      }),
      { brideId, template: "application_new_admin" },
    );

    return { ok: true, brideId };
  } catch (err) {
    await Promise.allSettled(stored.map((s) => storage().remove(s.key)));
    throw err;
  }
}
