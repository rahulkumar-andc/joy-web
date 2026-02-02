import { pgTable, serial, text, integer, decimal, boolean, timestamp, jsonb, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users, orders, orderItems, products, categories } from "./schema";

// ============================================================================
// SELLER MARKETPLACE SCHEMA
// Complete multi-vendor e-commerce platform support
// ============================================================================

// === SELLER PROFILES ===
export const sellerProfiles = pgTable("seller_profiles", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull().unique(),

    // Business Information
    shopName: text("shop_name").notNull(),
    businessType: text("business_type", { enum: ["individual", "company", "partnership"] }).notNull(),
    description: text("description"),
    logoUrl: text("logo_url"),
    bannerUrl: text("banner_url"),

    // Contact Information
    businessEmail: text("business_email").notNull(),
    businessPhone: text("business_phone").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    phoneVerified: boolean("phone_verified").default(false).notNull(),

    // KYC Information
    gstNumber: text("gst_number"), // Optional - toggle
    gstVerified: boolean("gst_verified").default(false),
    hasGst: boolean("has_gst").default(false), // Toggle for GST requirement
    panNumber: text("pan_number").notNull(),
    panVerified: boolean("pan_verified").default(false),

    // Bank Details
    bankAccountNumber: text("bank_account_number").notNull(),
    bankIfscCode: text("bank_ifsc_code").notNull(),
    bankAccountName: text("bank_account_name").notNull(),
    bankName: text("bank_name"),
    bankVerified: boolean("bank_verified").default(false),

    // Pickup Address
    pickupAddressLine1: text("pickup_address_line1").notNull(),
    pickupAddressLine2: text("pickup_address_line2"),
    pickupCity: text("pickup_city").notNull(),
    pickupState: text("pickup_state").notNull(),
    pickupPincode: text("pickup_pincode").notNull(),
    pickupPhone: text("pickup_phone").notNull(),
    pickupLandmark: text("pickup_landmark"),

    // Status & Approval
    status: text("status", {
        enum: ["pending", "approved", "rejected", "suspended", "blacklisted"]
    }).default("pending").notNull(),
    statusReason: text("status_reason"),
    approvedBy: integer("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at"),
    suspendedAt: timestamp("suspended_at"),

    // Performance Metrics
    rating: decimal("rating").default("0"),
    totalRatings: integer("total_ratings").default(0),
    totalOrders: integer("total_orders").default(0),
    totalProducts: integer("total_products").default(0),
    completionRate: decimal("completion_rate").default("100"), // Order completion %
    responseTime: integer("response_time"), // Avg response time in hours

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
    userIdIdx: index("seller_profiles_user_idx").on(table.userId),
    statusIdx: index("seller_profiles_status_idx").on(table.status),
}));

