import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users, payments, orders, orderItems, refunds } from "./schema";

// === WEBHOOK EVENTS ===
// Store for replay protection and event deduplication
export const webhookEvents = pgTable("webhook_events", {
    id: serial("id").primaryKey(),
    eventId: text("event_id").notNull().unique(), // Gateway's event ID
    eventType: text("event_type").notNull(),
    gateway: text("gateway", { enum: ["razorpay", "stripe"] }).notNull(),
    payload: jsonb("payload").notNull(),
    signature: text("signature").notNull(),

    // Processing status
    status: text("status", {
        enum: ["RECEIVED", "PROCESSING", "PROCESSED", "FAILED", "DUPLICATE"]
    }).default("RECEIVED").notNull(),
    processedAt: timestamp("processed_at"),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0).notNull(),

    createdAt: timestamp("created_at").defaultNow(),
});

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({ id: true, createdAt: true });

// === IDEMPOTENCY KEYS ===
// Prevent duplicate API requests
export const idempotencyKeys = pgTable("idempotency_keys", {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(),
    userId: integer("user_id").references(() => users.id),
    endpoint: text("endpoint").notNull(),
    requestHash: text("request_hash").notNull(), // Hash of request body
    response: jsonb("response"), // Cached response
    statusCode: integer("status_code"),
    expiresAt: timestamp("expires_at").notNull(), // 24h TTL
    createdAt: timestamp("created_at").defaultNow(),
});

export const insertIdempotencyKeySchema = createInsertSchema(idempotencyKeys).omit({ id: true, createdAt: true });

// === PAYMENT RECONCILIATION ===
// Daily reconciliation records
export const paymentReconciliation = pgTable("payment_reconciliation", {
    id: serial("id").primaryKey(),
    paymentId: integer("payment_id").references(() => payments.id),
    gatewayPaymentId: text("gateway_payment_id").notNull(),
    expectedAmount: decimal("expected_amount").notNull(),
    actualAmount: decimal("actual_amount").notNull(),
    currency: text("currency").notNull(),

    status: text("status", {
        enum: ["MATCHED", "AMOUNT_MISMATCH", "MISSING_IN_DB", "MISSING_IN_GATEWAY", "DUPLICATE", "MANUAL_OVERRIDE"]
    }).notNull(),

    resolvedAt: timestamp("resolved_at"),
    resolvedBy: integer("resolved_by").references(() => users.id), // Admin who resolved
    adminNote: text("admin_note"),

    createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentReconciliationSchema = createInsertSchema(paymentReconciliation).omit({ id: true, createdAt: true });

// === REFUND TRACKING ===
// Enhanced refund tracking with gateway references
export const refundTracking = pgTable("refund_tracking", {
    id: serial("id").primaryKey(),
    refundId: integer("refund_id").references(() => refunds.id).notNull(),
    gatewayRefundId: text("gateway_refund_id"), // Gateway's refund ID
    gateway: text("gateway", { enum: ["razorpay", "stripe"] }),

    refundState: text("refund_state", {
        enum: ["INITIATED", "PENDING", "PROCESSING", "SUCCESS", "FAILED", "CANCELLED"]
    }).default("INITIATED").notNull(),

    // Settlement tracking
    settlementStatus: text("settlement_status", {
        enum: ["PENDING", "IN_TRANSIT", "SETTLED", "FAILED"]
    }).default("PENDING"),

    estimatedSettlementDate: timestamp("estimated_settlement_date"),
    actualSettlementDate: timestamp("actual_settlement_date"),

    // Error tracking
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0).notNull(),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRefundTrackingSchema = createInsertSchema(refundTracking).omit({ id: true, createdAt: true, updatedAt: true });

// === PAYMENT STATE TRANSITIONS ===
// Audit log for state machine transitions
export const paymentStateTransitions = pgTable("payment_state_transitions", {
    id: serial("id").primaryKey(),
    paymentId: integer("payment_id").references(() => payments.id).notNull(),
    fromState: text("from_state").notNull(),
    toState: text("to_state").notNull(),
    triggeredBy: text("triggered_by").notNull(), // "webhook" | "manual" | "api" | "cron"
    metadata: jsonb("metadata"), // Additional context
    createdAt: timestamp("created_at").defaultNow(),
});

// === ORDER STATE TRANSITIONS ===
export const orderStateTransitions = pgTable("order_state_transitions", {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").references(() => orders.id).notNull(),
    fromState: text("from_state").notNull(),
    toState: text("to_state").notNull(),
    triggeredBy: text("triggered_by").notNull(),
    userId: integer("user_id").references(() => users.id), // Who triggered the transition
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
});

// === TYPES ===
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;

export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
export type InsertIdempotencyKey = z.infer<typeof insertIdempotencyKeySchema>;

export type PaymentReconciliation = typeof paymentReconciliation.$inferSelect;
export type InsertPaymentReconciliation = z.infer<typeof insertPaymentReconciliationSchema>;

export type RefundTracking = typeof refundTracking.$inferSelect;
export type InsertRefundTracking = z.infer<typeof insertRefundTrackingSchema>;

export type PaymentStateTransition = typeof paymentStateTransitions.$inferSelect;
export type OrderStateTransition = typeof orderStateTransitions.$inferSelect;
