import {
  users, products, categories, homepageSections, homepageSectionItems,
  cartItems, orders, orderItems, reviews, wishlistItems, coupons, passwordResetTokens, addresses,
  type User, type InsertUser, type Product, type InsertProduct,
  type Category, type InsertCategory, type HomepageSection,
  type CartItem, type Order, type WishlistItem, type Review, type InsertReview,
  type Coupon,
  type InsertCoupon,
  type Address,
  type InsertAddress,
  type PasswordResetToken
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, desc, sql, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Products
  getProducts(filters?: { category?: string; search?: string; sort?: string; page?: number; limit?: number }): Promise<{ products: Product[]; total: number }>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  createProductsBulk(products: InsertProduct[]): Promise<Product[]>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Homepage
  getHomepageSections(): Promise<(HomepageSection & { items: (Product & { order: number })[] })[]>;

  // Cart
  getCart(userId?: number, sessionId?: string): Promise<(CartItem & { product: Product })[]>;
  addToCart(item: Omit<CartItem, "id">): Promise<CartItem>;
  updateCartItem(id: number, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: number): Promise<void>;

  // Orders
  createOrder(order: Omit<Order, "id" | "createdAt" | "status" | "paymentStatus">, items: { productId: number; quantity: number; price: number; size?: string; color?: string }[]): Promise<Order>;
  createOrder(order: Omit<Order, "id" | "createdAt" | "status" | "paymentStatus">, items: { productId: number; quantity: number; price: number; size?: string; color?: string }[]): Promise<Order>;
  getOrders(userId: number): Promise<Order[]>;
  getAllOrders(): Promise<(Order & { user: { name: string; email: string } })[]>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;

  // Admin Stats
  getAdminStats(): Promise<{ totalRevenue: number; totalOrders: number; totalUsers: number; lowStockCount: number }>;
  getDailyRevenue(days?: number): Promise<{ date: string; revenue: number }[]>;

  // Address Book
  getAddresses(userId: number): Promise<Address[]>;
  createAddress(address: InsertAddress): Promise<Address>;
  deleteAddress(userId: number, addressId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<Omit<User, 'id' | 'password' | 'createdAt'>>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async updateUserPassword(id: number, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id));
  }

  // Password Reset Tokens
  async createPasswordResetToken(userId: number): Promise<string> {
    // Generate random token
    const token = crypto.randomUUID() + '-' + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing tokens for this user
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));

    // Create new token
    await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
    return token;
  }

  async validateResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [record] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    if (!record) return undefined;
    if (new Date(record.expiresAt) < new Date()) return undefined;
    return record;
  }

  async deleteResetToken(token: string): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
  }

  // Products
  async getProducts(filters?: { category?: string; search?: string; sort?: string; page?: number; limit?: number }): Promise<{ products: Product[]; total: number }> {
    // Build conditions
    const conditions = [];

    if (filters?.category) {
      // Get category id from slug
      const [cat] = await db.select().from(categories).where(eq(categories.slug, filters.category));
      if (cat) {
        conditions.push(eq(products.categoryId, cat.id));
      }
    }

    if (filters?.search) {
      // Search in both name and description (case-insensitive)
      conditions.push(
        sql`(${ilike(products.name, `%${filters.search}%`)} OR ${ilike(products.description, `%${filters.search}%`)})`
      );
    }

    // Combine conditions
    let whereClause = undefined;
    if (conditions.length > 0) {
      if (conditions.length === 1) {
        whereClause = conditions[0];
      } else {
        whereClause = and(...conditions);
      }
    }

    // Get total count for pagination metadata
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(whereClause);
    const total = Number(countResult?.count || 0);

    // Build query with pagination
    let query = db.select().from(products).where(whereClause);

    // Sorting
    // Note: Drizzle sorting with dynamic columns can be complex, doing simple cases
    // Ideally we should use orderBy in the query but for now keeping existing logic partially
    // However, for pagination to work correctly we really should sort at DB level
    // If we sort in memory, we can't paginate efficiently. 
    // Let's implement basic DB sorting

    if (filters?.sort === 'price_asc') {
      // @ts-ignore - price is numeric string in schema but safe to cast for sorting if needed, 
      // though usually in SQL we sort by the column directly. 
      // Our schema defines price as numeric(10,2) so it sorts correctly as number usually
      query.orderBy(sql`CAST(${products.price} AS DECIMAL) ASC`);
    } else if (filters?.sort === 'price_desc') {
      query.orderBy(sql`CAST(${products.price} AS DECIMAL) DESC`);
    } else {
      query.orderBy(desc(products.createdAt));
    }

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 50; // Default large limit if not specified
    const offset = (page - 1) * limit;

    query.limit(limit).offset(offset);

    const results = await query;
    return { products: results, total };
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async createProductsBulk(productsData: InsertProduct[]): Promise<Product[]> {
    if (productsData.length === 0) return [];
    const newProducts = await db.insert(products).values(productsData).returning();
    return newProducts;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  // Homepage
  async getHomepageSections(): Promise<(HomepageSection & { items: (Product & { order: number })[] })[]> {
    const sections = await db.select().from(homepageSections).where(eq(homepageSections.isActive, true)).orderBy(homepageSections.order);

    const result = [];
    for (const section of sections) {
      const items = await db.select({
        product: products,
        order: homepageSectionItems.order
      })
        .from(homepageSectionItems)
        .innerJoin(products, eq(homepageSectionItems.productId, products.id))
        .where(eq(homepageSectionItems.sectionId, section.id))
        .orderBy(homepageSectionItems.order);

      result.push({
        ...section,
        items: items.map(i => ({ ...i.product, order: i.order }))
      });
    }
    return result;
  }

  // Cart
  async getCart(userId?: number, sessionId?: string): Promise<(CartItem & { product: Product })[]> {
    let whereClause;
    if (userId) whereClause = eq(cartItems.userId, userId);
    else if (sessionId) whereClause = eq(cartItems.sessionId, sessionId);
    else return [];

    const items = await db.select({
      cartItem: cartItems,
      product: products
    })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(whereClause);

    return items.map(i => ({ ...i.cartItem, product: i.product }));
  }

  async addToCart(item: Omit<CartItem, "id">): Promise<CartItem> {
    const [newItem] = await db.insert(cartItems).values(item).returning();
    return newItem;
  }

  async updateCartItem(id: number, quantity: number): Promise<CartItem | undefined> {
    const [updated] = await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id)).returning();
    return updated;
  }

  async removeFromCart(id: number): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.id, id));
  }

  // Orders
  async createOrder(orderData: Omit<Order, "id" | "createdAt" | "status" | "paymentStatus">, items: { productId: number; quantity: number; price: number; size?: string; color?: string }[]): Promise<Order> {
    return await db.transaction(async (tx) => {
      const [newOrder] = await tx.insert(orders).values(orderData).returning();

      for (const item of items) {
        await tx.insert(orderItems).values({
          orderId: newOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price.toString(), // Ensure string for decimal
          size: item.size,
          color: item.color
        });
      }
      return newOrder;
    });
  }

  async getOrders(userId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  }

  async getAllOrders(): Promise<(Order & { user: { name: string; email: string } })[]> {
    const results = await db.select({
      order: orders,
      user: users
    })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.createdAt));

    return results.map(r => ({
      ...r.order,
      user: { name: r.user.name, email: r.user.email }
    }));
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const [updated] = await db.update(orders)
      .set({ status: status as any })
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  // Wishlist
  async getWishlist(userId: number): Promise<(WishlistItem & { product: Product })[]> {
    const items = await db.select({
      wishlistItem: wishlistItems,
      product: products
    })
      .from(wishlistItems)
      .innerJoin(products, eq(wishlistItems.productId, products.id))
      .where(eq(wishlistItems.userId, userId));

    return items.map(i => ({ ...i.wishlistItem, product: i.product }));
  }

  async addToWishlist(userId: number, productId: number): Promise<WishlistItem> {
    // Check if already exists
    const [existing] = await db.select().from(wishlistItems)
      .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));
    if (existing) return existing;

    const [item] = await db.insert(wishlistItems).values({ userId, productId }).returning();
    return item;
  }

  async removeFromWishlist(userId: number, productId: number): Promise<void> {
    await db.delete(wishlistItems)
      .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));
  }

  async isInWishlist(userId: number, productId: number): Promise<boolean> {
    const [item] = await db.select().from(wishlistItems)
      .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));
    return !!item;
  }

  // Reviews
  async getProductReviews(productId: number): Promise<(Review & { user: { name: string } })[]> {
    const items = await db.select({
      review: reviews,
      userName: users.name
    })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.productId, productId))
      .orderBy(desc(reviews.createdAt));

    return items.map(i => ({ ...i.review, user: { name: i.userName } }));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }

  async getProductAverageRating(productId: number): Promise<number> {
    const productReviews = await db.select({ rating: reviews.rating })
      .from(reviews)
      .where(eq(reviews.productId, productId));

    if (productReviews.length === 0) return 0;
    const sum = productReviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / productReviews.length) * 10) / 10;
  }

  // Coupons
  async getCouponByCode(code: string): Promise<Coupon | undefined> {
    const [coupon] = await db.select().from(coupons)
      .where(and(eq(coupons.code, code.toUpperCase()), eq(coupons.isActive, true)));
    return coupon;
  }

  async validateCoupon(code: string, orderAmount: number): Promise<{ valid: boolean; discount: number; message?: string }> {
    const coupon = await this.getCouponByCode(code);

    if (!coupon) {
      return { valid: false, discount: 0, message: "Invalid coupon code" };
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { valid: false, discount: 0, message: "Coupon has expired" };
    }

    if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
      return { valid: false, discount: 0, message: "Coupon usage limit reached" };
    }

    const minAmount = parseFloat(coupon.minOrderAmount || "0");
    if (orderAmount < minAmount) {
      return { valid: false, discount: 0, message: `Minimum order amount is ₹${minAmount}` };
    }

    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = (orderAmount * parseFloat(coupon.discountValue)) / 100;
    } else {
      discount = parseFloat(coupon.discountValue);
    }

    return { valid: true, discount: Math.min(discount, orderAmount) };
  }

  async incrementCouponUsage(code: string): Promise<void> {
    await db.update(coupons)
      .set({ usageCount: sql`${coupons.usageCount} + 1` })
      .where(eq(coupons.code, code.toUpperCase()));
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    const [newCoupon] = await db.insert(coupons)
      .values({ ...coupon, code: coupon.code.toUpperCase() })
      .returning();
    return newCoupon;
  }

  async getCoupons(): Promise<Coupon[]> {
    return await db.select().from(coupons).orderBy(desc(coupons.createdAt));
  }

  // Admin Stats
  async getAdminStats(): Promise<{ totalRevenue: number; totalOrders: number; totalUsers: number; lowStockCount: number }> {
    const [revenueResult] = await db.select({ total: sql<string>`sum(${orders.totalAmount})` }).from(orders).where(eq(orders.paymentStatus, "paid"));
    const [ordersResult] = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const [usersResult] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [lowStockResult] = await db.select({ count: sql<number>`count(*)` }).from(products).where(sql`${products.stockQuantity} < 10`);

    return {
      totalRevenue: Number(revenueResult?.total || 0),
      totalOrders: Number(ordersResult?.count || 0),
      totalUsers: Number(usersResult?.count || 0),
      lowStockCount: Number(lowStockResult?.count || 0)
    };
  }

  async getDailyRevenue(days: number = 7): Promise<{ date: string; revenue: number }[]> {
    const data = await db.select({
      date: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`,
      revenue: sql<string>`sum(${orders.totalAmount})`
    })
      .from(orders)
      .where(and(
        eq(orders.paymentStatus, 'paid'),
        sql`${orders.createdAt} >= NOW() - INTERVAL '${sql.raw(days.toString())} days'`
      ))
      .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD') DESC`);

    return data.map(d => ({
      date: d.date,
      revenue: Number(d.revenue)
    })).reverse();
  }

  // Address Book
  async getAddresses(userId: number): Promise<Address[]> {
    return await db.select().from(addresses).where(eq(addresses.userId, userId)).orderBy(desc(addresses.createdAt));
  }

  async createAddress(address: InsertAddress): Promise<Address> {
    const [newAddress] = await db.insert(addresses).values(address).returning();
    return newAddress;
  }

  async deleteAddress(userId: number, addressId: number): Promise<void> {
    await db.delete(addresses).where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));
  }
}

export const storage = new DatabaseStorage();