// === SELLER WALLETS ===
export const sellerWallets = pgTable("seller_wallets", {
    id: serial("id").primaryKey(),
    sellerId: integer("seller_id").references(() => sellerProfiles.id).notNull().unique(),

    // Balance Breakdown
    pendingBalance: decimal("pending_balance").default("0").notNull(), // Awaiting delivery confirmation
    availableBalance: decimal("available_balance").default("0").notNull(), // Ready for payout
    totalEarned: decimal("total_earned").default("0").notNull(), // Lifetime earnings
    totalWithdrawn: decimal("total_withdrawn").default("0").notNull(), // Total payouts
    holdBalance: decimal("hold_balance").default("0").notNull(), // Held for disputes

    // Minimum payout threshold
    minPayoutAmount: decimal("min_payout_amount").default("100").notNull(),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// === SELLER ORDERS (Split from main order) ===
export const sellerOrders = pgTable("seller_orders", {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").references(() => orders.id).notNull(),
    sellerId: integer("seller_id").references(() => sellerProfiles.id).notNull(),

    // Order Reference
    sellerOrderNumber: text("seller_order_number").notNull().unique(), // SO-001-SELLER1

    // Sub-totals for this seller
    subtotal: decimal("subtotal").notNull(),
    shippingCost: decimal("shipping_cost").default("0"),
    discount: decimal("discount").default("0"),
    platformFee: decimal("platform_fee").notNull(), // Commission
    platformFeePercentage: decimal("platform_fee_percentage").notNull(), // For transparency
    sellerEarnings: decimal("seller_earnings").notNull(), // After commission

    // Independent Status
    status: text("status", {
        enum: ["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled", "return_requested", "returned"]
    }).default("pending").notNull(),

    // Cancellation
    cancelledAt: timestamp("cancelled_at"),
    cancelledBy: integer("cancelled_by").references(() => users.id),
    cancellationReason: text("cancellation_reason"),

    // Tracking
    trackingNumber: text("tracking_number"),
    shippingProvider: text("shipping_provider"),
    shippingLabel: text("shipping_label"), // URL to shipping label
    estimatedDelivery: timestamp("estimated_delivery"),
    shippedAt: timestamp("shipped_at"),
    deliveredAt: timestamp("delivered_at"),

    // Payout tracking
    payoutEligibleAt: timestamp("payout_eligible_at"), // delivery + hold period
    payoutStatus: text("payout_status", {
        enum: ["pending", "eligible", "processing", "completed"]
    }).default("pending"),

    // State Machine
    stateHistory: jsonb("state_history").default([]),
    stateVersion: integer("state_version").default(1),

    // Customer Notes
    customerNote: text("customer_note"),
    sellerNote: text("seller_note"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
    orderIdIdx: index("seller_orders_order_idx").on(table.orderId),
    sellerIdIdx: index("seller_orders_seller_idx").on(table.sellerId),
    statusIdx: index("seller_orders_status_idx").on(table.status),
    payoutStatusIdx: index("seller_orders_payout_status_idx").on(table.payoutStatus),
}));

// === SELLER ORDER ITEMS ===
export const sellerOrderItems = pgTable("seller_order_items", {
    id: serial("id").primaryKey(),
    sellerOrderId: integer("seller_order_id").references(() => sellerOrders.id).notNull(),
    orderItemId: integer("order_item_id").references(() => orderItems.id).notNull(),
    productId: integer("product_id").references(() => products.id).notNull(),

    // Item details (snapshot)
    productName: text("product_name").notNull(),
    productSku: text("product_sku"),
    quantity: integer("quantity").notNull(),
    unitPrice: decimal("unit_price").notNull(),
    totalPrice: decimal("total_price").notNull(),
    size: text("size"),
    color: text("color"),

    // Return tracking per item
    returnStatus: text("return_status", {
        enum: ["none", "requested", "approved", "rejected", "picked", "received", "refunded"]
    }).default("none"),
    returnQuantity: integer("return_quantity").default(0),
});

// === SELLER PAYOUTS ===
export const sellerPayouts = pgTable("seller_payouts", {
    id: serial("id").primaryKey(),
    sellerId: integer("seller_id").references(() => sellerProfiles.id).notNull(),
    payoutNumber: text("payout_number").notNull().unique(), // PO-001

    amount: decimal("amount").notNull(),

    // Status
    status: text("status", {
        enum: ["requested", "pending_approval", "approved", "processing", "completed", "failed", "cancelled"]
    }).default("requested").notNull(),

    // Bank Details (snapshot at time of payout)
    bankAccountNumber: text("bank_account_number").notNull(),
    bankIfscCode: text("bank_ifsc_code").notNull(),
    bankAccountName: text("bank_account_name").notNull(),

    // Transaction details
    transactionId: text("transaction_id"),
    utrNumber: text("utr_number"), // Unique Transaction Reference
    gateway: text("gateway"), // razorpay_payout, manual, bank_transfer
    failureReason: text("failure_reason"),
    retryCount: integer("retry_count").default(0),

    // Admin actions
    requestedBy: integer("requested_by").references(() => users.id),
    approvedBy: integer("approved_by").references(() => users.id),
    processedBy: integer("processed_by").references(() => users.id),
    approvalNote: text("approval_note"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    approvedAt: timestamp("approved_at"),
    processedAt: timestamp("processed_at"),
    completedAt: timestamp("completed_at"),
}, (table) => ({
    sellerIdIdx: index("seller_payouts_seller_idx").on(table.sellerId),
    statusIdx: index("seller_payouts_status_idx").on(table.status),
}));

// === SELLER TRANSACTIONS (Ledger) ===
export const sellerTransactions = pgTable("seller_transactions", {
    id: serial("id").primaryKey(),
    sellerId: integer("seller_id").references(() => sellerProfiles.id).notNull(),
    walletId: integer("wallet_id").references(() => sellerWallets.id).notNull(),
    transactionNumber: text("transaction_number").notNull().unique(), // TXN-001

    // Transaction Details
    type: text("type", {
        enum: ["order_credit", "commission_debit", "payout", "payout_reversal", "refund_debit", "adjustment_credit", "adjustment_debit", "hold", "release"]
    }).notNull(),
    amount: decimal("amount").notNull(), // Positive for credit, negative for debit

    // References
    referenceType: text("reference_type"), // seller_order, payout, return_request
    referenceId: integer("reference_id"),

    // Balance snapshot after transaction
    pendingBalanceAfter: decimal("pending_balance_after").notNull(),
    availableBalanceAfter: decimal("available_balance_after").notNull(),
    holdBalanceAfter: decimal("hold_balance_after").notNull(),

    description: text("description"),
    metadata: jsonb("metadata"), // Additional transaction details

    createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
    sellerIdIdx: index("seller_transactions_seller_idx").on(table.sellerId),
    typeIdx: index("seller_transactions_type_idx").on(table.type),
    createdAtIdx: index("seller_transactions_created_idx").on(table.createdAt),
}));

// === COMMISSION RULES ===
export const commissionRules = pgTable("commission_rules", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),

    // Targeting (null = applies to all in that dimension)
    categoryId: integer("category_id").references(() => categories.id),
    sellerId: integer("seller_id").references(() => sellerProfiles.id),

    // Commission
    commissionType: text("commission_type", { enum: ["percentage", "fixed"] }).default("percentage").notNull(),
    commissionValue: decimal("commission_value").notNull(),

    // Minimum commission (for percentage type)
    minCommission: decimal("min_commission"),
    maxCommission: decimal("max_commission"),

    // Priority (higher = applied first when multiple rules match)
    priority: integer("priority").default(0),

    // Validity
    isActive: boolean("is_active").default(true),
    validFrom: timestamp("valid_from"),
    validUntil: timestamp("valid_until"),

    // Audit
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// === SELLER RETURN REQUESTS ===
export const sellerReturnRequests = pgTable("seller_return_requests", {
    id: serial("id").primaryKey(),
    returnNumber: text("return_number").notNull().unique(), // RET-001
    sellerOrderId: integer("seller_order_id").references(() => sellerOrders.id).notNull(),
    customerId: integer("customer_id").references(() => users.id).notNull(),
    sellerId: integer("seller_id").references(() => sellerProfiles.id).notNull(),

    // Return Details
    reason: text("reason", {
        enum: ["damaged", "wrong_item", "not_as_described", "defective", "size_fit", "quality", "other"]
    }).notNull(),
    description: text("description"),
    images: text("images").array(),

    // Items being returned
    returnItems: jsonb("return_items").notNull(), // [{sellerOrderItemId, quantity, reason}]

    // Status
    status: text("status", {
        enum: [
            "requested",
            "seller_approved",
            "seller_rejected",
            "admin_review",
            "pickup_scheduled",
            "pickup_failed",
            "picked",
            "in_transit",
            "received",
            "quality_check",
            "qc_passed",
            "qc_failed",
            "refund_approved",
            "refund_rejected",
            "refund_processing",
            "refunded",
            "closed"
        ]
    }).default("requested").notNull(),

    // Amounts
    requestedRefundAmount: decimal("requested_refund_amount").notNull(),
    approvedRefundAmount: decimal("approved_refund_amount"),
    refundMethod: text("refund_method", { enum: ["original_payment", "wallet", "bank"] }),

    // Pickup details
    pickupAddress: jsonb("pickup_address"),
    pickupScheduledAt: timestamp("pickup_scheduled_at"),
    pickupAttempts: integer("pickup_attempts").default(0),
    pickupAgentName: text("pickup_agent_name"),
    pickupAgentPhone: text("pickup_agent_phone"),

    // Quality check
    qcResult: text("qc_result", { enum: ["pass", "fail", "partial"] }),
    qcNotes: text("qc_notes"),
    qcImages: text("qc_images").array(),
    qcBy: integer("qc_by").references(() => users.id),

    // Actions
    sellerResponse: text("seller_response"),
    sellerRespondedAt: timestamp("seller_responded_at"),
    adminNote: text("admin_note"),
    respondedBy: integer("responded_by").references(() => users.id),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    refundedAt: timestamp("refunded_at"),
    closedAt: timestamp("closed_at"),
}, (table) => ({
    sellerOrderIdIdx: index("seller_returns_order_idx").on(table.sellerOrderId),
    sellerIdIdx: index("seller_returns_seller_idx").on(table.sellerId),
    statusIdx: index("seller_returns_status_idx").on(table.status),
}));

// === SELLER VERIFICATION TOKENS ===
export const sellerVerificationTokens = pgTable("seller_verification_tokens", {
    id: serial("id").primaryKey(),
    sellerId: integer("seller_id").references(() => sellerProfiles.id),
    userId: integer("user_id").references(() => users.id),
    identifier: text("identifier").notNull(), // Email or phone
    token: text("token").notNull(), // Hashed OTP
    type: text("type", { enum: ["email", "phone"] }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    verified: boolean("verified").default(false),
    createdAt: timestamp("created_at").defaultNow(),
});

// === SELLER NOTIFICATIONS ===
export const sellerNotifications = pgTable("seller_notifications", {
    id: serial("id").primaryKey(),
    sellerId: integer("seller_id").references(() => sellerProfiles.id).notNull(),

    type: text("type", {
        enum: ["order_new", "order_cancelled", "return_request", "payout_completed", "payout_failed", "account_approved", "account_suspended", "product_approved", "product_rejected", "low_stock", "system"]
    }).notNull(),

    title: text("title").notNull(),
    message: text("message").notNull(),
    data: jsonb("data"), // Additional data like orderId, productId, etc.

    isRead: boolean("is_read").default(false),
    readAt: timestamp("read_at"),

    createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
    sellerIdIdx: index("seller_notifications_seller_idx").on(table.sellerId),
    isReadIdx: index("seller_notifications_read_idx").on(table.isRead),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const sellerProfilesRelations = relations(sellerProfiles, ({ one, many }) => ({
    user: one(users, {
        fields: [sellerProfiles.userId],
        references: [users.id],
    }),
    approver: one(users, {
        fields: [sellerProfiles.approvedBy],
        references: [users.id],
    }),
    wallet: one(sellerWallets),
    orders: many(sellerOrders),
    payouts: many(sellerPayouts),
    transactions: many(sellerTransactions),
    returnRequests: many(sellerReturnRequests),
    notifications: many(sellerNotifications),
}));

export const sellerWalletsRelations = relations(sellerWallets, ({ one, many }) => ({
    seller: one(sellerProfiles, {
        fields: [sellerWallets.sellerId],
        references: [sellerProfiles.id],
    }),
    transactions: many(sellerTransactions),
}));

export const sellerOrdersRelations = relations(sellerOrders, ({ one, many }) => ({
    order: one(orders, {
        fields: [sellerOrders.orderId],
        references: [orders.id],
    }),
    seller: one(sellerProfiles, {
        fields: [sellerOrders.sellerId],
        references: [sellerProfiles.id],
    }),
    items: many(sellerOrderItems),
    returnRequests: many(sellerReturnRequests),
}));

export const sellerOrderItemsRelations = relations(sellerOrderItems, ({ one }) => ({
    sellerOrder: one(sellerOrders, {
        fields: [sellerOrderItems.sellerOrderId],
        references: [sellerOrders.id],
    }),
    orderItem: one(orderItems, {
        fields: [sellerOrderItems.orderItemId],
        references: [orderItems.id],
    }),
    product: one(products, {
        fields: [sellerOrderItems.productId],
        references: [products.id],
    }),
}));

export const sellerPayoutsRelations = relations(sellerPayouts, ({ one }) => ({
    seller: one(sellerProfiles, {
        fields: [sellerPayouts.sellerId],
        references: [sellerProfiles.id],
    }),
    requester: one(users, {
        fields: [sellerPayouts.requestedBy],
        references: [users.id],
    }),
    approver: one(users, {
        fields: [sellerPayouts.approvedBy],
        references: [users.id],
    }),
    processor: one(users, {
        fields: [sellerPayouts.processedBy],
        references: [users.id],
    }),
}));

export const sellerTransactionsRelations = relations(sellerTransactions, ({ one }) => ({
    seller: one(sellerProfiles, {
        fields: [sellerTransactions.sellerId],
        references: [sellerProfiles.id],
    }),
    wallet: one(sellerWallets, {
        fields: [sellerTransactions.walletId],
        references: [sellerWallets.id],
    }),
}));

export const commissionRulesRelations = relations(commissionRules, ({ one }) => ({
    category: one(categories, {
        fields: [commissionRules.categoryId],
        references: [categories.id],
    }),
    seller: one(sellerProfiles, {
        fields: [commissionRules.sellerId],
        references: [sellerProfiles.id],
    }),
    createdByUser: one(users, {
        fields: [commissionRules.createdBy],
        references: [users.id],
    }),
}));

export const sellerReturnRequestsRelations = relations(sellerReturnRequests, ({ one }) => ({
    sellerOrder: one(sellerOrders, {
        fields: [sellerReturnRequests.sellerOrderId],
        references: [sellerOrders.id],
    }),
    customer: one(users, {
        fields: [sellerReturnRequests.customerId],
        references: [users.id],
    }),
    seller: one(sellerProfiles, {
        fields: [sellerReturnRequests.sellerId],
        references: [sellerProfiles.id],
    }),
    responder: one(users, {
        fields: [sellerReturnRequests.respondedBy],
        references: [users.id],
    }),
    qcPerson: one(users, {
        fields: [sellerReturnRequests.qcBy],
        references: [users.id],
    }),
}));

export const sellerNotificationsRelations = relations(sellerNotifications, ({ one }) => ({
    seller: one(sellerProfiles, {
        fields: [sellerNotifications.sellerId],
        references: [sellerProfiles.id],
    }),
}));

// ============================================================================
// INSERT SCHEMAS
// ============================================================================

export const insertSellerProfileSchema = createInsertSchema(sellerProfiles).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    approvedAt: true,
    suspendedAt: true,
    status: true,
    statusReason: true,
    approvedBy: true,
    rating: true,
    totalRatings: true,
    totalOrders: true,
    totalProducts: true,
    completionRate: true,
    responseTime: true,
    emailVerified: true,
    phoneVerified: true,
    gstVerified: true,
    panVerified: true,
    bankVerified: true,
});

export const insertSellerWalletSchema = createInsertSchema(sellerWallets).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    pendingBalance: true,
    availableBalance: true,
    totalEarned: true,
    totalWithdrawn: true,
    holdBalance: true,
});

export const insertSellerOrderSchema = createInsertSchema(sellerOrders).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    stateHistory: true,
    stateVersion: true,
});

