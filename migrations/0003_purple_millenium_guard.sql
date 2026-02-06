CREATE TABLE "feature_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"rollout_percentage" integer DEFAULT 0 NOT NULL,
	"user_ids" integer[],
	"user_roles" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	CONSTRAINT "feature_flags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"snapshot_data" jsonb NOT NULL,
	"pdf_url" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "invoices_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "order_item_pairs" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id_1" integer NOT NULL,
	"product_id_2" integer NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "order_item_pairs_product_id_1_product_id_2_unique" UNIQUE("product_id_1","product_id_2")
);
--> statement-breakpoint
CREATE TABLE "product_colors" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"color_name" text NOT NULL,
	"color_hex" text,
	"image_url" text,
	"stock" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"image_url" text NOT NULL,
	"type" text DEFAULT 'gallery'
);
--> statement-breakpoint
CREATE TABLE "product_sizes" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"size" text NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"price_override" numeric
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"keys" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "review_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "review_votes_review_id_user_id_unique" UNIQUE("review_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "shipping_presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"settings" jsonb NOT NULL,
	"is_system" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shipping_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(50) NOT NULL,
	"value" varchar(255) NOT NULL,
	"description" text,
	"allowed_values" jsonb,
	"min_role_level" integer DEFAULT 1,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"updated_by" integer,
	CONSTRAINT "shipping_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "shipping_settings_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"setting_key" varchar(50) NOT NULL,
	"old_value" varchar(255),
	"new_value" varchar(255) NOT NULL,
	"changed_by" integer NOT NULL,
	"changed_at" timestamp DEFAULT now(),
	"ip_address" varchar(45),
	"user_agent" text,
	"change_reason" text
);
--> statement-breakpoint
CREATE TABLE "commission_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category_id" integer,
	"seller_id" integer,
	"commission_type" text DEFAULT 'percentage' NOT NULL,
	"commission_value" numeric NOT NULL,
	"min_commission" numeric,
	"max_commission" numeric,
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seller_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seller_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_order_id" integer NOT NULL,
	"order_item_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"product_name" text NOT NULL,
	"product_sku" text,
	"quantity" integer NOT NULL,
	"unit_price" numeric NOT NULL,
	"total_price" numeric NOT NULL,
	"size" text,
	"color" text,
	"return_status" text DEFAULT 'none',
	"return_quantity" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "seller_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"seller_id" integer NOT NULL,
	"seller_order_number" text NOT NULL,
	"subtotal" numeric NOT NULL,
	"shipping_cost" numeric DEFAULT '0',
	"discount" numeric DEFAULT '0',
	"platform_fee" numeric NOT NULL,
	"platform_fee_percentage" numeric NOT NULL,
	"seller_earnings" numeric NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"cancelled_at" timestamp,
	"cancelled_by" integer,
	"cancellation_reason" text,
	"tracking_number" text,
	"shipping_provider" text,
	"shipping_label" text,
	"estimated_delivery" timestamp,
	"shipped_at" timestamp,
	"delivered_at" timestamp,
	"payout_eligible_at" timestamp,
	"payout_status" text DEFAULT 'pending',
	"state_history" jsonb DEFAULT '[]'::jsonb,
	"state_version" integer DEFAULT 1,
	"customer_note" text,
	"seller_note" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "seller_orders_seller_order_number_unique" UNIQUE("seller_order_number")
);
--> statement-breakpoint
CREATE TABLE "seller_payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_id" integer NOT NULL,
	"payout_number" text NOT NULL,
	"amount" numeric NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"bank_account_number" text NOT NULL,
	"bank_ifsc_code" text NOT NULL,
	"bank_account_name" text NOT NULL,
	"transaction_id" text,
	"utr_number" text,
	"gateway" text,
	"failure_reason" text,
	"retry_count" integer DEFAULT 0,
	"requested_by" integer,
	"approved_by" integer,
	"processed_by" integer,
	"approval_note" text,
	"created_at" timestamp DEFAULT now(),
	"approved_at" timestamp,
	"processed_at" timestamp,
	"completed_at" timestamp,
	CONSTRAINT "seller_payouts_payout_number_unique" UNIQUE("payout_number")
);
--> statement-breakpoint
CREATE TABLE "seller_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"shop_name" text NOT NULL,
	"business_type" text NOT NULL,
	"description" text,
	"logo_url" text,
	"banner_url" text,
	"business_email" text NOT NULL,
	"business_phone" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"gst_number" text,
	"gst_verified" boolean DEFAULT false,
	"has_gst" boolean DEFAULT false,
	"pan_number" text NOT NULL,
	"pan_verified" boolean DEFAULT false,
	"bank_account_number" text NOT NULL,
	"bank_ifsc_code" text NOT NULL,
	"bank_account_name" text NOT NULL,
	"bank_name" text,
	"bank_verified" boolean DEFAULT false,
	"pickup_address_line1" text NOT NULL,
	"pickup_address_line2" text,
	"pickup_city" text NOT NULL,
	"pickup_state" text NOT NULL,
	"pickup_pincode" text NOT NULL,
	"pickup_phone" text NOT NULL,
	"pickup_landmark" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"status_reason" text,
	"approved_by" integer,
	"approved_at" timestamp,
	"suspended_at" timestamp,
	"rating" numeric DEFAULT '0',
	"total_ratings" integer DEFAULT 0,
	"total_orders" integer DEFAULT 0,
	"total_products" integer DEFAULT 0,
	"completion_rate" numeric DEFAULT '100',
	"response_time" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "seller_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "seller_return_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"return_number" text NOT NULL,
	"seller_order_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"seller_id" integer NOT NULL,
	"reason" text NOT NULL,
	"description" text,
	"images" text[],
	"return_items" jsonb NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"requested_refund_amount" numeric NOT NULL,
	"approved_refund_amount" numeric,
	"refund_method" text,
	"pickup_address" jsonb,
	"pickup_scheduled_at" timestamp,
	"pickup_attempts" integer DEFAULT 0,
	"pickup_agent_name" text,
	"pickup_agent_phone" text,
	"qc_result" text,
	"qc_notes" text,
	"qc_images" text[],
	"qc_by" integer,
	"seller_response" text,
	"seller_responded_at" timestamp,
	"admin_note" text,
	"responded_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"refunded_at" timestamp,
	"closed_at" timestamp,
	CONSTRAINT "seller_return_requests_return_number_unique" UNIQUE("return_number")
);
--> statement-breakpoint
CREATE TABLE "seller_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_id" integer NOT NULL,
	"wallet_id" integer NOT NULL,
	"transaction_number" text NOT NULL,
	"type" text NOT NULL,
	"amount" numeric NOT NULL,
	"reference_type" text,
	"reference_id" integer,
	"pending_balance_after" numeric NOT NULL,
	"available_balance_after" numeric NOT NULL,
	"hold_balance_after" numeric NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "seller_transactions_transaction_number_unique" UNIQUE("transaction_number")
);
--> statement-breakpoint
CREATE TABLE "seller_verification_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_id" integer,
	"user_id" integer,
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"type" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seller_wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_id" integer NOT NULL,
	"pending_balance" numeric DEFAULT '0' NOT NULL,
	"available_balance" numeric DEFAULT '0' NOT NULL,
	"total_earned" numeric DEFAULT '0' NOT NULL,
	"total_withdrawn" numeric DEFAULT '0' NOT NULL,
	"hold_balance" numeric DEFAULT '0' NOT NULL,
	"min_payout_amount" numeric DEFAULT '100' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "seller_wallets_seller_id_unique" UNIQUE("seller_id")
);
--> statement-breakpoint
CREATE TABLE "agent_workload" (
	"agent_id" integer PRIMARY KEY NOT NULL,
	"active_ticket_count" integer DEFAULT 0 NOT NULL,
	"max_active_tickets" integer DEFAULT 20 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"last_assigned_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"order_id" integer,
	"assigned_agent_id" integer,
	"status" text DEFAULT 'waiting' NOT NULL,
	"converted_to_ticket_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	CONSTRAINT "chat_conversations_conversation_id_unique" UNIQUE("conversation_id")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"sender_type" text NOT NULL,
	"sender_id" integer NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_ticket_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"action_type" text NOT NULL,
	"performed_by" integer,
	"old_value" text,
	"new_value" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"sequence_number" integer NOT NULL,
	"user_id" integer NOT NULL,
	"order_id" integer,
	"product_id" integer,
	"issue_type" text NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"assigned_to" integer,
	"assigned_team" text DEFAULT 'SUPPORT',
	"escalated_from" integer,
	"escalation_reason" text,
	"escalated_at" timestamp,
	"seller_id" integer,
	"sla_deadline" timestamp,
	"sla_breached" boolean DEFAULT false NOT NULL,
	"response_time_minutes" integer,
	"priority_upgraded_at" timestamp,
	"priority_upgrade_reason" text,
	"reopened_at" timestamp,
	"reopen_count" integer DEFAULT 0 NOT NULL,
	"first_response_at" timestamp,
	"resolved_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "support_tickets_ticket_id_unique" UNIQUE("ticket_id"),
	CONSTRAINT "support_tickets_sequence_number_unique" UNIQUE("sequence_number")
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"sender_type" text NOT NULL,
	"sender_id" integer,
	"message" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "title_pos_x" integer DEFAULT 50;--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "title_pos_y" integer DEFAULT 20;--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "subtitle_pos_x" integer DEFAULT 50;--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "subtitle_pos_y" integer DEFAULT 40;--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "cta_pos_x" integer DEFAULT 50;--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "cta_pos_y" integer DEFAULT 60;--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "countdown_pos_x" integer DEFAULT 50;--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "countdown_pos_y" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "title_font_size" integer;--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "subtitle_font_size" integer;--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "font_weight" text DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "overlay_color" text DEFAULT 'black';--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "device_target" text DEFAULT 'all';--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "enable_analytics" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "impression_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "click_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "secondary_cta_label" text;--> statement-breakpoint
ALTER TABLE "hero_campaigns" ADD COLUMN "secondary_cta_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "display_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "internal_order_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "public_order_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "sequence_number" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refund_status" text DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "courier_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "estimated_delivery_date" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivered_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cod_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cod_collected" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cod_collected_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cod_collected_by" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_instructions" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "assigned_courier" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "proof_of_delivery_image" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pod_location" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pod_timestamp" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "is_suspicious_delivery" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "suspicious_reason" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_settled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "settlement_timestamp" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "settled_by" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "warranty" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "material" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "pattern" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "return_policy_days" integer DEFAULT 7;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "country_of_origin" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seller_name" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seller_rating" numeric(2, 1);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "specifications" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "highlights" text[];--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "offers" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "extra_images" text[];--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "moderation_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "moderated_by" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "moderated_at" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "clothing_category" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "fit_type" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "fabric_type" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "care_instructions" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "season_tags" text[];--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "style_tags" text[];--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "model_height" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "model_size_worn" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "dispatch_time" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seo_keywords" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "images" text[];--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "verified_purchase" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "helpful_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_pairs" ADD CONSTRAINT "order_item_pairs_product_id_1_products_id_fk" FOREIGN KEY ("product_id_1") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_pairs" ADD CONSTRAINT "order_item_pairs_product_id_2_products_id_fk" FOREIGN KEY ("product_id_2") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_colors" ADD CONSTRAINT "product_colors_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_sizes" ADD CONSTRAINT "product_sizes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_votes" ADD CONSTRAINT "review_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_presets" ADD CONSTRAINT "shipping_presets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_settings" ADD CONSTRAINT "shipping_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_settings_audit" ADD CONSTRAINT "shipping_settings_audit_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_seller_id_seller_profiles_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_notifications" ADD CONSTRAINT "seller_notifications_seller_id_seller_profiles_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_order_items" ADD CONSTRAINT "seller_order_items_seller_order_id_seller_orders_id_fk" FOREIGN KEY ("seller_order_id") REFERENCES "public"."seller_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_order_items" ADD CONSTRAINT "seller_order_items_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_order_items" ADD CONSTRAINT "seller_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_orders" ADD CONSTRAINT "seller_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_orders" ADD CONSTRAINT "seller_orders_seller_id_seller_profiles_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_orders" ADD CONSTRAINT "seller_orders_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_payouts" ADD CONSTRAINT "seller_payouts_seller_id_seller_profiles_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_payouts" ADD CONSTRAINT "seller_payouts_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_payouts" ADD CONSTRAINT "seller_payouts_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_payouts" ADD CONSTRAINT "seller_payouts_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_return_requests" ADD CONSTRAINT "seller_return_requests_seller_order_id_seller_orders_id_fk" FOREIGN KEY ("seller_order_id") REFERENCES "public"."seller_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_return_requests" ADD CONSTRAINT "seller_return_requests_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_return_requests" ADD CONSTRAINT "seller_return_requests_seller_id_seller_profiles_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_return_requests" ADD CONSTRAINT "seller_return_requests_qc_by_users_id_fk" FOREIGN KEY ("qc_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_return_requests" ADD CONSTRAINT "seller_return_requests_responded_by_users_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_transactions" ADD CONSTRAINT "seller_transactions_seller_id_seller_profiles_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_transactions" ADD CONSTRAINT "seller_transactions_wallet_id_seller_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."seller_wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_verification_tokens" ADD CONSTRAINT "seller_verification_tokens_seller_id_seller_profiles_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_verification_tokens" ADD CONSTRAINT "seller_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_wallets" ADD CONSTRAINT "seller_wallets_seller_id_seller_profiles_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_workload" ADD CONSTRAINT "agent_workload_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_assigned_agent_id_users_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_converted_to_ticket_id_support_tickets_id_fk" FOREIGN KEY ("converted_to_ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_logs" ADD CONSTRAINT "support_ticket_logs_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_logs" ADD CONSTRAINT "support_ticket_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pair_product1_idx" ON "order_item_pairs" USING btree ("product_id_1");--> statement-breakpoint
CREATE INDEX "review_vote_review_idx" ON "review_votes" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "seller_notifications_seller_idx" ON "seller_notifications" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "seller_notifications_read_idx" ON "seller_notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "seller_orders_order_idx" ON "seller_orders" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "seller_orders_seller_idx" ON "seller_orders" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "seller_orders_status_idx" ON "seller_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "seller_orders_payout_status_idx" ON "seller_orders" USING btree ("payout_status");--> statement-breakpoint
CREATE INDEX "seller_payouts_seller_idx" ON "seller_payouts" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "seller_payouts_status_idx" ON "seller_payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "seller_profiles_user_idx" ON "seller_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "seller_profiles_status_idx" ON "seller_profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "seller_returns_order_idx" ON "seller_return_requests" USING btree ("seller_order_id");--> statement-breakpoint
CREATE INDEX "seller_returns_seller_idx" ON "seller_return_requests" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "seller_returns_status_idx" ON "seller_return_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "seller_transactions_seller_idx" ON "seller_transactions" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "seller_transactions_type_idx" ON "seller_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "seller_transactions_created_idx" ON "seller_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "chat_user_idx" ON "chat_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_status_idx" ON "chat_conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "chat_msg_conversation_idx" ON "chat_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "log_ticket_idx" ON "support_ticket_logs" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "log_action_idx" ON "support_ticket_logs" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "ticket_user_idx" ON "support_tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ticket_order_idx" ON "support_tickets" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "ticket_status_idx" ON "support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ticket_assigned_idx" ON "support_tickets" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "message_ticket_idx" ON "ticket_messages" USING btree ("ticket_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cod_collected_by_users_id_fk" FOREIGN KEY ("cod_collected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_assigned_courier_users_id_fk" FOREIGN KEY ("assigned_courier") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_settled_by_users_id_fk" FOREIGN KEY ("settled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_assigned_courier_idx" ON "orders" USING btree ("assigned_courier");--> statement-breakpoint
CREATE INDEX "order_delivery_status_idx" ON "orders" USING btree ("delivery_status");--> statement-breakpoint
CREATE INDEX "product_moderation_idx" ON "products" USING btree ("moderation_status");--> statement-breakpoint
CREATE INDEX "review_product_idx" ON "reviews" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "review_user_idx" ON "reviews" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_internal_order_id_unique" UNIQUE("internal_order_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_public_order_id_unique" UNIQUE("public_order_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_sequence_number_unique" UNIQUE("sequence_number");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_slug_unique" UNIQUE("slug");