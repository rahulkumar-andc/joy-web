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
  role: text("role", { enum: ["admin", "manager", "user"] }).default("user").notNull(),
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

// === PASSWORD RESET TOKENS ===
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

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
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;

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