export const insertSellerOrderItemSchema = createInsertSchema(sellerOrderItems).omit({
    id: true,
});

export const insertSellerPayoutSchema = createInsertSchema(sellerPayouts).omit({
    id: true,
    createdAt: true,
    approvedAt: true,
    processedAt: true,
    completedAt: true,
    status: true,
    transactionId: true,
    utrNumber: true,
    failureReason: true,
    retryCount: true,
});

export const insertSellerTransactionSchema = createInsertSchema(sellerTransactions).omit({
    id: true,
    createdAt: true,
});

export const insertCommissionRuleSchema = createInsertSchema(commissionRules).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertSellerReturnRequestSchema = createInsertSchema(sellerReturnRequests).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    refundedAt: true,
    closedAt: true,
    status: true,
    approvedRefundAmount: true,
    qcResult: true,
    qcNotes: true,
    qcImages: true,
    qcBy: true,
    sellerResponse: true,
    sellerRespondedAt: true,
    adminNote: true,
    respondedBy: true,
});

export const insertSellerNotificationSchema = createInsertSchema(sellerNotifications).omit({
    id: true,
    createdAt: true,
    isRead: true,
    readAt: true,
});

// ============================================================================
// TYPES
// ============================================================================

export type SellerProfile = typeof sellerProfiles.$inferSelect;
export type InsertSellerProfile = z.infer<typeof insertSellerProfileSchema>;

