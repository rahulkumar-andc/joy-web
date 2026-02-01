import { pgTable, serial, text, integer, decimal, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users } from "./schema";
import { products } from "./schema";
import { orders } from "./schema";

// === RESELLERS ===
export const resellers = pgTable("resellers", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull().unique(),
    resellerCode: text("reseller_code").notNull().unique(), // "RES_ABC123"

    // Status & Tier
    status: text("status", { enum: ["pending", "active", "suspended", "rejected"] }).default("pending").notNull(),
    tier: text("tier", { enum: ["bronze", "silver", "gold", "platinum"] }).default("bronze").notNull(),

    // Earnings Summary
    totalEarnings: decimal("total_earnings").default("0").notNull(),
    pendingPayout: decimal("pending_payout").default("0").notNull(),
    lifetimeSales: integer("lifetime_sales").default(0).notNull(),
    lifetimeOrders: integer("lifetime_orders").default(0).notNull(),

    // Payout Details
    bankAccountNumber: text("bank_account_number"),
    bankIfscCode: text("bank_ifsc_code"),
    bankAccountName: text("bank_account_name"),
    upiId: text("upi_id"),
    preferredPayoutMethod: text("preferred_payout_method", { enum: ["bank", "upi"] }).default("upi"),

    // Risk & Fraud
    riskScore: integer("risk_score").default(0).notNull(),
    isFlagged: boolean("is_flagged").default(false).notNull(),
    flagReason: text("flag_reason"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    approvedAt: timestamp("approved_at"),
    suspendedAt: timestamp("suspended_at"),
});

export const insertResellerSchema = createInsertSchema(resellers).omit({
    id: true,
    createdAt: true,
    approvedAt: true,
    suspendedAt: true,
    totalEarnings: true,
    pendingPayout: true,
    lifetimeSales: true,
    lifetimeOrders: true,
    riskScore: true,
    isFlagged: true,
    flagReason: true,
});

// === RESELLER LINKS ===
export const resellerLinks = pgTable("reseller_links", {
    id: serial("id").primaryKey(),
    resellerId: integer("reseller_id").references(() => resellers.id).notNull(),
    productId: integer("product_id").references(() => products.id).notNull(),

    // Link Details
    shortCode: text("short_code").notNull().unique(), // "abc123" for /r/abc123
    customTitle: text("custom_title"), // Optional custom product title

    // Margin (reseller's added markup)
    marginType: text("margin_type", { enum: ["percentage", "fixed"] }).default("percentage").notNull(),
    marginValue: decimal("margin_value").default("0").notNull(), // 5% or ₹50

    // Analytics
    clicks: integer("clicks").default(0).notNull(),
    conversions: integer("conversions").default(0).notNull(),
    totalRevenue: decimal("total_revenue").default("0").notNull(),

    // Status
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    lastClickAt: timestamp("last_click_at"),
}, (table) => ({
    uniqueResellerProduct: unique().on(table.resellerId, table.productId),
}));

export const insertResellerLinkSchema = createInsertSchema(resellerLinks).omit({
    id: true,
    createdAt: true,
    clicks: true,
    conversions: true,
    totalRevenue: true,
    lastClickAt: true,
});

