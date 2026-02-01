import type { Express } from "express";
import { config } from "./config";
import { createServer, type Server } from "http";
import { userRepository } from "./repositories/userRepository";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import bcrypt from "bcryptjs"; // Still used for passport strategy
import { apiLimiter } from "./middleware/rate-limit";
import { globalErrorHandler } from "./middleware/error";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const PostgresStore = connectPg(session);
const scryptAsync = promisify(scrypt);

async function verifyPassword(password: string, hash: string) {
  const [hashed, salt] = hash.split(".");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return buf.toString("hex") === hashed;
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

  // Initialize WebSocket Service
  await import("./services/websocketService").then(m => m.webSocketService.initialize(httpServer));

  app.use(
    session({
      store: sessionStore,
      secret: config.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: config.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await userRepository.findByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid credentials" });
        }
        const isValid = await verifyPassword(password, user.password);
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
      const user = await userRepository.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Apply general API rate limiter to all other API routes
  app.use("/api", apiLimiter);

  // CSRF Protection (after session, before API routes)
  // We need to dynamically import or standard import. Standard is fine if not circular.
  const { csrfMiddleware } = await import("./middleware/csrf");
  app.use("/api", csrfMiddleware); // Apply to all API routes

  // === REGISTER SUB-ROUTERS ===
  // Import routers dynamically to avoid circular dependencies if any
  // But standard import at top is better. For now dynamic or strictly ordered.

  const { authRouter } = await import("./routes/auth");
  const { userRouter } = await import("./routes/user");
  const { productsRouter } = await import("./routes/products");
  const { cartRouter, orderRouter } = await import("./routes/orders");
  const { paymentRouter } = await import("./routes/payments");
  const { adminRouter } = await import("./routes/admin"); // stats
  const { couponsRouter } = await import("./routes/coupons");
  const { commonRouter } = await import("./routes/common");
  const { refundRouter } = await import("./routes/refunds");
  const { heroRouter } = await import("./modules/hero");

  app.use(authRouter);
  app.use(userRouter);
  app.use(productsRouter);
  app.use(cartRouter);
  app.use(orderRouter);
  app.use(paymentRouter);
  app.use(adminRouter);
  app.use(couponsRouter);
  app.use(commonRouter);
  app.use(refundRouter);
  const { reconciliationRouter } = await import("./routes/reconciliation");
  app.use(reconciliationRouter);
  const { webhookMgmtRouter } = await import("./routes/webhook-management");
  app.use(webhookMgmtRouter);
  app.use(heroRouter);
  const { sellerRouter } = await import("./routes/seller");
  app.use(sellerRouter);

  // Reseller Module Routes
  const { resellerRoutes } = await import("./modules/reseller");
  app.use(resellerRoutes);

  // RBAC Management API
  const rbacRouter = (await import("./routes/rbac.routes")).default;
  app.use("/api/admin/rbac", rbacRouter);

  // Phase 3: Search Routes (MeiliSearch)
  const searchRouter = (await import("./routes/search.routes")).default;
  app.use("/api/search", searchRouter);

  // Phase 3: Queue Monitoring Routes
  const queueRouter = (await import("./routes/queue.routes")).default;
  app.use("/api/admin/queues", queueRouter);

  // Phase 3: Backup Management Routes
  const backupRouter = (await import("./routes/backup.routes")).default;
  app.use("/api/admin/backups", backupRouter);

  // Phase 3: Cache Management Routes
  const cacheRouter = (await import("./routes/cache.routes")).default;
  app.use("/api/admin/cache", cacheRouter);

  // Conversion Optimization: Guest Cart Routes
  const { guestCartRouter } = await import("./routes/guest-cart.routes");
  app.use("/api/guest", guestCartRouter);

  // Conversion Optimization: Delivery Estimation Routes
  const deliveryRouter = (await import("./routes/delivery.routes")).default;
  app.use(deliveryRouter);

  // ⚠️ PHASE 2: Coupon Analytics Routes
  const couponAnalyticsRouter = (await import("./routes/coupon-analytics.routes")).default;
  app.use(couponAnalyticsRouter);

  // ⚠️ PHASE 2: Image Management Routes (ImageKit)
  const imageRouter = (await import("./routes/image.routes")).default;
  app.use(imageRouter);

  // ⚠️ PHASE 2: Compliance Routes (GDPR, Data Retention)
  const complianceRouter = (await import("./routes/compliance.routes")).default;
  app.use(complianceRouter);

  // Health Check Routes
  const healthRouter = (await import("./routes/health.routes")).default;
  app.use(healthRouter);

  // Audit Analytics & Monitoring Routes
  const auditAnalyticsRouter = (await import("./routes/audit-analytics.routes")).default;
  app.use(auditAnalyticsRouter);

  // === SEED DATA ===
  // Move seeding to background or manual script to avoid blocking startup
  // import("./lib/seeds").then(m => m.seedDatabase()).catch(console.error);

  // === ERROR HANDLER ===
  app.use(globalErrorHandler);

  return httpServer;
}
