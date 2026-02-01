import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import morgan from "morgan";
import helmet from "helmet";
import { logger } from "./logger";
import { initSentry, Sentry } from "./config/sentry";
import { correlationIdMiddleware } from "./middleware/correlationId";
import { validateEnvOrExit } from "./config/env-validation";

// Validate environment variables FIRST
validateEnvOrExit();

// Initialize Sentry (after env validation)
initSentry();

// Initialize Sentry (after env validation)
initSentry();

export const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Sentry request tracking is automatic in v10 if configured in initSentry
// No need for Handlers.requestHandler() or tracingHandler() individually
app.use(correlationIdMiddleware);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Razorpay widget
        "https://checkout.razorpay.com",
        "https://*.razorpay.com"
      ],
      frameSrc: [
        "'self'",
        "https://api.razorpay.com" // Razorpay payment modal
      ],
      imgSrc: [
        "'self'",
        "data:", // For base64 images
        "https:", // Allow all HTTPS images (product images, CDN)
        "blob:" // For dynamically generated images
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'" // Required for dynamic styles
      ],
      connectSrc: [
        "'self'",
        "https://api.razorpay.com", // Razorpay API
        "https://lumberjack.razorpay.com" // Razorpay analytics
      ],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null
    }
  }
}));
// Static cache headers for uploads
import { uploadsCacheMiddleware } from "./middleware/static-cache";
app.use("/uploads", uploadsCacheMiddleware, express.static("uploads"));

// Replace custom logging middleware with Morgan
const morganFormat = ":method :url :status :response-time ms";

app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const [method, url, status, responseTime] = message.trim().split(" ");
        const level = parseInt(status) >= 400 ? "warn" : "http";
        logger.log(level, message.trim());
      },
    },
    skip: (req) => req.url.startsWith("/api/debug"), // Optional skip
  })
);

import { apiLimiter, authLimiter } from "./middleware/rate-limit";

(async () => {
  // Security Check: API Key & Secret Validation
  if (process.env.NODE_ENV === "production") {
    const razorpayKey = process.env.RAZORPAY_KEY_ID || "";
    if (razorpayKey.startsWith("rzp_test_")) {
      logger.warn("CRITICAL SECURITY WARNING: Using Razorpay TEST keys in PRODUCTION environment!");
    }
  }

  // Register API Routes
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error(`Internal Server Error: ${err.message}`, { stack: err.stack });

    if (res.headersSent) {
      return next(err);
    }

    // Hide stack trace in production
    const response = process.env.NODE_ENV === "production"
      ? { message }
      : { message, stack: err.stack };

    return res.status(status).json(response);
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      logger.info(`serving on port ${port}`);

      // 🚀 BACKGROUND BOOTSTRAP: Execute heavy tasks AFTER server is up
      (async () => {
        if (process.env.NODE_ENV !== "test") {
          try {
            const { userCleanupService } = await import("./services/cleanupService");
            userCleanupService.start();

            const { JobService } = await import("./services/jobService");
            JobService.init();

            const { initHeroSystem } = await import("./modules/hero");
            await initHeroSystem();

            const { warmCache } = await import("./cache");
            await warmCache();

            const { campaignScheduler } = await import("./modules/hero/scheduler");
            campaignScheduler.start();

            logger.info("✅ Background services and cache warming complete");
          } catch (bgError) {
            logger.error("Background bootstrap failed:", bgError);
          }
        }
      })();
    }
  );

  // Graceful Shutdown
  const shutdown = () => {
    logger.info("SIGTERM/SIGINT received. Shutting down gracefully...");
    httpServer.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
})();