// === RESELLER COMMISSIONS ===
export const resellerCommissions = pgTable("reseller_commissions", {
    id: serial("id").primaryKey(),
    resellerId: integer("reseller_id").references(() => resellers.id).notNull(),
    orderId: integer("order_id").references(() => orders.id).notNull(),
    linkId: integer("link_id").references(() => resellerLinks.id),

    // Order Details
    orderAmount: decimal("order_amount").notNull(), // Original order amount

    // Commission Breakdown
    baseCommissionRate: decimal("base_commission_rate").notNull(), // Platform rate (5-12%)
    baseCommissionAmount: decimal("base_commission_amount").notNull(),
    marginEarnings: decimal("margin_earnings").default("0").notNull(), // From reseller's margin
    totalAmount: decimal("total_amount").notNull(), // Total earnings

    // Status
    status: text("status", { enum: ["pending", "confirmed", "cancelled", "refunded", "paid"] }).default("pending").notNull(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    confirmedAt: timestamp("confirmed_at"), // After delivery/return period
    paidAt: timestamp("paid_at"),

    // Notes
    cancellationReason: text("cancellation_reason"),
});

export const insertResellerCommissionSchema = createInsertSchema(resellerCommissions).omit({
    id: true,
    createdAt: true,
    confirmedAt: true,
    paidAt: true,
});

// === RESELLER PAYOUTS ===
export const resellerPayouts = pgTable("reseller_payouts", {
    id: serial("id").primaryKey(),
    resellerId: integer("reseller_id").references(() => resellers.id).notNull(),

    // Payout Details
    amount: decimal("amount").notNull(),
    payoutMethod: text("payout_method", { enum: ["bank", "upi"] }).notNull(),

    // Bank/UPI Details (snapshot at time of payout)
    bankAccountNumber: text("bank_account_number"),
    bankIfscCode: text("bank_ifsc_code"),
    upiId: text("upi_id"),

    // Status
    status: text("status", { enum: ["pending", "processing", "completed", "failed", "cancelled"] }).default("pending").notNull(),

    // Transaction
    transactionId: text("transaction_id"), // Gateway reference
    gateway: text("gateway"), // razorpay_payout, manual
    failureReason: text("failure_reason"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    processedAt: timestamp("processed_at"),
    completedAt: timestamp("completed_at"),
});

export const insertResellerPayoutSchema = createInsertSchema(resellerPayouts).omit({
    id: true,
    createdAt: true,
    processedAt: true,
    completedAt: true,
    transactionId: true,
    failureReason: true,
});

// === RESELLER CLICK TRACKING (for fraud detection) ===
export const resellerClicks = pgTable("reseller_clicks", {
    id: serial("id").primaryKey(),
    linkId: integer("link_id").references(() => resellerLinks.id).notNull(),

    // Tracking Data
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    deviceFingerprint: text("device_fingerprint"),
    referrer: text("referrer"),

    // Conversion
    convertedToOrder: boolean("converted_to_order").default(false),
    orderId: integer("order_id").references(() => orders.id),

    // Timestamp
    clickedAt: timestamp("clicked_at").defaultNow(),
});

export const insertResellerClickSchema = createInsertSchema(resellerClicks).omit({
    id: true,
    clickedAt: true,
    convertedToOrder: true,
    orderId: true,
});

// === RELATIONS ===
export const resellersRelations = relations(resellers, ({ one, many }) => ({
    user: one(users, {
        fields: [resellers.userId],
        references: [users.id],
    }),
    links: many(resellerLinks),
    commissions: many(resellerCommissions),
    payouts: many(resellerPayouts),
}));

export const resellerLinksRelations = relations(resellerLinks, ({ one, many }) => ({
    reseller: one(resellers, {
        fields: [resellerLinks.resellerId],
        references: [resellers.id],
    }),
    product: one(products, {
        fields: [resellerLinks.productId],
        references: [products.id],
    }),
    commissions: many(resellerCommissions),
    clicks: many(resellerClicks),
}));

export const resellerCommissionsRelations = relations(resellerCommissions, ({ one }) => ({
    reseller: one(resellers, {
        fields: [resellerCommissions.resellerId],
        references: [resellers.id],
    }),
    order: one(orders, {
        fields: [resellerCommissions.orderId],
        references: [orders.id],
    }),
    link: one(resellerLinks, {
        fields: [resellerCommissions.linkId],
        references: [resellerLinks.id],
    }),
}));

export const resellerPayoutsRelations = relations(resellerPayouts, ({ one }) => ({
    reseller: one(resellers, {
        fields: [resellerPayouts.resellerId],
        references: [resellers.id],
    }),
}));

export const resellerClicksRelations = relations(resellerClicks, ({ one }) => ({
    link: one(resellerLinks, {
        fields: [resellerClicks.linkId],
        references: [resellerLinks.id],
    }),
    order: one(orders, {
        fields: [resellerClicks.orderId],
        references: [orders.id],
    }),
}));

// === TYPES ===
export type Reseller = typeof resellers.$inferSelect;
export type InsertReseller = z.infer<typeof insertResellerSchema>;
export type ResellerLink = typeof resellerLinks.$inferSelect;
export type InsertResellerLink = z.infer<typeof insertResellerLinkSchema>;
export type ResellerCommission = typeof resellerCommissions.$inferSelect;
export type InsertResellerCommission = z.infer<typeof insertResellerCommissionSchema>;
export type ResellerPayout = typeof resellerPayouts.$inferSelect;
export type InsertResellerPayout = z.infer<typeof insertResellerPayoutSchema>;
export type ResellerClick = typeof resellerClicks.$inferSelect;
export type InsertResellerClick = z.infer<typeof insertResellerClickSchema>;

// === ZOD SCHEMAS FOR API ===
export const createResellerSchema = z.object({
    upiId: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    bankIfscCode: z.string().optional(),
    bankAccountName: z.string().optional(),
    preferredPayoutMethod: z.enum(["bank", "upi"]).default("upi"),
});

export const createResellerLinkSchema = z.object({
    productId: z.number().int().positive(),
    customTitle: z.string().optional(),
    marginType: z.enum(["percentage", "fixed"]).default("percentage"),
    marginValue: z.string().default("0"), // Decimal as string
});

export const updateBankDetailsSchema = z.object({
    bankAccountNumber: z.string().min(9).max(18),
    bankIfscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),
    bankAccountName: z.string().min(3).max(100),
});

export const updateUpiSchema = z.object({
    upiId: z.string().regex(/^[\w.-]+@[\w]+$/, "Invalid UPI ID"),
});

export const requestPayoutSchema = z.object({
    amount: z.number().positive().min(100, "Minimum payout is ₹100"),
    payoutMethod: z.enum(["bank", "upi"]),
});

// === COMMISSION TIER CONFIG ===
export const RESELLER_TIERS = {
    bronze: { minOrders: 0, baseRate: 0.05, bonus: 0 },
    silver: { minOrders: 50, baseRate: 0.07, bonus: 0.01 },
    gold: { minOrders: 200, baseRate: 0.10, bonus: 0.02 },
    platinum: { minOrders: 500, baseRate: 0.12, bonus: 0.03 },
} as const;

export type ResellerTier = keyof typeof RESELLER_TIERS;
