import { Router, Request, Response } from "express";
import { searchService, syncAllProducts } from "../services/search-service";
import { logger } from "../logger";
import { z } from "zod";

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const searchQuerySchema = z.object({
    q: z.string().min(1, "Search query is required"),
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
    category: z.string().optional(),
    brand: z.string().optional(),
    minPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
    maxPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
    sort: z.enum(["price_asc", "price_desc", "newest", "name"]).optional(),
    inStock: z.string().optional().transform(val => val === "true"),
});

const autocompleteQuerySchema = z.object({
    q: z.string().min(1, "Query is required"),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 5),
});

// ============================================================================
// PUBLIC SEARCH ENDPOINTS
// ============================================================================

/**
 * GET /api/search
 * Full-text search with filters
 */
router.get("/", async (req: Request, res: Response) => {
    try {
        const parsed = searchQuerySchema.safeParse(req.query);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: "Invalid search parameters",
                details: parsed.error.errors,
            });
        }

        const { q, page, limit, category, brand, minPrice, maxPrice, sort, inStock } = parsed.data;

        const result = await searchService.search(q, {
            page,
            limit,
            category,
            brand,
            minPrice,
            maxPrice,
            sort,
            onlyInStock: inStock,
        });

        res.json({
            success: true,
            ...result,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
        });
    } catch (error) {
        logger.error("Search endpoint error:", error);
        res.status(500).json({
            success: false,
            error: "Search failed",
        });
    }
});

/**
 * GET /api/search/autocomplete
 * Quick autocomplete suggestions
 */
router.get("/autocomplete", async (req: Request, res: Response) => {
    try {
        const parsed = autocompleteQuerySchema.safeParse(req.query);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: "Invalid query",
            });
        }

        const { q, limit } = parsed.data;
        const result = await searchService.autocomplete(q, limit);

        res.json({
            success: true,
            ...result,
        });
    } catch (error) {
        logger.error("Autocomplete endpoint error:", error);
        res.status(500).json({
            success: false,
            error: "Autocomplete failed",
        });
    }
});

/**
 * GET /api/search/filters
 * Get available filter options
 */
router.get("/filters", async (_req: Request, res: Response) => {
    try {
        const filterOptions = await searchService.getFilterOptions();

        res.json({
            success: true,
            ...filterOptions,
        });
    } catch (error) {
        logger.error("Filters endpoint error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get filter options",
        });
    }
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * GET /api/search/admin/health
 * Check search engine health
 */
router.get("/admin/health", async (_req: Request, res: Response) => {
    try {
        const healthy = await searchService.isHealthy();
        const stats = healthy ? await searchService.getStats() : null;

        res.json({
            success: true,
            healthy,
            stats,
        });
    } catch (error) {
        logger.error("Search health check error:", error);
        res.status(500).json({
            success: false,
            error: "Health check failed",
        });
    }
});

/**
 * POST /api/search/admin/sync
 * Trigger full product sync to search index
 */
router.post("/admin/sync", async (_req: Request, res: Response) => {
    try {
        logger.info("Manual search sync triggered");

        // Run in background
        syncAllProducts().catch(error => {
            logger.error("Background sync failed:", error);
        });

        res.json({
            success: true,
            message: "Sync started in background",
        });
    } catch (error) {
        logger.error("Sync trigger error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to trigger sync",
        });
    }
});

/**
 * POST /api/search/admin/initialize
 * Initialize search index with proper settings
 */
router.post("/admin/initialize", async (_req: Request, res: Response) => {
    try {
        await searchService.initializeIndex();

        res.json({
            success: true,
            message: "Search index initialized",
        });
    } catch (error) {
        logger.error("Index initialization error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to initialize index",
        });
    }
});

export default router;
