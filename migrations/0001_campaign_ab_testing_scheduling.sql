CREATE TABLE "campaign_personalization" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"geo_targets" text[],
	"min_cart_value" numeric,
	"max_cart_value" numeric,
	"device_targets" text[],
	"user_segments" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaign_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"reviewer_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"review_notes" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaign_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"activate_at" timestamp NOT NULL,
	"deactivate_at" timestamp,
	"recurrence_type" text DEFAULT 'none' NOT NULL,
	"recurrence_end_date" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_processed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaign_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"variant_name" text NOT NULL,
	"traffic_percentage" integer DEFAULT 50 NOT NULL,
	"title" text,
	"subtitle" text,
	"cta_label" text,
	"cta_url" text,
	"media_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "variant_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"variant_id" integer NOT NULL,
	"campaign_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"session_id" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_id" integer NOT NULL,
	"action" text NOT NULL,
	"domain" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by" integer,
	"rejection_reason" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"action" text NOT NULL,
	"resource" text,
	"description" text,
	"constraint_key" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rbac_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" integer,
	"actor_role" text,
	"action" text NOT NULL,
	"domain" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"old_value" jsonb,
	"new_value" jsonb,
	"metadata" jsonb,
	"approval_id" integer,
	"status" text DEFAULT 'success' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"constraint_value" text,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"approval_role_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"hierarchy_level" integer DEFAULT 100 NOT NULL,
	"scope_type" text DEFAULT 'global' NOT NULL,
	"is_system_role" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"scope_type" text DEFAULT 'global' NOT NULL,
	"scope_value" text,
	"granted_by" integer,
	"granted_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"user_id" integer,
	"endpoint" text NOT NULL,
	"request_hash" text NOT NULL,
	"response" jsonb,
	"status_code" integer,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "idempotency_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "order_state_transitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"from_state" text NOT NULL,
	"to_state" text NOT NULL,
	"triggered_by" text NOT NULL,
	"user_id" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_reconciliation" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer,
	"gateway_payment_id" text NOT NULL,
	"expected_amount" numeric NOT NULL,
	"actual_amount" numeric NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" integer,
	"admin_note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_state_transitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer NOT NULL,
	"from_state" text NOT NULL,
	"to_state" text NOT NULL,
	"triggered_by" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "refund_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"refund_id" integer NOT NULL,
	"gateway_refund_id" text,
	"gateway" text,
	"refund_state" text DEFAULT 'INITIATED' NOT NULL,
	"settlement_status" text DEFAULT 'PENDING',
	"estimated_settlement_date" timestamp,
	"actual_settlement_date" timestamp,
	"error_code" text,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"gateway" text NOT NULL,
	"payload" jsonb NOT NULL,
	"signature" text NOT NULL,
	"status" text DEFAULT 'RECEIVED' NOT NULL,
	"processed_at" timestamp,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "webhook_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_state" text DEFAULT 'CREATED' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "state_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "state_history" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_idempotency_key" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payment_state" text DEFAULT 'CREATED' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "state_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "state_history" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "gateway_reference" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "gateway" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "last_attempt_at" timestamp;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "reconciled_at" timestamp;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "reconciled_by" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "settlement_status" text;--> statement-breakpoint
ALTER TABLE "campaign_personalization" ADD CONSTRAINT "campaign_personalization_campaign_id_hero_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."hero_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_reviews" ADD CONSTRAINT "campaign_reviews_campaign_id_hero_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."hero_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_reviews" ADD CONSTRAINT "campaign_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_schedules" ADD CONSTRAINT "campaign_schedules_campaign_id_hero_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."hero_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_variants" ADD CONSTRAINT "campaign_variants_campaign_id_hero_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."hero_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_analytics" ADD CONSTRAINT "variant_analytics_variant_id_campaign_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."campaign_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_analytics" ADD CONSTRAINT "variant_analytics_campaign_id_hero_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."hero_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rbac_audit_logs" ADD CONSTRAINT "rbac_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_approval_role_id_roles_id_fk" FOREIGN KEY ("approval_role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_state_transitions" ADD CONSTRAINT "order_state_transitions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_state_transitions" ADD CONSTRAINT "order_state_transitions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reconciliation" ADD CONSTRAINT "payment_reconciliation_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reconciliation" ADD CONSTRAINT "payment_reconciliation_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_state_transitions" ADD CONSTRAINT "payment_state_transitions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_tracking" ADD CONSTRAINT "refund_tracking_refund_id_refunds_id_fk" FOREIGN KEY ("refund_id") REFERENCES "public"."refunds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_order_idempotency_key_unique" UNIQUE("order_idempotency_key");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key");