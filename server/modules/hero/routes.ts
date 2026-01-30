import { Router, Request, Response, NextFunction } from "express";
import { heroCampaignRepository } from "./repository";
import { heroService } from "./service";
import { insertHeroCampaignSchema, heroAnalytics, insertHeroAnalyticsSchema } from "@shared/schema";
import { z } from "zod";
import { logger } from "../../logger";
import { db } from "../../db";

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Cache entry for hero configuration
 */
interface CacheEntry {
    data: unknown;
    timestamp: number;
}

/**
 * Cache configuration
 */
interface CacheConfig {
    ttlMs: number;
}

// ============================================================================
// Constants
// ============================================================================

const CACHE_CONFIG: CacheConfig = {
    ttlMs: 60 * 1000, // 60 seconds
};

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Context-aware cache for hero configuration
 * Separate cache entries for guest vs authenticated users
 */
class HeroCache {
    private cache = new Map<string, CacheEntry>();

    /**
     * Generate cache key based on user context
     */
    getKey(isLoggedIn: boolean): string {
        return isLoggedIn ? 'hero:auth' : 'hero:guest';
    }

    /**
     * Get cached data if valid
     */
    get(key: string): unknown | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() - entry.timestamp > CACHE_CONFIG.ttlMs) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    /**
     * Set cache entry
     */
    set(key: string, data: unknown): void {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    /**
     * Invalidate all cache entries
     */
    invalidate(): void {
        this.cache.clear();
        logger.info("Hero Cache: All entries invalidated");
    }

    /**
     * Get cache statistics for monitoring
     */
    getStats(): { size: number; ttlSeconds: number } {
        return {
            size: this.cache.size,
            ttlSeconds: CACHE_CONFIG.ttlMs / 1000,
        };
    }
}

// ============================================================================
// Router Setup
// ============================================================================

export const heroRouter = Router();
const heroCache = new HeroCache();

// ============================================================================
// Public Endpoints
// ============================================================================

/**
 * GET /api/hero
 * Public endpoint to fetch the active hero campaign configuration
 * 
 * Features:
 * - Context-aware caching (guest vs auth)
 * - Kill switch support via environment variable
 * - Observability logging
 */
heroRouter.get("/api/hero", async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Kill switch for maintenance mode
        if (process.env.HERO_FORCE_DEFAULT === 'true') {
            logger.warn("Hero System: FORCE_DEFAULT enabled (maintenance mode)");
            return res.json(null);
        }

        const isLoggedIn = req.isAuthenticated?.() ?? false;
        const cacheKey = heroCache.getKey(isLoggedIn);

        // Check cache first
        const cachedData = heroCache.get(cacheKey);
        if (cachedData) {
            logger.debug({ message: "Hero cache HIT", userType: isLoggedIn ? 'auth' : 'guest' });
            res.setHeader('Cache-Control', `public, max-age=${CACHE_CONFIG.ttlMs / 1000}`);
            return res.json(cachedData);
        }

        // Find active campaign
        const campaign = await heroService.getActiveCampaign(isLoggedIn);

        if (!campaign) {
            logger.info({
                message: "Hero System: No active campaign found",
                isLoggedIn,
                reason: "No campaign matches current time window and audience filter"
            });
            return res.json(null);
        }

        logger.info({
            message: "Hero System: Campaign selected",
            campaignId: campaign.id,
            campaignName: campaign.name,
            priority: (campaign as unknown as { type: string }).type,
            isLoggedIn,
        });

        // Cache the response
        heroCache.set(cacheKey, campaign);

        // Set browser cache headers
        res.setHeader('Cache-Control', `public, max-age=${CACHE_CONFIG.ttlMs / 1000}`);
        res.json(campaign);
    } catch (error) {
        logger.error({ message: "Hero System error", error });
        next(error);
    }
});

/**
 * POST /api/hero/analytics
 * Track campaign impressions and clicks
 * 
 * Features:
 * - Fire-and-forget for high performance
 * - Async processing to avoid blocking response
 */
heroRouter.post("/api/hero/analytics", async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Respond immediately (fire and forget)
        res.status(202).json({ status: "accepted" });

        // Process analytics asynchronously
        const data = insertHeroAnalyticsSchema.parse(req.body);

        db.insert(heroAnalytics)
            .values(data)
            .catch((error) => {
                logger.error({ message: "Analytics insert failed", error });
            });
    } catch (error) {
        // Log but don't fail the request
        if (!res.headersSent) {
            logger.error({ message: "Analytics validation error", error });
            next(error);
        } else {
            logger.error({ message: "Analytics validation error (post-response)", error });
        }
    }
});

// ============================================================================
// Admin Endpoints
// ============================================================================

const adminHeroRouter = Router();

/**
 * GET /api/admin/hero
 * List all campaigns
 */
adminHeroRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const campaigns = await heroService.getAllCampaigns();
        res.json(campaigns);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/hero
 * Create new campaign
 */
adminHeroRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = insertHeroCampaignSchema.parse(req.body);
        const campaign = await heroService.createCampaign(data);

        heroCache.invalidate();
        res.status(201).json(campaign);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/admin/hero/:id
 * Update campaign
 */
adminHeroRouter.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id as string, 10);
        const data = insertHeroCampaignSchema.partial().parse(req.body);
        const campaign = await heroService.updateCampaign(id, data);

        if (campaign) {
            heroCache.invalidate();
            res.json(campaign);
        } else {
            res.status(404).json({ message: "Campaign not found" });
        }
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/admin/hero/:id
 * Delete campaign
 * Protected: Cannot delete default campaigns
 */
adminHeroRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id as string, 10);
        const result = await heroService.deleteCampaign(id);

        if (result.success) {
            heroCache.invalidate();
            res.sendStatus(204);
        } else {
            res.status(400).json({ message: result.error });
        }
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// Auth Middleware
// ============================================================================

/**
 * Admin authentication middleware
 * Ensures only admins can access campaign management endpoints
 */
heroRouter.use(
    "/api/admin/hero",
    (req: Request, res: Response, next: NextFunction) => {
        const isAuthenticated = req.isAuthenticated?.() ?? false;
        const userRole = (req.user as { role?: string } | undefined)?.role;

        if (isAuthenticated && (userRole === 'admin' || userRole === 'manager')) {
            return next();
        }

        res.status(403).json({ message: "Forbidden: Admin access required" });
    },
    adminHeroRouter
);

