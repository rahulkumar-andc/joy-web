import { pgTable, serial, text, integer, decimal, boolean, timestamp, unique, jsonb, index, real, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === SHARED SCHEMAS ===
// Moved to bottom to avoid hoisting issues

// === CANNED RESPONSES ===
export const cannedResponses = pgTable("canned_responses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCannedResponseSchema = createInsertSchema(cannedResponses).omit({ id: true, createdAt: true, updatedAt: true, createdBy: true });
export type CannedResponse = typeof cannedResponses.$inferSelect;
export type InsertCannedResponse = z.infer<typeof insertCannedResponseSchema>;

// === USERS ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  avatarUrl: text("avatar_url"),
  role: text("role", { enum: ["admin", "manager", "seller", "user", "courier"] }).default("user").notNull(),
  walletBalance: decimal("wallet_balance").default("0").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  // Security enhancements
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  lockoutUntil: timestamp("lockout_until"),
  lastLoginAt: timestamp("last_login_at"),
  lastPasswordChangeAt: timestamp("last_password_change_at"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });

// === CATEGORIES ===
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });

// === PRODUCTS ===
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  // Pricing: mrp = display only (crossed out), salePrice = transactional (what customer pays)
  mrp: decimal("price").notNull(), // Column stays "price" in DB for now, but semantically it's MRP
  salePrice: decimal("discount_price"), // Column stays "discount_price" in DB, but semantically it's the sale price
  categoryId: integer("category_id").references(() => categories.id),
  stockQuantity: integer("stock_quantity").default(0).notNull(),
  images: text("images").array().notNull(),
  sizes: text("sizes").array(),
  colors: text("colors").array(),
  tags: text("tags").array(),
  brand: text("brand"),
  sku: text("sku"), // Product SKU for seller reference
  // Flags
  showOnHomepage: boolean("show_on_homepage").default(false),
  isFeatured: boolean("is_featured").default(false),
  isTrending: boolean("is_trending").default(false),
  isBestSeller: boolean("is_best_seller").default(false),
  isNewArrival: boolean("is_new_arrival").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  sellerId: integer("seller_id").references(() => users.id),

  // Extended Details
  warranty: text("warranty"),
  material: text("material"),
  pattern: text("pattern"),
  returnPolicyDays: integer("return_policy_days").default(7),
  countryOfOrigin: text("country_of_origin"),
  sellerName: text("seller_name"), // Display name for the seller
  sellerRating: decimal("seller_rating", { precision: 2, scale: 1 }), // Synced from seller profile or reviews

  // Rich Data
  specifications: jsonb("specifications"), // Key-value pairs { "RAM": "8GB" }
  highlights: text("highlights").array(), // ["Feature 1", "Feature 2"]
  offers: jsonb("offers"), // [{ title: "Bank Offer", description: "..." }]
  extraImages: text("extra_images").array(), // Gallery images separate from main images if needed

  // Product Moderation (for multi-vendor marketplace)
  moderationStatus: text("moderation_status", {
    enum: ["pending", "approved", "rejected", "disabled"]
  }).default("pending").notNull(), // Default pending - requires admin approval
  rejectionReason: text("rejection_reason"),
  moderatedBy: integer("moderated_by").references(() => users.id),
  moderatedAt: timestamp("moderated_at"),

  // === NEW CLOTHING FIELDS ===
  gender: text("gender", { enum: ["Men", "Women", "Unisex", "Kids"] }),
  clothingCategory: text("clothing_category"), // T-shirt, Shirt, Jeans etc.
  fitType: text("fit_type"), // Regular, Slim, Oversized

  fabricType: text("fabric_type"),
  careInstructions: text("care_instructions"),

  seasonTags: text("season_tags").array(),
  styleTags: text("style_tags").array(),

  modelHeight: text("model_height"),
  modelSizeWorn: text("model_size_worn"),

  dispatchTime: text("dispatch_time"),

  // SEO
  seoTitle: text("seo_title"),
  seoKeywords: text("seo_keywords"),
  slug: text("slug").unique(),
}, (table) => ({
  categoryIdIdx: index("product_category_idx").on(table.categoryId),
  sellerIdIdx: index("product_seller_idx").on(table.sellerId),
  featuredIdx: index("product_featured_idx").on(table.isFeatured),
  moderationIdx: index("product_moderation_idx").on(table.moderationStatus),
}));

export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });

// === PRODUCT VARIANTS ===

export const productSizes = pgTable("product_sizes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  size: text("size").notNull(), // XS, S, M, L...
  stock: integer("stock").default(0).notNull(),
  priceOverride: decimal("price_override"), // Optional override
});

export const insertProductSizeSchema = createInsertSchema(productSizes).omit({ id: true });
export type ProductSize = typeof productSizes.$inferSelect;
export type InsertProductSize = z.infer<typeof insertProductSizeSchema>;

export const productColors = pgTable("product_colors", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  colorName: text("color_name").notNull(),
  colorHex: text("color_hex"),
  imageUrl: text("image_url"),
  stock: integer("stock").default(0).notNull(),
});

export const insertProductColorSchema = createInsertSchema(productColors).omit({ id: true });
export type ProductColor = typeof productColors.$inferSelect;
export type InsertProductColor = z.infer<typeof insertProductColorSchema>;

export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  imageUrl: text("image_url").notNull(),
  type: text("type", { enum: ["front", "back", "side", "zoom", "model", "gallery"] }).default("gallery"),
});

export const insertProductImageSchema = createInsertSchema(productImages).omit({ id: true });
export type ProductImage = typeof productImages.$inferSelect;
export type InsertProductImage = z.infer<typeof insertProductImageSchema>;


// === HOMEPAGE SECTIONS ===
export const homepageSections = pgTable("homepage_sections", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type", { enum: ["grid", "carousel", "featured_hero"] }).notNull(),
  order: integer("order").notNull(),
  isActive: boolean("is_active").default(true),
});

export const homepageSectionItems = pgTable("homepage_section_items", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").references(() => homepageSections.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  order: integer("order").notNull(),
});

// === CART & WISHLIST ===
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // Nullable for session/guest cart if we decide to store server side, but mostly for logged in
  sessionId: text("session_id"), // For guest users
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull().default(1),
  size: text("size"),
  color: text("color"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const wishlistItems = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
});

// === STOCK RESERVATIONS ===
export const stockReservations = pgTable("stock_reservations", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id"), // For guest checkout
  quantity: integer("quantity").notNull(),
  reservedAt: timestamp("reserved_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // 15 minutes from reserved_at
  status: text("status", { enum: ["active", "released", "consumed"] }).default("active").notNull(),
  orderId: integer("order_id").references(() => orders.id), // Linked on order creation
});

// === ORDERS ===
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  totalAmount: decimal("total_amount").notNull(),
  shippingCost: decimal("shipping_cost").default("0"), // Shipping cost for analytics
  status: text("status", { enum: ["pending", "paid", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"] }).default("pending").notNull(),
  paymentStatus: text("payment_status", { enum: ["pending", "paid", "failed"] }).default("pending").notNull(),

  // Tracking Info
  // Tracking Info
  displayId: text("display_id"), // Deprecated, use publicOrderId
  internalOrderId: text("internal_order_id").unique(),
  publicOrderId: text("public_order_id").unique(),
  sequenceNumber: integer("sequence_number").unique(),

  invoiceId: text("invoice_id"),
  refundStatus: text("refund_status", { enum: ["none", "pending", "processed", "failed"] }).default("none"),

  courierName: text("courier_name"),
  trackingNumber: text("tracking_number"),
  estimatedDeliveryDate: timestamp("estimated_delivery_date"),
  deliveredAt: timestamp("delivered_at"),

  // Order state machine
  orderState: text("order_state", {
    enum: ["CREATED", "PAYMENT_PENDING", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REFUND_PENDING"]
  }).default("CREATED").notNull(),
  stateVersion: integer("state_version").default(1).notNull(), // Optimistic locking
  stateHistory: jsonb("state_history").default([]), // Audit trail

  // Idempotency
  orderIdempotencyKey: text("order_idempotency_key").unique(),

  // Reseller attribution
  resellerLinkId: integer("reseller_link_id"),
  referredByReseller: integer("referred_by_reseller"),

  // COD (Cash on Delivery) Support
  codAmount: decimal("cod_amount", { precision: 10, scale: 2 }),
  codCollected: boolean("cod_collected").default(false),
  codCollectedAt: timestamp("cod_collected_at"),
  codCollectedBy: integer("cod_collected_by").references(() => users.id),
  deliveryInstructions: text("delivery_instructions"),

  // In-House Delivery System
  assignedCourier: integer("assigned_courier").references(() => users.id),
  deliveryStatus: text("delivery_status", {
    enum: ["pending", "picked_up", "in_transit", "delivered"]
  }).default("pending"),
  proofOfDeliveryImage: text("proof_of_delivery_image"),
  podLocation: jsonb("pod_location"), // { lat: number, lng: number }
  podTimestamp: timestamp("pod_timestamp"),
  isSuspiciousDelivery: boolean("is_suspicious_delivery").default(false),
  suspiciousReason: text("suspicious_reason"),

  // COD Settlement
  paymentSettled: boolean("payment_settled").default(false),
  settlementTimestamp: timestamp("settlement_timestamp"),
  settledBy: integer("settled_by").references(() => users.id),

  shippingAddress: jsonb("shipping_address").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("order_user_idx").on(table.userId),
  statusIdx: index("order_status_idx").on(table.status),
  assignedCourierIdx: index("order_assigned_courier_idx").on(table.assignedCourier),
  deliveryStatusIdx: index("order_delivery_status_idx").on(table.deliveryStatus),
}));

// Orders relations for Drizzle ORM joins
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  orderItems: many(orderItems),
}));


export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  razorpayOrderId: text("razorpay_order_id").notNull(),
  razorpayPaymentId: text("razorpay_payment_id"),
  razorpaySignature: text("razorpay_signature"),
  amount: decimal("amount").notNull(),
  currency: text("currency").default("INR"),
  status: text("status", { enum: ["created", "paid", "failed"] }).default("created"),

  // State machine for payment lifecycle
  paymentState: text("payment_state", {
    enum: ["CREATED", "INITIATED", "ATTEMPTED", "CAPTURED", "SUCCESS", "FAILED", "REFUNDED", "CANCELLED"]
  }).default("CREATED").notNull(),
  stateVersion: integer("state_version").default(1).notNull(), // Optimistic locking
  stateHistory: jsonb("state_history").default([]), // Audit trail

  // Idempotency & tracking
  idempotencyKey: text("idempotency_key").unique(),
  gatewayReference: text("gateway_reference"), // Gateway's unique ID
  gateway: text("gateway", { enum: ["razorpay", "stripe"] }), // Which gateway was used
  attemptCount: integer("attempt_count").default(0).notNull(),
  lastAttemptAt: timestamp("last_attempt_at"),
  expiresAt: timestamp("expires_at"), // Payment link expiry

  // Reconciliation
  reconciledAt: timestamp("reconciled_at"),
  reconciledBy: text("reconciled_by"), // "webhook" | "manual" | "cron"
  settlementStatus: text("settlement_status", {
    enum: ["PENDING", "SETTLED", "DELAYED", "FAILED"]
  }),

  paymentMethod: text("payment_method", {
    enum: ["upi", "card", "netbanking", "wallet", "cod"]
  }), // Payment method used
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price").notNull(), // Snapshot price
  size: text("size"),
  color: text("color"),
});

// === REVIEWS ===
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  rating: integer("rating").notNull(),
  title: text("title"), // Review headline
  comment: text("comment"),
  images: text("images").array(), // Customer uploaded images
  verifiedPurchase: boolean("verified_purchase").default(false),
  helpfulCount: integer("helpful_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  productIdIdx: index("review_product_idx").on(table.productId),
  userIdIdx: index("review_user_idx").on(table.userId),
}));

export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });

// === REVIEW VOTES ===
export const reviewVotes = pgTable("review_votes", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").references(() => reviews.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueVote: unique().on(table.reviewId, table.userId),
  reviewIdIdx: index("review_vote_review_idx").on(table.reviewId),
}));

// === ORDER ITEM PAIRS (Bought Together) ===
export const orderItemPairs = pgTable("order_item_pairs", {
  id: serial("id").primaryKey(),
  productId1: integer("product_id_1").references(() => products.id).notNull(),
  productId2: integer("product_id_2").references(() => products.id).notNull(),
  count: integer("count").default(1).notNull(),
}, (table) => ({
  uniquePair: unique().on(table.productId1, table.productId2),
  productId1Idx: index("pair_product1_idx").on(table.productId1),
}));

// === COUPONS ===
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountType: text("discount_type", { enum: ["percentage", "fixed"] }).notNull(),
  discountValue: decimal("discount_value").notNull(),
  minOrderAmount: decimal("min_order_amount").default("0"),
  maxUsage: integer("max_usage"), // Global usage limit
  maxUsagePerUser: integer("max_usage_per_user").default(1), // Per-user usage limit
  usageCount: integer("usage_count").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCouponSchema = createInsertSchema(coupons).omit({ id: true, createdAt: true, usageCount: true }).extend({
  discountValue: z.coerce.string(),
  minOrderAmount: z.coerce.string().default("0"),
  expiresAt: z.coerce.date().nullable().optional(),
});

export const couponUsage = pgTable("coupon_usage", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").references(() => coupons.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
  usedAt: timestamp("used_at").defaultNow(),
}, (table) => ({
  uniqueUserCoupon: unique().on(table.couponId, table.userId)
}));

// === RELATIONS ===
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull().unique(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  snapshotData: jsonb("snapshot_data").notNull(),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  reviews: many(reviews),
}));

export const homepageSectionItemsRelations = relations(homepageSectionItems, ({ one }) => ({
  section: one(homepageSections, {
    fields: [homepageSectionItems.sectionId],
    references: [homepageSections.id],
  }),
  product: one(products, {
    fields: [homepageSectionItems.productId],
    references: [products.id],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  product: one(products, {
    fields: [wishlistItems.productId],
    references: [products.id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
}));

// === VERIFICATION TOKENS (OTP & Password Reset) ===
export const verificationTokens = pgTable("verification_tokens", {
  id: serial("id").primaryKey(),
  identifier: text("identifier").notNull(), // Email
  token: text("token").notNull(), // Hashed OTP or Token
  type: text("type", { enum: ["EMAIL_VERIFICATION", "PASSWORD_RESET"] }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVerificationTokenSchema = createInsertSchema(verificationTokens).omit({ id: true, createdAt: true });
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type InsertVerificationToken = z.infer<typeof insertVerificationTokenSchema>;

// === ADDRESSES ===
export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  label: text("label").notNull(), // e.g., "Home", "Work"
  fullName: text("full_name").notNull(),
  addressLine1: text("address_line1").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  country: text("country").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAddressSchema = createInsertSchema(addresses).omit({ id: true, createdAt: true });

// === TYPES ===
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type HomepageSection = typeof homepageSections.$inferSelect;
export type HomepageSectionItem = typeof homepageSectionItems.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type WishlistItem = typeof wishlistItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert; // Added missing export
export type Refund = typeof refunds.$inferSelect;
export type InsertRefund = z.infer<typeof insertRefundSchema>;

// === SHARED ZOD SCHEMAS (Defined here to avoid hoisting issues) ===
export const cartAddSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
  size: z.string().optional(),
  color: z.string().optional(),
});

export const cartUpdateSchema = z.object({
  quantity: z.number().int().positive(),
});

export const orderCreateSchema = z.object({
  shippingAddress: z.object({
    fullName: z.string().min(1, "Full name is required"),
    addressLine1: z.string().min(1, "Address line 1 is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zipCode: z.string().min(1, "Zip code is required"),
    country: z.string().min(1, "Country is required"),
  }),
  couponCode: z.string().optional(),
});

export const wishlistAddSchema = z.object({
  productId: z.number().int().positive(),
});

export const profileUpdateSchema = createInsertSchema(users).pick({
  name: true,
  phone: true,
  address: true,
  avatarUrl: true,
}).partial();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export const reviewCreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export const paymentVerifySchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

export const refunds = pgTable("refunds", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  reason: text("reason").notNull(),
  description: text("description"),
  status: text("status", { enum: ["pending", "approved", "rejected", "processing", "completed"] }).default("pending").notNull(),
  refundMethod: text("refund_method", { enum: ["original", "wallet"] }).default("original").notNull(),
  amount: decimal("amount").notNull(),
  images: text("images").array(),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRefundSchema = createInsertSchema(refunds).omit({ id: true, createdAt: true, updatedAt: true, status: true, adminNote: true });

export const refundsRelations = relations(refunds, ({ one }) => ({
  order: one(orders, {
    fields: [refunds.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [refunds.userId],
    references: [users.id],
  }),
}));

export const updateRefundStatusSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "processing", "completed"]),
  adminNote: z.string().optional(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityId: text("entity_id"),
  entityType: text("entity_type"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;


export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: decimal("amount").notNull(), // Positive for credit, negative for debit
  type: text("type", { enum: ["refund", "purchase", "deposit", "withdrawal"] }).notNull(),
  referenceId: text("reference_id"), // e.g., "refund_123", "order_456"
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({ id: true, createdAt: true });

export const refundItems = pgTable("refund_items", {
  id: serial("id").primaryKey(),
  refundId: integer("refund_id").references(() => refunds.id).notNull(),
  orderItemId: integer("order_item_id").references(() => orderItems.id).notNull(),
  quantity: integer("quantity").notNull(),
  reason: text("reason"),
});

export const insertRefundItemSchema = createInsertSchema(refundItems).omit({ id: true });
export type RefundItem = typeof refundItems.$inferSelect;

// === SESSION ===
export const session = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

// === HERO CAMPAIGNS ===
export const heroCampaigns = pgTable("hero_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["default", "sale", "flash_sale", "festival"] }).default("default").notNull(),
  priority: integer("priority").default(0).notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),

  // Media Configuration
  mediaType: text("media_type", { enum: ["image", "video"] }).notNull(),
  mediaSource: text("media_source", { enum: ["upload", "url"] }).default("url").notNull(),
  mediaUrl: text("media_url").notNull(),
  mediaFilePath: text("media_file_path"), // Internal path for uploaded files

  // Content Configuration
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  ctaLabel: text("cta_label"),
  ctaUrl: text("cta_url"),

  // UI Configuration
  contentAlignment: text("content_alignment", { enum: ["left", "center", "right"] }).default("left").notNull(),
  textColor: text("text_color").default("#ffffff").notNull(),
  overlayOpacity: decimal("overlay_opacity").default("0.4").notNull(),

  // Targeting
  targetAudience: text("target_audience", { enum: ["all", "guest", "user"] }).default("all").notNull(),

  // Positioning Configuration (Offsets in px from center)
  titleOffsetX: integer("title_offset_x").default(0),
  titleOffsetY: integer("title_offset_y").default(0),
  subtitleOffsetX: integer("subtitle_offset_x").default(0),
  subtitleOffsetY: integer("subtitle_offset_y").default(50),
  ctaOffsetX: integer("cta_offset_x").default(0),
  ctaOffsetY: integer("cta_offset_y").default(100),
  countdownOffsetX: integer("countdown_offset_x").default(0),
  countdownOffsetY: integer("countdown_offset_y").default(-100),

  // New Enhancements (2025 Upgrade) - Optional & Backward Compatible
  titleFontSize: integer("title_font_size"), // px
  subtitleFontSize: integer("subtitle_font_size"), // px
  fontWeight: text("font_weight", { enum: ["normal", "bold"] }).default("normal"),
  overlayColor: text("overlay_color", { enum: ["black", "gradient", "brand"] }).default("black"),
  deviceTarget: text("device_target", { enum: ["all", "desktop", "mobile"] }).default("all"),
  // New Dynamic Styling (2025)
  titleColor: text("title_color").default("#ffffff"),
  subtitleColor: text("subtitle_color").default("#ffffff"),
  buttonColor: text("button_color").default("#ffffff"),
  fontFamily: text("font_family").default("Inter"),

  // Analytics Lite
  enableAnalytics: boolean("enable_analytics").default(false),
  impressionCount: integer("impression_count").default(0),
  clickCount: integer("click_count").default(0),

  // Secondary CTA
  secondaryCtaLabel: text("secondary_cta_label"),
  secondaryCtaUrl: text("secondary_cta_url"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHeroCampaignSchema = createInsertSchema(heroCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  priority: z.coerce.number().int().default(0),
  overlayOpacity: z.string().default("0.4"),
  targetAudience: z.enum(["all", "guest", "user"]).default("all"),
  endTime: z.coerce.date().nullable().optional(),
  mediaSource: z.enum(["upload", "url"]).default("url"),
  mediaFilePath: z.string().optional().nullable(),
  titleOffsetX: z.coerce.number().int().default(0),
  titleOffsetY: z.coerce.number().int().default(0),
  subtitleOffsetX: z.coerce.number().int().default(0),
  subtitleOffsetY: z.coerce.number().int().default(50),
  ctaOffsetX: z.coerce.number().int().default(0),
  ctaOffsetY: z.coerce.number().int().default(100),
  countdownOffsetX: z.coerce.number().int().default(0),
  countdownOffsetY: z.coerce.number().int().default(-100),

  // New Fields Validation
  startTime: z.coerce.date().nullable().optional(), // Ensure accessible in insert
  titleFontSize: z.coerce.number().optional().nullable(),
  subtitleFontSize: z.coerce.number().optional().nullable(),
  fontWeight: z.enum(["normal", "bold"]).default("normal"),
  overlayColor: z.enum(["black", "gradient", "brand"]).default("black"),
  deviceTarget: z.enum(["all", "desktop", "mobile"]).default("all"),
  titleColor: z.string().default("#ffffff"),
  subtitleColor: z.string().default("#ffffff"),
  buttonColor: z.string().default("#ffffff"),
  fontFamily: z.string().default("Inter"),
  // Handle 'true'/'false' strings from FormData
  enableAnalytics: z.preprocess((val) => {
    if (typeof val === 'string') return val === 'true';
    return Boolean(val);
  }, z.boolean()).default(false),
  impressionCount: z.coerce.number().default(0),
  clickCount: z.coerce.number().default(0),
  secondaryCtaLabel: z.string().optional().nullable(),
  secondaryCtaUrl: z.string().optional().nullable(),
});

export type HeroCampaign = typeof heroCampaigns.$inferSelect;
export type InsertHeroCampaign = z.infer<typeof insertHeroCampaignSchema>;

// === HERO ANALYTICS ===
export const heroAnalytics = pgTable("hero_analytics", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => heroCampaigns.id),
  eventType: text("event_type", { enum: ["impression", "click"] }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertHeroAnalyticsSchema = createInsertSchema(heroAnalytics);
export type InsertHeroAnalytics = z.infer<typeof insertHeroAnalyticsSchema>;
export type HeroAnalytics = typeof heroAnalytics.$inferSelect;

// === A/B TESTING ===
export const campaignVariants = pgTable("campaign_variants", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => heroCampaigns.id).notNull(),
  variantName: text("variant_name").notNull(), // e.g., "A", "B", "Control"
  trafficPercentage: integer("traffic_percentage").default(50).notNull(), // 0-100

  // Variant-specific overrides (null = use parent campaign values)
  title: text("title"),
  subtitle: text("subtitle"),
  ctaLabel: text("cta_label"),
  ctaUrl: text("cta_url"),
  mediaUrl: text("media_url"),

  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCampaignVariantSchema = createInsertSchema(campaignVariants).omit({ id: true, createdAt: true });
export type CampaignVariant = typeof campaignVariants.$inferSelect;
export type InsertCampaignVariant = z.infer<typeof insertCampaignVariantSchema>;

// Track variant-level analytics
export const variantAnalytics = pgTable("variant_analytics", {
  id: serial("id").primaryKey(),
  variantId: integer("variant_id").references(() => campaignVariants.id).notNull(),
  campaignId: integer("campaign_id").references(() => heroCampaigns.id).notNull(),
  eventType: text("event_type", { enum: ["impression", "click", "conversion"] }).notNull(),
  sessionId: text("session_id"), // To track unique users
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertVariantAnalyticsSchema = createInsertSchema(variantAnalytics);
export type VariantAnalytics = typeof variantAnalytics.$inferSelect;

// === CAMPAIGN SCHEDULING ===
export const campaignSchedules = pgTable("campaign_schedules", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => heroCampaigns.id).notNull(),

  // Scheduling
  activateAt: timestamp("activate_at").notNull(),
  deactivateAt: timestamp("deactivate_at"),

  // Recurrence
  recurrenceType: text("recurrence_type", { enum: ["none", "daily", "weekly", "monthly"] }).default("none").notNull(),
  recurrenceEndDate: timestamp("recurrence_end_date"),

  // Status
  status: text("status", { enum: ["pending", "activated", "completed", "cancelled"] }).default("pending").notNull(),
  lastProcessedAt: timestamp("last_processed_at"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCampaignScheduleSchema = createInsertSchema(campaignSchedules).omit({ id: true, createdAt: true, lastProcessedAt: true });
export type CampaignSchedule = typeof campaignSchedules.$inferSelect;
export type InsertCampaignSchedule = z.infer<typeof insertCampaignScheduleSchema>;

// === PERSONALIZATION ===
export const campaignPersonalization = pgTable("campaign_personalization", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => heroCampaigns.id).notNull(),

  // Geo targeting
  geoTargets: text("geo_targets").array(), // Country codes: ["IN", "US", "UK"]

  // Cart value targeting
  minCartValue: decimal("min_cart_value"),
  maxCartValue: decimal("max_cart_value"),

  // Device targeting
  deviceTargets: text("device_targets").array(), // ["mobile", "desktop", "tablet"]

  // User segment targeting
  userSegments: text("user_segments").array(), // ["new", "returning", "vip"]

  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCampaignPersonalizationSchema = createInsertSchema(campaignPersonalization).omit({ id: true, createdAt: true });
export type CampaignPersonalization = typeof campaignPersonalization.$inferSelect;

// === CONTENT MODERATION ===
export const campaignReviews = pgTable("campaign_reviews", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => heroCampaigns.id).notNull(),
  reviewerId: integer("reviewer_id").references(() => users.id),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending").notNull(),
  reviewNotes: text("review_notes"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCampaignReviewSchema = createInsertSchema(campaignReviews).omit({ id: true, createdAt: true, reviewedAt: true });
export type CampaignReview = typeof campaignReviews.$inferSelect;
export type InsertCampaignReview = z.infer<typeof insertCampaignReviewSchema>;

// === PUSH SUBSCRIPTIONS ===
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  endpoint: text("endpoint").notNull(),
  keys: jsonb("keys").notNull(), // { p256dh: string, auth: string }
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

// === FEATURE FLAGS ===
export const featureFlags = pgTable('feature_flags', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  enabled: boolean('enabled').default(false).notNull(),

  // Rollout strategy
  rolloutPercentage: integer('rollout_percentage').default(0).notNull(),

  // User targeting
  userIds: integer('user_ids').array(),
  userRoles: text('user_roles').array(),

  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({ id: true, createdAt: true, updatedAt: true });
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;

//=== RE-EXPORT RBAC SCHEMA ===
export * from "./rbac-schema";

// === RE-EXPORT PAYMENT SCHEMA ===
export * from "./payment-schema";

// === RE-EXPORT RESELLER SCHEMA ===
export * from "./reseller-schema";

// === RE-EXPORT SHIPPING SCHEMA ===
export * from "./shipping-schema";

// === RE-EXPORT SELLER MARKETPLACE SCHEMA ===
export * from "./seller-schema";

// === RE-EXPORT SUPPORT SCHEMA ===
export * from "./support-schema";
