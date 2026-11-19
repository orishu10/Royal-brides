import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

// Private file storage. Production: Cloudflare R2 (S3 API). Local dev: .data/uploads/.
// Files are never public – they are served only through admin-checked routes.

interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

const LOCAL_DIR = path.join(process.cwd(), ".data", "uploads");

const localStorage: Storage = {
  async put(key, body) {
    const file = path.join(LOCAL_DIR, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  },
  get: (key) => readFile(path.join(LOCAL_DIR, key)),
  remove: (key) => rm(path.join(LOCAL_DIR, key), { force: true }),
};

function r2Storage(): Storage {
  const e = env();
  const bucket = e.R2_BUCKET!;
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: e.R2_ACCESS_KEY_ID!, secretAccessKey: e.R2_SECRET_ACCESS_KEY! },
  });
  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
      );
    },
    async get(key) {
      const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      return Buffer.from(await res.Body!.transformToByteArray());
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

let instance: Storage | undefined;
export function storage(): Storage {
  instance ??= env().R2_BUCKET ? r2Storage() : localStorage;
  return instance;
}

/** Random key – no personal data in file names. */
export function newStorageKey(prefix: string, extension: string) {
  return `${prefix}/${randomUUID()}${extension}`;
}

/** Detects the real file type from its first bytes (don't trust the browser's claim). */
export function sniffFileType(buf: Buffer): { mime: string; ext: string } | null {
  const hex = buf.subarray(0, 12).toString("hex");
  if (hex.startsWith("25504446")) return { mime: "application/pdf", ext: ".pdf" };
  if (hex.startsWith("ffd8ff")) return { mime: "image/jpeg", ext: ".jpg" };
  if (hex.startsWith("89504e47")) return { mime: "image/png", ext: ".png" };
  if (hex.startsWith("52494646") && buf.subarray(8, 12).toString() === "WEBP")
    return { mime: "image/webp", ext: ".webp" };
  const brand = buf.subarray(4, 12).toString("latin1");
  if (/^ftyp(heic|heix|mif1|msf1)/.test(brand)) return { mime: "image/heic", ext: ".heic" };
  return null;
}
