import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import bcrypt from "bcryptjs";
import { insertUserSchema } from "@shared/schema";

const PostgresStore = connectPg(session);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // === AUTH SETUP ===
  const sessionStore = new PostgresStore({
    pool,
    createTableIfMissing: true,
  });

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "super-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid credentials" });
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid credentials" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // === AUTH ROUTES ===
  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      
      const existing = await storage.getUserByUsername(input.email);
      if (existing) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = await storage.createUser({
        ...input,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) throw err;
        res.status(201).json(user);
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.login.path, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).send();
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.json(null);
    }
  });

  // === PRODUCT ROUTES ===
  app.get(api.products.list.path, async (req, res) => {
    const filters = {
      category: req.query.category as string,
      search: req.query.search as string,
      sort: req.query.sort as string,
    };
    const products = await storage.getProducts(filters);
    res.json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.post(api.products.create.path, async (req, res) => {
    // Only admin/manager should create (middleware check omitted for brevity in MVP)
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (err) {
       if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.products.update.path, async (req, res) => {
     try {
      const input = api.products.update.input.parse(req.body);
      const product = await storage.updateProduct(Number(req.params.id), input);
      if (!product) return res.status(404).json({ message: "Product not found" });
      res.json(product);
    } catch (err) {
       if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.products.delete.path, async (req, res) => {
    await storage.deleteProduct(Number(req.params.id));
    res.status(204).send();
  });

  // === CATEGORY ROUTES ===
  app.get(api.categories.list.path, async (req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  // === HOMEPAGE ROUTES ===
  app.get(api.homepage.get.path, async (req, res) => {
    const homepage = await storage.getHomepageSections();
    res.json(homepage);
  });

  // === CART ROUTES ===
  app.get(api.cart.get.path, async (req, res) => {
    let userId = req.isAuthenticated() ? (req.user as any).id : undefined;
    let sessionId = req.sessionID;
    
    // For MVP simple logic: If logged in use userId, else use sessionId
    const cart = await storage.getCart(userId, userId ? undefined : sessionId);
    res.json(cart);
  });

  app.post(api.cart.add.path, async (req, res) => {
    const { productId, quantity, size, color } = req.body;
    let userId = req.isAuthenticated() ? (req.user as any).id : undefined;
    let sessionId = req.sessionID;
    
    const item = await storage.addToCart({
      userId,
      sessionId: userId ? null : sessionId,
      productId,
      quantity,
      size,
      color
    });
    res.json(item);
  });

  app.patch(api.cart.update.path, async (req, res) => {
    const { quantity } = req.body;
    const item = await storage.updateCartItem(Number(req.params.id), quantity);
    res.json(item);
  });

  app.delete(api.cart.remove.path, async (req, res) => {
    await storage.removeFromCart(Number(req.params.id));
    res.status(204).send();
  });

  // === ORDER ROUTES ===
  app.post(api.orders.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
    
    const userId = (req.user as any).id;
    const { shippingAddress } = req.body;
    
    // Get cart items to convert to order
    const cartItems = await storage.getCart(userId);
    if (cartItems.length === 0) return res.status(400).json({ message: "Cart empty" });
    
    const totalAmount = cartItems.reduce((sum, item) => sum + (Number(item.product.price) * item.quantity), 0);
    
    const order = await storage.createOrder({
      userId,
      totalAmount: totalAmount.toString(),
      shippingAddress
    }, cartItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: Number(item.product.price),
      size: item.size,
      color: item.color
    })));

    // Clear cart (simple implementation: delete items)
    for (const item of cartItems) {
      await storage.removeFromCart(item.id);
    }

    res.status(201).json(order);
  });

  app.get(api.orders.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
    const orders = await storage.getOrders((req.user as any).id);
    res.json(orders);
  });

  // === SEED DATA ===
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingProducts = await storage.getProducts();
  if (existingProducts.length === 0) {
    // Categories
    const men = await storage.createCategory({ name: "Men", slug: "men", description: "Men's Fashion", imageUrl: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&q=80" });
    const women = await storage.createCategory({ name: "Women", slug: "women", description: "Women's Fashion", imageUrl: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&q=80" });
    const accessories = await storage.createCategory({ name: "Accessories", slug: "accessories", description: "Bags & More", imageUrl: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?auto=format&fit=crop&q=80" });

    // Products
    const p1 = await storage.createProduct({
      name: "Classic White Tee",
      description: "Premium cotton essential t-shirt.",
      price: "29.99",
      categoryId: men.id,
      stockQuantity: 100,
      images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80"],
      sizes: ["S", "M", "L", "XL"],
      colors: ["White", "Black"],
      tags: ["essential", "cotton"],
      isFeatured: true,
      showOnHomepage: true
    });

    const p2 = await storage.createProduct({
      name: "Leather Moto Jacket",
      description: "Genuine leather jacket with classic styling.",
      price: "199.99",
      categoryId: men.id,
      stockQuantity: 50,
      images: ["https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&q=80"],
      sizes: ["M", "L", "XL"],
      colors: ["Black"],
      isTrending: true,
      showOnHomepage: true
    });

    const p3 = await storage.createProduct({
      name: "Summer Floral Dress",
      description: "Lightweight and breezy dress for warm days.",
      price: "59.99",
      categoryId: women.id,
      stockQuantity: 75,
      images: ["https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&q=80"],
      sizes: ["XS", "S", "M", "L"],
      colors: ["Floral"],
      isNewArrival: true,
      showOnHomepage: true
    });

    const p4 = await storage.createProduct({
      name: "Leather Crossbody Bag",
      description: "Stylish and functional bag for everyday use.",
      price: "89.99",
      categoryId: accessories.id,
      stockQuantity: 30,
      images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80"],
      colors: ["Brown", "Black"],
      isBestSeller: true,
      showOnHomepage: true
    });

    // Admin User
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await storage.createUser({
      email: "admin@example.com",
      password: hashedPassword,
      name: "Admin User",
      role: "admin"
    });
  }
}
