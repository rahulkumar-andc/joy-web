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
  app.use(heroRouter);
  const { sellerRouter } = await import("./routes/seller");
  app.use(sellerRouter);


  // === SEED DATA ===
  await import("./lib/seeds").then(m => m.seedDatabase());

  // === ERROR HANDLER ===
  app.use(globalErrorHandler);

  return httpServer;
}
