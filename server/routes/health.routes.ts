import { Router, Request, Response } from 'express';
import { checkDatabaseHealth, db } from '../db';
import { catchAsync } from '../utils/catchAsync';
import { cacheService } from '../cache';
import { logger } from '../logger';
import { sql } from 'drizzle-orm';

export const healthRouter = Router();

/**
 * GET /health
 * Basic liveness probe - always returns 200 OK
 */
healthRouter.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

/**
 * GET /health/database
 * Database health check including replica
 */
healthRouter.get('/health/database', catchAsync(async (req: Request, res: Response) => {
    const health = await checkDatabaseHealth();

    const isHealthy = health.primary && health.replica;
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
        status: isHealthy ? 'healthy' : 'degraded',
        primary: health.primary,
        replica: health.replica,
        replicaLagMs: health.replicaLag,
        timestamp: new Date().toISOString()
    });
}));

/**
 * GET /health/ready
 * Readiness probe - checks all critical dependencies
 * Returns 200 if all systems operational, 503 if any system is down
 */
healthRouter.get('/ready', catchAsync(async (req: Request, res: Response) => {
    const checks = {
        database: false,
        redis: false,
        meilisearch: false,
        circuits: {
            payment: 'CLOSED',
            email: 'CLOSED',
            search: 'CLOSED',
            push: 'CLOSED'
        }
    };

    let allHealthy = true;

    // 1. Check PostgreSQL
    try {
        await db.execute(sql`SELECT 1`);
        checks.database = true;
    } catch (error) {
        logger.error("Database readiness check failed:", error);
        allHealthy = false;
    }

    // 2. Check Redis (Upstash)
    try {
        const pingResult = await cacheService.ping();
        checks.redis = pingResult;
        if (!pingResult) allHealthy = false;
    } catch (error) {
        logger.error("Redis readiness check failed:", error);
        checks.redis = false;
        allHealthy = false;
    }

    // 3. Check MeiliSearch
    try {
        const { searchService } = await import("../services/search-service");
        const isHealthy = await searchService.isHealthy();
        checks.meilisearch = isHealthy;

        // Check circuit status
        if (searchService.searchBreaker && searchService.searchBreaker.opened) {
            checks.circuits.search = 'OPEN';
        }

        if (!isHealthy) allHealthy = false;
    } catch (error) {
        logger.error("MeiliSearch readiness check failed:", error);
        checks.meilisearch = false;
        // Don't mark unhealthy just for search if DB is fine, but for ready probe usually stricter
        allHealthy = false;
    }

    // 4. Check Circuit Breakers (Critical Services)
    try {
        const { paymentService } = await import("../services/payments");
        const { emailService } = await import("../services/email");
        const { pushNotificationService } = await import("../services/pushNotificationService");

        // Payment (Critical)
        if (paymentService.breakers.createOrder.opened) {
            checks.circuits.payment = 'OPEN';
            allHealthy = false; // Payment down = system degraded
        }

        // Email (Important but fallback exists)
        if (emailService.breaker && (emailService.breaker as any).opened) {
            checks.circuits.email = 'OPEN';
            // Degraded but maybe not 503? Let's keep strict for now or allow partial
        }

        // Push (Non-critical)
        if (pushNotificationService.breaker && (pushNotificationService.breaker as any).opened) {
            checks.circuits.push = 'OPEN';
        }

    } catch (error) {
        logger.error("Circuit breaker check failed:", error);
    }

    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json({
        status: allHealthy ? 'ready' : 'degraded',
        timestamp: new Date().toISOString(),
        checks,
    });
}));

/**
 * GET /health/metrics
 * Basic application metrics for monitoring
 */
healthRouter.get('/metrics', catchAsync(async (req: Request, res: Response) => {
    try {
        const { searchService } = await import("../services/search-service");
        const searchStats = await searchService.getStats();

        // Get basic DB stats with proper typing
        const userResult = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
        const productResult = await db.execute(sql`SELECT COUNT(*) as count FROM products`);
        const orderResult = await db.execute(sql`SELECT COUNT(*) as count FROM orders`);

        const userCount = (userResult.rows[0] as any)?.count || 0;
        const productCount = (productResult.rows[0] as any)?.count || 0;
        const orderCount = (orderResult.rows[0] as any)?.count || 0;

        res.json({
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                unit: 'MB'
            },
            database: {
                users: userCount,
                products: productCount,
                orders: orderCount,
            },
            search: searchStats,
        });
    } catch (error) {
        logger.error("Metrics endpoint error:", error);
        res.status(500).json({ error: "Failed to collect metrics" });
    }
}));

export default healthRouter;
