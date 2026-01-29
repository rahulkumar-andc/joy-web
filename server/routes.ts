import type { Express, Request, Response, NextFunction } from "express";
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
import { cacheService, CacheKeys } from "./cache";
import { logger } from "./logger";
import { upload } from "./upload";
import { parseCsv } from "./lib/csv";

import { insertProductSchema, insertAddressSchema } from "@shared/schema";
import fs from "fs";
import { emailService } from "./services/email";

import { apiLimiter, authLimiter } from "./middleware/rate-limit";

const PostgresStore = connectPg(session);

// Auth Middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}

// Admin Middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && (req.user as any)?.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Admin access required" });
}

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
  app.post(api.auth.register.path, authLimiter, async (req, res) => {
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
        // Send Welcome Email
        emailService.sendWelcomeEmail({ email: user.email, name: user.name });
        res.status(201).json(user);
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });



  app.post(api.auth.login.path, authLimiter, (req, res, next) => {
    try {
      api.auth.login.input.parse(req.body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
    }
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

  // === FORGOT PASSWORD ===
  app.post(api.auth.forgotPassword.path, authLimiter, async (req, res) => {
    try {
      const { email } = api.auth.forgotPassword.input.parse(req.body);
      const user = await storage.getUserByUsername(email);

      if (!user) {
        // Don't reveal if email exists
        return res.json({ message: "If that email exists, a reset link will be sent" });
      }

      const token = await storage.createPasswordResetToken(user.id);

      // For MVP: log to console (in production, send email)
      logger.info(`\n=== PASSWORD RESET TOKEN ===`);
      logger.info(`Email: ${email}`);
      logger.info(`Token: ${token}`);
      logger.info(`Reset URL: http://localhost:5000/auth?reset=${token}`);
      logger.info(`===========================\n`);

      // Send Email
      await emailService.sendPasswordReset({ email: user.email }, token);

      res.json({ message: "If that email exists, a reset link will be sent" });
    } catch (e) {
      res.status(400).json({ message: "Invalid request" });
    }
  });



  app.post(api.auth.resetPassword.path, authLimiter, async (req, res) => {
    try {
      const { token, password } = api.auth.resetPassword.input.parse(req.body);

      const tokenRecord = await storage.validateResetToken(token);
      if (!tokenRecord) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updateUserPassword(tokenRecord.userId, hashedPassword);
      await storage.deleteResetToken(token);

      res.json({ message: "Password reset successfully" });
    } catch (e) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Apply general API rate limiter to all other API routes
  // Note: We apply it here so it doesn't affect the specific auth routes above which have their own stricter limits
  // But wait, express middlewares run in order.
  // Actually, for specific route handlers (like above), those middlewares run for that route.
  // For global, we should use app.use.
  // Ideally, put this BEFORE other API routes but AFTER auth if we want auth to be special.
  // However, simpler is:
  app.use("/api", apiLimiter);

  // === PROFILE ROUTES ===
  app.get(api.profile.get.path, requireAuth, async (req, res) => {
    const user = await storage.getUser((req.user as any).id);
    if (!user) return res.status(401).json({ message: "User not found" });
    res.json(user);
  });

  app.patch(api.profile.update.path, requireAuth, async (req, res) => {
    try {
      const data = api.profile.update.input.parse(req.body);
      const userId = (req.user as any).id;
      const updated = await storage.updateUser(userId, data);
      if (!updated) return res.status(401).json({ message: "User not found" });
      res.json(updated);
    } catch (e) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post(api.profile.changePassword.path, requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = api.profile.changePassword.input.parse(req.body);
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);

      if (!user) return res.status(401).json({ message: "User not found" });

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) return res.status(400).json({ message: "Current password is incorrect" });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(userId, hashedPassword);

      res.json({ message: "Password changed successfully" });
    } catch (e) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // === ADDRESS ROUTES ===
  app.get("/api/user/addresses", requireAuth, async (req, res) => {
    const userId = (req.user as any).id;
    const addresses = await storage.getAddresses(userId);
    res.json(addresses);
  });

  app.post("/api/user/addresses", requireAuth, async (req, res) => {
    try {
      const input = insertAddressSchema.parse({ ...req.body, userId: (req.user as any).id });
      const address = await storage.createAddress(input);
      res.status(201).json(address);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create address" });
    }
  });

  app.delete("/api/user/addresses/:id", requireAuth, async (req, res) => {
    const userId = (req.user as any).id;
    const addressId = parseInt(req.params.id as string);
    await storage.deleteAddress(userId, addressId);
    res.status(204).send();
  });



  // === PRODUCT ROUTES ===
  app.get(api.products.list.path, async (req, res) => {
    const getQueryParam = (param: unknown): string | undefined => {
      if (typeof param === 'string') return param;
      return undefined;
    };

    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;

    const filters = {
      category: getQueryParam(req.query.category),
      search: getQueryParam(req.query.search),
      sort: getQueryParam(req.query.sort),
      page,
      limit
    };

    const cacheKey = CacheKeys.PRODUCTS_LIST(page, limit, JSON.stringify(filters));
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const result = await storage.getProducts(filters);
    await cacheService.set(cacheKey, result, 60); // Cache for 1 minute (stock changes frequently)
    res.json(result); // Returns { products, total }
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.post(api.products.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      await cacheService.invalidateProducts(); // Invalidate list cache
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.products.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.products.update.input.parse(req.body);
      const product = await storage.updateProduct(Number(req.params.id), input);
      if (!product) return res.status(404).json({ message: "Product not found" });
      await cacheService.invalidateProducts();
      res.json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.products.delete.path, requireAdmin, async (req, res) => {
    await storage.deleteProduct(Number(req.params.id));
    await cacheService.invalidateProducts();
    res.status(204).send();
  });

  // === CATEGORY ROUTES ===
  app.get(api.categories.list.path, async (req, res) => {
    const cached = await cacheService.get(CacheKeys.CATEGORIES);
    if (cached) return res.json(cached);

    const categories = await storage.getCategories();
    await cacheService.set(CacheKeys.CATEGORIES, categories, 3600); // 1 hour
    res.json(categories);
  });

  // === HOMEPAGE ROUTES ===
  app.get(api.homepage.get.path, async (req, res) => {
    const cached = await cacheService.get(CacheKeys.HOMEPAGE);
    if (cached) return res.json(cached);

    const homepage = await storage.getHomepageSections();
    await cacheService.set(CacheKeys.HOMEPAGE, homepage, 300); // 5 minutes
    res.json(homepage);
  });

  // === CART ROUTES ===
  app.get(api.cart.get.path, async (req, res) => {


    let userId = req.isAuthenticated() ? (req.user as any).id : undefined;
    let sessionId = req.sessionID;

    // For MVP simple logic: If logged in use userId, else use sessionId
    const cart = await storage.getCart(userId, userId ? undefined : sessionId);
    // Map to expected schema: { item, product }
    res.json(cart.map((c: any) => ({ item: c, product: c.product })));
  });

  app.post(api.cart.add.path, async (req, res) => {
    try {
      const { productId, quantity, size, color } = api.cart.add.input.parse(req.body);
      let userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      let sessionId = req.sessionID;

      const item = await storage.addToCart({
        userId,
        sessionId: userId ? null : sessionId,
        productId,
        quantity,
        size: size || null,
        color: color || null
      });
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.cart.update.path, async (req, res) => {
    try {
      const { quantity } = api.cart.update.input.parse(req.body);
      const item = await storage.updateCartItem(Number(req.params.id), quantity);
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.cart.remove.path, async (req, res) => {
    await storage.removeFromCart(Number(req.params.id));
    res.status(204).send();
  });

  // === ORDER ROUTES ===
  app.post(api.orders.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });

    try {
      const { shippingAddress } = api.orders.create.input.parse(req.body);
      const userId = (req.user as any).id;

      // Get cart items to convert to order
      const cartItems = await storage.getCart(userId);
      if (cartItems.length === 0) return res.status(400).json({ message: "Cart empty" });

      const totalAmount = cartItems.reduce((sum: number, item: any) => sum + (Number(item.product.price) * item.quantity), 0);

      const order = await storage.createOrder({
        userId,
        totalAmount: totalAmount.toString(),
        shippingAddress
      }, cartItems.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: Number(item.product.price),
        size: item.size ?? undefined,
        color: item.color ?? undefined
      })));

      // Clear cart (simple implementation: delete items)
      for (const item of cartItems) {
        await storage.removeFromCart(item.id);
      }

      // Send Order Confirmation
      emailService.sendOrderConfirmation(
        { email: (req.user as any).email, name: (req.user as any).name },
        { id: order.id, totalAmount: order.totalAmount, items: cartItems }
      );

      res.status(201).json(order);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.orders.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });

    if ((req.user as any).role === 'admin') {
      const orders = await storage.getAllOrders();
      return res.json(orders);
    }

    const orders = await storage.getOrders((req.user as any).id);
    res.json(orders);
  });

  // Admin: Update Order Status
  app.patch("/api/orders/:id/status", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const { status } = req.body;

    if (!["pending", "paid", "shipped", "delivered", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updated = await storage.updateOrderStatus(id, status);
    if (!updated) return res.status(404).json({ message: "Order not found" });

    res.json(updated);
  });

  // === WISHLIST ROUTES ===
  app.get(api.wishlist.get.path, requireAuth, async (req, res) => {
    const items = await storage.getWishlist((req.user as any).id);
    res.json(items.map((i: any) => ({ item: i, product: i.product })));
  });

  app.post(api.wishlist.add.path, requireAuth, async (req, res) => {
    const { productId } = api.wishlist.add.input.parse(req.body);
    const item = await storage.addToWishlist((req.user as any).id, productId);
    res.json(item);
  });

  app.delete("/api/wishlist/:productId", requireAuth, async (req, res) => {
    await storage.removeFromWishlist((req.user as any).id, parseInt(req.params.productId as string));
    res.status(204).send();
  });

  app.get("/api/wishlist/check/:productId", requireAuth, async (req, res) => {
    const inWishlist = await storage.isInWishlist((req.user as any).id, parseInt(req.params.productId as string));
    res.json({ inWishlist });
  });

  // === REVIEWS ROUTES ===
  app.get("/api/products/:productId/reviews", async (req, res) => {
    const reviews = await storage.getProductReviews(parseInt(req.params.productId as string));
    const reviewData = reviews.map((r: any) => ({
      ...r,
      user: { name: r.user.name }
    }));
    res.json(reviewData);
  });

  app.post("/api/products/:productId/reviews", requireAuth, async (req, res) => {
    const input = api.reviews.create.input.parse(req.body);
    const review = await storage.createReview({
      userId: (req.user as any).id,
      productId: parseInt(req.params.productId as string),
      rating: input.rating,
      comment: input.comment,
    });
    res.status(201).json(review);
  });

  app.get("/api/products/:productId/rating", async (req, res) => {
    const productId = parseInt(req.params.productId as string);
    const rating = await storage.getProductAverageRating(productId);
    const reviews = await storage.getProductReviews(productId);
    res.json({ rating, count: reviews.length });
  });

  // === COUPONS ROUTES ===
  app.post(api.coupons.validate.path, async (req, res) => {
    const { code, orderAmount } = api.coupons.validate.input.parse(req.body);
    const result = await storage.validateCoupon(code, orderAmount);
    res.json(result);
  });

  app.post(api.coupons.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.coupons.create.input.parse(req.body);
      const coupon = await storage.createCoupon(input);
      res.status(201).json(coupon);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create coupon" });
    }
  });

  app.get(api.coupons.list.path, requireAdmin, async (req, res) => {
    const coupons = await storage.getCoupons();
    res.json(coupons);
  });

  // === ADMIN STATS ===
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get("/api/admin/analytics/revenue", requireAdmin, async (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const data = await storage.getDailyRevenue(days);
      res.json(data);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch revenue stats" });
    }
  });

  // === IMAGE UPLOAD ===
  app.post("/api/upload", requireAdmin, upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });

  // === BULK IMPORT ===
  app.post("/api/products/bulk", requireAdmin, upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No CSV file uploaded" });
    }

    try {
      const buffer = await fs.promises.readFile(req.file.path);
      const rows = await parseCsv(buffer);

      const successful = [];
      const failed = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          // Normalization: Ensure numeric fields are numbers, arrays are arrays
          const productData = {
            ...row,
            price: row.price?.toString(),
            stockQuantity: Number(row.stockQuantity) || 0,
            images: typeof row.images === 'string' ? row.images.split(',').map((s: string) => s.trim()) : row.images,
            categoryId: Number(row.categoryId) || undefined,
            id: undefined, // ensure no ID override
            createdAt: undefined
          };

          const validated = insertProductSchema.parse(productData);
          successful.push(validated);
        } catch (err: any) {
          failed.push({ row: i + 2, error: err.issues?.[0]?.message || err.message, data: row });
        }
      }

      if (successful.length > 0) {
        await storage.createProductsBulk(successful);
        await cacheService.invalidateProducts();
      }

      // Cleanup uploaded file
      await fs.promises.unlink(req.file.path);

      res.json({
        importedCount: successful.length,
        failedCount: failed.length,
        failedDetails: failed
      });

    } catch (err) {
      logger.error("Bulk import failed: " + err);
      res.status(500).json({ message: "Failed to process CSV file" });
    }
  });

  // === SEED DATA ===
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingProducts = await storage.getProducts();
  if (existingProducts.total === 0) {
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
