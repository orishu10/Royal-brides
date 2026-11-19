ALTER TABLE "orders" DROP CONSTRAINT "orders_bride_id_brides_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_bride_id_brides_id_fk" FOREIGN KEY ("bride_id") REFERENCES "public"."brides"("id") ON DELETE cascade ON UPDATE no action;