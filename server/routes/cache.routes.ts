import { Router, Request, Response } from "express";
import { cacheService, warmCache, CacheKeys } from "../cache";
import { logger } from "../logger";

const router = Router();

/**
 * GET /api/admin/cache/health
 * Check cache system health
 */
router.get("/health", async (_req: Request, res: Response) => {
    try {
        const isHealthy = await cacheService.ping();

        res.json({
            success: true,
            healthy: isHealthy,
            status: isHealthy ? "connected" : "disconnected",
        });
    } catch (error) {
        logger.error("Cache health check error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to check cache health",
        });
    }
});

/**
 * POST /api/admin/cache/warm
 * Trigger cache warming manually
 */
router.post("/warm", async (_req: Request, res: Response) => {
    try {
        logger.info("Manual cache warming triggered");
        const startTime = Date.now();

        await warmCache();

        const duration = Date.now() - startTime;

        res.json({
            success: true,
            message: "Cache warmed successfully",
            duration: `${duration}ms`,
        });
    } catch (error) {
        logger.error("Cache warming error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to warm cache",
        });
    }
});

/**
 * DELETE /api/admin/cache/flush
 * Flush entire cache (use with caution)
 */
router.delete("/flush", async (req: Request, res: Response) => {
    const { confirm } = req.body;

    if (confirm !== "FLUSH_ALL_CACHE") {
        return res.status(400).json({
            success: false,
            error: "Flush requires confirmation",
            message: "Send body: { confirm: 'FLUSH_ALL_CACHE' }",
        });
    }

    try {
        logger.warn("Cache flush requested");
        await cacheService.flush();

        res.json({
            success: true,
            message: "Cache flushed successfully",
        });
    } catch (error) {
        logger.error("Cache flush error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to flush cache",
        });
    }
});

/**
 * DELETE /api/admin/cache/invalidate/products
 * Invalidate all product-related cache
 */
router.delete("/invalidate/products", async (_req: Request, res: Response) => {
    try {
        await cacheService.del(CacheKeys.CATEGORIES);
        await cacheService.del(CacheKeys.PRODUCTS_LIST(1, 50, ""));

        res.json({
            success: true,
            message: "Product cache invalidated",
        });
    } catch (error) {
        logger.error("Product cache invalidation error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to invalidate product cache",
        });
    }
});

/**
 * DELETE /api/admin/cache/invalidate/product/:id
 * Invalidate specific product cache
 */
router.delete("/invalidate/product/:id", async (req: Request, res: Response) => {
    const productId = parseInt(req.params.id as string);

    if (isNaN(productId)) {
        return res.status(400).json({
            success: false,
            error: "Invalid product ID",
        });
    }

    try {
        await cacheService.invalidateProduct(productId);

        res.json({
            success: true,
            message: `Product ${productId} cache invalidated`,
        });
    } catch (error) {
        logger.error("Product cache invalidation error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to invalidate product cache",
        });
    }
});

/**
 * DELETE /api/admin/cache/invalidate/category/:slug
 * Invalidate specific category cache
 */
router.delete("/invalidate/category/:slug", async (req: Request, res: Response) => {
    const slug = req.params.slug as string;

    try {
        await cacheService.invalidateCategory(slug);

        res.json({
            success: true,
            message: `Category ${slug} cache invalidated`,
        });
    } catch (error) {
        logger.error("Category cache invalidation error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to invalidate category cache",
        });
    }
});

export default router;
