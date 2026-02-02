CREATE TABLE "coupon_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"coupon_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"order_id" integer,
	"used_at" timestamp DEFAULT now(),
	CONSTRAINT "coupon_usage_coupon_id_user_id_unique" UNIQUE("coupon_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "stock_reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"user_id" integer,
	"session_id" text,
	"quantity" integer NOT NULL,
	"reserved_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"order_id" integer
);
--> statement-breakpoint
CREATE TABLE "reseller_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" integer NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"device_fingerprint" text,
	"referrer" text,
	"converted_to_order" boolean DEFAULT false,
	"order_id" integer,
	"clicked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reseller_commissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"reseller_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"link_id" integer,
	"order_amount" numeric NOT NULL,
	"base_commission_rate" numeric NOT NULL,
	"base_commission_amount" numeric NOT NULL,
	"margin_earnings" numeric DEFAULT '0' NOT NULL,
	"total_amount" numeric NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"confirmed_at" timestamp,
	"paid_at" timestamp,
	"cancellation_reason" text
);
--> statement-breakpoint
CREATE TABLE "reseller_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"reseller_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"short_code" text NOT NULL,
	"custom_title" text,
	"margin_type" text DEFAULT 'percentage' NOT NULL,
	"margin_value" numeric DEFAULT '0' NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"total_revenue" numeric DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"last_click_at" timestamp,
	CONSTRAINT "reseller_links_short_code_unique" UNIQUE("short_code"),
	CONSTRAINT "reseller_links_reseller_id_product_id_unique" UNIQUE("reseller_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "reseller_payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"reseller_id" integer NOT NULL,
	"amount" numeric NOT NULL,
	"payout_method" text NOT NULL,
	"bank_account_number" text,
	"bank_ifsc_code" text,
	"upi_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"transaction_id" text,
	"gateway" text,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now(),
	"processed_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "resellers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"reseller_code" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"tier" text DEFAULT 'bronze' NOT NULL,
	"total_earnings" numeric DEFAULT '0' NOT NULL,
	"pending_payout" numeric DEFAULT '0' NOT NULL,
	"lifetime_sales" integer DEFAULT 0 NOT NULL,
	"lifetime_orders" integer DEFAULT 0 NOT NULL,
	"bank_account_number" text,
	"bank_ifsc_code" text,
	"bank_account_name" text,
	"upi_id" text,
	"preferred_payout_method" text DEFAULT 'upi',
	"risk_score" integer DEFAULT 0 NOT NULL,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"flag_reason" text,
	"created_at" timestamp DEFAULT now(),
	"approved_at" timestamp,
	"suspended_at" timestamp,
	CONSTRAINT "resellers_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "resellers_reseller_code_unique" UNIQUE("reseller_code")
);
--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "max_usage_per_user" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "media_source" text DEFAULT 'url' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "media_file_path" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_cost" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "reseller_link_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "referred_by_reseller" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "failed_login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lockout_until" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_password_change_at" timestamp;--> statement-breakpoint
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_clicks" ADD CONSTRAINT "reseller_clicks_link_id_reseller_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."reseller_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_clicks" ADD CONSTRAINT "reseller_clicks_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_commissions" ADD CONSTRAINT "reseller_commissions_reseller_id_resellers_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_commissions" ADD CONSTRAINT "reseller_commissions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_commissions" ADD CONSTRAINT "reseller_commissions_link_id_reseller_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."reseller_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_links" ADD CONSTRAINT "reseller_links_reseller_id_resellers_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_links" ADD CONSTRAINT "reseller_links_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_payouts" ADD CONSTRAINT "reseller_payouts_reseller_id_resellers_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resellers" ADD CONSTRAINT "resellers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "order_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "product_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "product_seller_idx" ON "products" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "product_featured_idx" ON "products" USING btree ("is_featured");