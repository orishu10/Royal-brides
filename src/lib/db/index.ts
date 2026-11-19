import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

// One connection pool per process (reused across hot reloads in dev).
const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };
// Neon's pooled URL ("-pooler") runs in transaction mode, which can't use prepared statements.
const url = env().DATABASE_URL;
const sql = globalForDb.sql ?? postgres(url, { max: 5, prepare: !url.includes("-pooler") });
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };
