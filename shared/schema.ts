import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === SHARED SCHEMAS ===
// Moved to bottom to avoid hoisting issues

// === USERS ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  avatarUrl: text("avatar_url"),
  role: text("role", { enum: ["admin", "manager", "seller", "user"] }).default("user").notNull(),
  walletBalance: decimal("wallet_balance").default("0").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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
  price: decimal("price").notNull(),
  discountPrice: decimal("discount_price"),
  categoryId: integer("category_id").references(() => categories.id),
  stockQuantity: integer("stock_quantity").default(0).notNull(),
  images: text("images").array().notNull(),
  sizes: text("sizes").array(),
  colors: text("colors").array(),
  tags: text("tags").array(),
  brand: text("brand"),
  // Flags
  showOnHomepage: boolean("show_on_homepage").default(false),
  isFeatured: boolean("is_featured").default(false),
  isTrending: boolean("is_trending").default(false),
  isBestSeller: boolean("is_best_seller").default(false),
  isNewArrival: boolean("is_new_arrival").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  sellerId: integer("seller_id").references(() => users.id),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });

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

// === ORDERS ===
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  totalAmount: decimal("total_amount").notNull(),
  status: text("status", { enum: ["pending", "paid", "shipped", "delivered", "cancelled"] }).default("pending").notNull(),
  paymentStatus: text("payment_status", { enum: ["pending", "paid", "failed"] }).default("pending").notNull(),
  shippingAddress: jsonb("shipping_address").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  razorpayOrderId: text("razorpay_order_id").notNull(),
  razorpayPaymentId: text("razorpay_payment_id"),
  razorpaySignature: text("razorpay_signature"),
  amount: decimal("amount").notNull(),
  currency: text("currency").default("INR"),
  status: text("status", { enum: ["created", "paid", "failed"] }).default("created"),
  paymentMethod: text("payment_method"), // upi, card, netbanking, wallet
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
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });

// === COUPONS ===
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountType: text("discount_type", { enum: ["percentage", "fixed"] }).notNull(),
  discountValue: decimal("discount_value").notNull(),
  minOrderAmount: decimal("min_order_amount").default("0"),
  maxUsage: integer("max_usage"),
  usageCount: integer("usage_count").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCouponSchema = createInsertSchema(coupons).omit({ id: true, createdAt: true, usageCount: true });

// === RELATIONS ===
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
  mediaUrl: text("media_url").notNull(),

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

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHeroCampaignSchema = createInsertSchema(heroCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  priority: z.number().int().default(0),
  overlayOpacity: z.string().default("0.4"),
  targetAudience: z.enum(["all", "guest", "user"]).default("all"),
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
