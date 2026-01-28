import { 
  users, products, categories, homepageSections, homepageSectionItems, 
  cartItems, orders, orderItems, reviews,
  type User, type InsertUser, type Product, type InsertProduct, 
  type Category, type InsertCategory, type HomepageSection, 
  type CartItem, type Order, type InsertProduct as InsertProductType
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Products
  getProducts(filters?: { category?: string; search?: string; sort?: string }): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
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
  getOrders(userId: number): Promise<Order[]>;
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

  // Products
  async getProducts(filters?: { category?: string; search?: string; sort?: string }): Promise<Product[]> {
    let query = db.select().from(products);
    
    // Join with categories if filtering by category slug? Or just by ID? 
    // If category is a slug, we need to join.
    if (filters?.category) {
       // Ideally we'd join, but for simplicity let's first get category id
       const [cat] = await db.select().from(categories).where(eq(categories.slug, filters.category));
       if (cat) {
         query.where(eq(products.categoryId, cat.id));
       }
    }

    if (filters?.search) {
      query.where(ilike(products.name, `%${filters.search}%`));
    }

    if (filters?.sort === 'price_asc') {
      query.orderBy(products.price);
    } else if (filters?.sort === 'price_desc') {
      query.orderBy(desc(products.price));
    } else {
      query.orderBy(desc(products.createdAt));
    }

    return await query;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
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
}

export const storage = new DatabaseStorage();