export type SellerWallet = typeof sellerWallets.$inferSelect;
export type InsertSellerWallet = z.infer<typeof insertSellerWalletSchema>;

export type SellerOrder = typeof sellerOrders.$inferSelect;
export type InsertSellerOrder = z.infer<typeof insertSellerOrderSchema>;

export type SellerOrderItem = typeof sellerOrderItems.$inferSelect;
export type InsertSellerOrderItem = z.infer<typeof insertSellerOrderItemSchema>;

export type SellerPayout = typeof sellerPayouts.$inferSelect;
export type InsertSellerPayout = z.infer<typeof insertSellerPayoutSchema>;

export type SellerTransaction = typeof sellerTransactions.$inferSelect;
export type InsertSellerTransaction = z.infer<typeof insertSellerTransactionSchema>;

export type CommissionRule = typeof commissionRules.$inferSelect;
export type InsertCommissionRule = z.infer<typeof insertCommissionRuleSchema>;

export type SellerReturnRequest = typeof sellerReturnRequests.$inferSelect;
export type InsertSellerReturnRequest = z.infer<typeof insertSellerReturnRequestSchema>;

export type SellerNotification = typeof sellerNotifications.$inferSelect;
export type InsertSellerNotification = z.infer<typeof insertSellerNotificationSchema>;

// ============================================================================
// API VALIDATION SCHEMAS
// ============================================================================

export const sellerRegistrationSchema = z.object({
    // Business Info
    shopName: z.string().min(3, "Shop name must be at least 3 characters").max(100),
    businessType: z.enum(["individual", "company", "partnership"]),
    description: z.string().max(1000).optional(),

    // Contact
    businessEmail: z.string().email("Invalid email address"),
    businessPhone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),

    // KYC
    hasGst: z.boolean().default(false),
    gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST number").optional(),
    panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN number"),

    // Bank
    bankAccountNumber: z.string().min(9, "Account number must be at least 9 digits").max(18),
    bankIfscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),
    bankAccountName: z.string().min(3).max(100),
    bankName: z.string().optional(),

    // Pickup Address
    pickupAddressLine1: z.string().min(10, "Address must be at least 10 characters"),
    pickupAddressLine2: z.string().optional(),
    pickupCity: z.string().min(2),
    pickupState: z.string().min(2),
    pickupPincode: z.string().regex(/^[1-9][0-9]{5}$/, "Invalid pincode"),
    pickupPhone: z.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number"),
    pickupLandmark: z.string().optional(),
}).refine((data) => {
    // If hasGst is true, gstNumber is required
    if (data.hasGst && !data.gstNumber) {
        return false;
    }
    return true;
}, {
    message: "GST number is required when GST is enabled",
    path: ["gstNumber"],
});

export const sellerProfileUpdateSchema = z.object({
    shopName: z.string().min(3).max(100).optional(),
    description: z.string().max(1000).optional(),
    logoUrl: z.string().url().optional(),
    bannerUrl: z.string().url().optional(),
    pickupAddressLine1: z.string().min(10).optional(),
    pickupAddressLine2: z.string().optional(),
    pickupCity: z.string().min(2).optional(),
    pickupState: z.string().min(2).optional(),
    pickupPincode: z.string().regex(/^[1-9][0-9]{5}$/).optional(),
    pickupPhone: z.string().regex(/^[6-9]\d{9}$/).optional(),
    pickupLandmark: z.string().optional(),
});

export const sellerBankUpdateSchema = z.object({
    bankAccountNumber: z.string().min(9).max(18),
    bankIfscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),
    bankAccountName: z.string().min(3).max(100),
    bankName: z.string().optional(),
});

export const sellerOrderStatusUpdateSchema = z.object({
    status: z.enum(["confirmed", "processing", "shipped"]),
    trackingNumber: z.string().optional(),
    shippingProvider: z.string().optional(),
    estimatedDelivery: z.string().datetime().optional(),
    sellerNote: z.string().max(500).optional(),
});

export const sellerPayoutRequestSchema = z.object({
    amount: z.number().positive().min(100, "Minimum payout is ₹100"),
});

export const returnResponseSchema = z.object({
    action: z.enum(["approve", "reject"]),
    response: z.string().min(10, "Response must be at least 10 characters"),
    refundAmount: z.number().positive().optional(), // For partial refunds
});

export const adminSellerActionSchema = z.object({
    action: z.enum(["approve", "reject", "suspend", "blacklist", "reactivate"]),
    reason: z.string().min(10, "Reason must be at least 10 characters"),
});

export const adminProductModerationSchema = z.object({
    action: z.enum(["approve", "reject"]),
    reason: z.string().optional(),
});

export const commissionRuleCreateSchema = z.object({
    name: z.string().min(3).max(100),
    description: z.string().max(500).optional(),
    categoryId: z.number().int().positive().optional(),
    sellerId: z.number().int().positive().optional(),
    commissionType: z.enum(["percentage", "fixed"]),
    commissionValue: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid commission value"),
    minCommission: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    maxCommission: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    priority: z.number().int().min(0).max(100).default(0),
    isActive: z.boolean().default(true),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional(),
});

// ============================================================================
// CONSTANTS
// ============================================================================

// Default platform commission (10%)
export const DEFAULT_COMMISSION_RATE = "10";

// Payout hold period in days after delivery
export const PAYOUT_HOLD_DAYS = 7;

// Minimum payout amount in INR
export const MIN_PAYOUT_AMOUNT = 100;

// Seller order status transitions
export const SELLER_ORDER_TRANSITIONS: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["out_for_delivery", "delivered"],
    out_for_delivery: ["delivered"],
    delivered: ["return_requested"],
    return_requested: ["returned", "delivered"],
    cancelled: [],
    returned: [],
};

// Return request status transitions
export const RETURN_STATUS_TRANSITIONS: Record<string, string[]> = {
    requested: ["seller_approved", "seller_rejected", "admin_review"],
    seller_approved: ["pickup_scheduled"],
    seller_rejected: ["admin_review", "closed"],
    admin_review: ["pickup_scheduled", "refund_rejected", "closed"],
    pickup_scheduled: ["picked", "pickup_failed"],
    pickup_failed: ["pickup_scheduled", "closed"],
    picked: ["in_transit"],
    in_transit: ["received"],
    received: ["quality_check"],
    quality_check: ["qc_passed", "qc_failed"],
    qc_passed: ["refund_approved"],
    qc_failed: ["refund_rejected", "refund_approved"],
    refund_approved: ["refund_processing"],
    refund_rejected: ["closed"],
    refund_processing: ["refunded"],
    refunded: ["closed"],
    closed: [],
};
