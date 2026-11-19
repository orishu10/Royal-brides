ALTER TABLE "order_items" DROP CONSTRAINT "order_items_variant_id_product_variants_id_fk";--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "variant_id";--> statement-breakpoint
DROP TABLE "product_variants";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sizes" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "colors" text[] DEFAULT '{}'::text[] NOT NULL;
