// Database schema – the single source of truth for all tables.
// After changing this file run: npm run db:generate  (creates a migration in /drizzle)
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/* ---------- Brides (applications) ---------- */

export const brideStatus = pgEnum("bride_status", [
  "submitted", // waiting for review
  "approved", // budget allocated, may shop
  "rejected",
  "ordered", // order sent
  "pickup_scheduled", // pickup date/time/address set
]);

export const brides = pgTable("brides", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  idNumber: text("id_number").notNull(), // text: keeps leading zeros
  fatherName: text("father_name").notNull(),
  motherName: text("mother_name").notNull(),
  community: text("community").notNull(),
  weddingDate: date("wedding_date").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),

  status: brideStatus("status").notNull().default("submitted"),
  budgetAgorot: integer("budget_agorot"), // money is always stored in agorot (1₪ = 100)
  budgetExpiresOn: date("budget_expires_on"),
  rejectionReason: text("rejection_reason"),
  pickupAt: timestamp("pickup_at", { withTimezone: true }),
  pickupAddress: text("pickup_address"),
  archivedAt: timestamp("archived_at", { withTimezone: true }), // closed file

  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documentKind = pgEnum("document_kind", [
  "bride_id",
  "bride_id_appendix",
  "parent_id",
  "parent_id_appendix",
  "death_certificate",
  "recommendation_letter",
  "wedding_invitation",
]);

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  brideId: uuid("bride_id")
    .notNull()
    .references(() => brides.id, { onDelete: "cascade" }),
  kind: documentKind("kind").notNull(),
  storageKey: text("storage_key").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  uploadedAt: createdAt(),
});

/* ---------- Admins ---------- */

export const adminRole = pgEnum("admin_role", [
  "manager", // Bracha – runs the day to day, receives notifications
  "maintainer", // technical owner – full access for testing/maintenance, no notifications
]);

export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: adminRole("role").notNull(),
  createdAt: createdAt(),
});

/* ---------- Shop ---------- */

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull(),
  priceAgorot: integer("price_agorot").notNull(),
  imageKey: text("image_key"),
  // Options the bride chooses from (e.g. clothing). Empty = no choice needed. No stock tracking.
  sizes: text("sizes").array().notNull().default(sql`'{}'::text[]`),
  colors: text("colors").array().notNull().default(sql`'{}'::text[]`),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brideId: uuid("bride_id")
      .notNull()
      .references(() => brides.id, { onDelete: "cascade" }),
    totalAgorot: integer("total_agorot").notNull(),
    submittedAt: createdAt(),
  },
  (t) => [uniqueIndex("orders_bride_unique").on(t.brideId)], // one order per bride
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id),
  // snapshots, so the order stays correct even if the product changes later
  name: text("name").notNull(),
  size: text("size"),
  color: text("color"),
  unitPriceAgorot: integer("unit_price_agorot").notNull(),
  quantity: integer("quantity").notNull(),
});

/* ---------- Audit log / history ---------- */

// Every important action and every email is written here.
// Shown as the "history" tab of a bride's file – the main debugging tool.
export const events = pgTable("events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  brideId: uuid("bride_id").references(() => brides.id, { onDelete: "cascade" }),
  actor: text("actor").notNull(), // admin email | "bride" | "system"
  type: text("type").notNull(), // e.g. "application.submitted", "email.sent"
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
});

/* ---------- Settings & auth helpers ---------- */

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: createdAt(),
});

export type Bride = typeof brides.$inferSelect;
export type DocumentKind = (typeof documentKind.enumValues)[number];
export type Product = typeof products.$inferSelect;
