import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import morgan from "morgan";
import helmet from "helmet";
import { logger } from "./logger";

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

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
  contentSecurityPolicy: false, // Disabled for now to prevent breaking scripts/images
}));
app.use("/uploads", express.static("uploads"));

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
  // Apply rate limits
  app.use("/api/auth", authLimiter);

  app.use("/api", apiLimiter);

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

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      logger.info(`serving on port ${port}`);
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
