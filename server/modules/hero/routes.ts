import { Router, Request, Response, NextFunction } from "express";
import { heroCampaignRepository } from "./repository";
import { heroService } from "./service";
import { insertHeroCampaignSchema, heroAnalytics, insertHeroAnalyticsSchema } from "@shared/schema";
import { z } from "zod";
import { logger } from "../../logger";
import { db } from "../../db";
import { upload } from "../../upload";

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

/**
 * Edge Cache Headers for CDN (Cloudflare, Vercel, etc.)
 * - s-maxage: CDN cache duration
 * - stale-while-revalidate: Serve stale while fetching fresh
 */
const EDGE_CACHE_HEADERS = {
    public: 'public, s-maxage=60, stale-while-revalidate=300',
    private: 'private, no-cache',
    noStore: 'no-store, must-revalidate',
} as const;

/**
 * Add cache invalidation signal via header
 * CDN can watch for this and purge cache
 */
const CACHE_TAG = 'hero-campaigns';

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
            // Edge cache headers for CDN
            res.setHeader('Cache-Control', EDGE_CACHE_HEADERS.public);
            res.setHeader('CDN-Cache-Control', EDGE_CACHE_HEADERS.public);
            res.setHeader('Surrogate-Control', 'max-age=60');
            res.setHeader('Cache-Tag', CACHE_TAG);
            res.setHeader('X-Cache', 'HIT');
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

        // Edge cache headers for CDN
        res.setHeader('Cache-Control', EDGE_CACHE_HEADERS.public);
        res.setHeader('CDN-Cache-Control', EDGE_CACHE_HEADERS.public);
        res.setHeader('Surrogate-Control', 'max-age=60');
        res.setHeader('Cache-Tag', CACHE_TAG);
        res.setHeader('X-Cache', 'MISS');
        res.json(campaign);
    } catch (error) {
        logger.error({ message: "Hero System error", error });
        next(error);
    }
});

/**
 * GET /api/hero/carousel
 * Public endpoint to fetch ALL active hero campaigns for the carousel
 */
heroRouter.get("/api/hero/carousel", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (process.env.HERO_FORCE_DEFAULT === 'true') {
            return res.json([]);
        }

        const isLoggedIn = req.isAuthenticated?.() ?? false;
        // We could cache this separately, e.g., 'hero:carousel:auth'

        const campaigns = await heroService.getActiveCampaigns(isLoggedIn);

        // Edge cache headers
        res.setHeader('Cache-Control', EDGE_CACHE_HEADERS.public);
        res.setHeader('CDN-Cache-Control', EDGE_CACHE_HEADERS.public);
        res.setHeader('Surrogate-Control', 'max-age=60');
        res.setHeader('Cache-Tag', CACHE_TAG);
        res.json(campaigns);
    } catch (error) {
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
 * List all campaigns with analytics
 */
adminHeroRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const campaigns = await heroService.getAllCampaignsWithStats();
        res.json(campaigns);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/hero
 * Create new campaign with optional file upload
 */
adminHeroRouter.post("/", upload.single("mediaFile"), async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Prepare data from body (multipart adds fields to body)
        const rawData = { ...req.body };

        // Handle file upload
        if (req.file) {
            rawData.mediaSource = "upload";
            // Construct public URL
            rawData.mediaUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
            rawData.mediaFilePath = req.file.path; // Store internal path
        }

        // Numeric conversion for multipart fields
        if (rawData.priority) rawData.priority = parseInt(rawData.priority, 10);
        if (rawData.isActive) rawData.isActive = rawData.isActive === 'true';

        const data = insertHeroCampaignSchema.parse(rawData);
        const campaign = await heroService.createCampaign(data);

        heroCache.invalidate();
        // Signal CDN to purge cache
        res.setHeader('Cache-Tag', CACHE_TAG);
        res.setHeader('X-Cache-Invalidate', CACHE_TAG);
        res.status(201).json(campaign);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/admin/hero/:id
 * Update campaign with optional file upload
 */
adminHeroRouter.put("/:id", upload.single("mediaFile"), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id as string, 10);

        // Prepare data from body
        const rawData = { ...req.body };

        // Handle file upload
        if (req.file) {
            rawData.mediaSource = "upload";
            rawData.mediaUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
            rawData.mediaFilePath = req.file.path;
        }

        // Numeric/Boolean conversion for multipart fields if they exist
        if (rawData.priority !== undefined) rawData.priority = parseInt(rawData.priority, 10);
        if (rawData.isActive !== undefined) rawData.isActive = rawData.isActive === 'true';

        // Clean empty strings for optional fields which might come as "" from FormData
        if (rawData.subtitle === "") rawData.subtitle = null;
        if (rawData.ctaLabel === "") rawData.ctaLabel = null;
        if (rawData.ctaUrl === "") rawData.ctaUrl = null;

        const data = insertHeroCampaignSchema.partial().parse(rawData);
        const campaign = await heroService.updateCampaign(id, data);

        if (campaign) {
            heroCache.invalidate();
            // Signal CDN to purge cache
            res.setHeader('Cache-Tag', CACHE_TAG);
            res.setHeader('X-Cache-Invalidate', CACHE_TAG);
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
            // Signal CDN to purge cache
            res.setHeader('Cache-Tag', CACHE_TAG);
            res.setHeader('X-Cache-Invalidate', CACHE_TAG);
            res.sendStatus(204);
        } else {
            res.status(400).json({ message: result.error });
        }
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/hero/:id/review
 * Review a campaign (approve/reject)
 */
adminHeroRouter.post("/:id/review", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id as string, 10);
        const { status, reviewNotes } = req.body;

        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'rejected'" });
        }

        const reviewerId = (req.user as any)?.id;

        const review = await heroService.reviewCampaign(id, status, reviewNotes, reviewerId);

        // Invalidate cache since status changed (potentially)
        heroCache.invalidate();
        res.setHeader('Cache-Tag', CACHE_TAG);
        res.setHeader('X-Cache-Invalidate', CACHE_TAG);

        res.status(201).json(review);
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// A/B Testing Routes
// ============================================================================

import { abTestingRepository } from "./ab-testing";
import { campaignScheduler } from "./scheduler";
import { purgeHeroCache, CACHE_DOCS } from "./edge-cache";
import { insertCampaignVariantSchema, insertCampaignScheduleSchema } from "@shared/schema";

/**
 * POST /api/admin/hero/cache/purge
 * Manually purge all CDN caches for hero campaigns
 */
adminHeroRouter.post("/cache/purge", async (req: Request, res: Response, next: NextFunction) => {
    try {
        heroCache.invalidate();
        const results = await purgeHeroCache();

        logger.info({ message: "Manual cache purge triggered", results });

        res.json({
            success: true,
            message: "Cache purged",
            results,
            cacheConfig: CACHE_DOCS,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/hero/cache/status
 * Get cache configuration and status
 */
adminHeroRouter.get("/cache/status", async (req: Request, res: Response) => {
    res.json({
        inMemoryCache: heroCache.getStats(),
        edgeCacheConfig: CACHE_DOCS,
        headers: EDGE_CACHE_HEADERS,
    });
});

/**
 * GET /api/admin/hero/:id/variants
 * Get all variants for a campaign
 */
adminHeroRouter.get("/:id/variants", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const campaignId = parseInt(req.params.id as string, 10);
        const variants = await abTestingRepository.getCampaignVariantStats(campaignId);
        res.json(variants);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/hero/:id/variants
 * Create a new variant for a campaign
 */
adminHeroRouter.post("/:id/variants", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const campaignId = parseInt(req.params.id as string, 10);
        const data = insertCampaignVariantSchema.parse({ ...req.body, campaignId });
        const variant = await abTestingRepository.createVariant(data);
        res.status(201).json(variant);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/admin/hero/variants/:variantId
 * Update a variant
 */
adminHeroRouter.put("/variants/:variantId", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const variantId = parseInt(req.params.variantId as string, 10);
        const variant = await abTestingRepository.updateVariant(variantId, req.body);
        res.json(variant);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/admin/hero/variants/:variantId
 * Delete a variant
 */
adminHeroRouter.delete("/variants/:variantId", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const variantId = parseInt(req.params.variantId as string, 10);
        await abTestingRepository.deleteVariant(variantId);
        res.sendStatus(204);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/hero/:id/auto-promote
 * Automatically promote the winning variant
 */
adminHeroRouter.post("/:id/auto-promote", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const campaignId = parseInt(req.params.id as string, 10);
        const minImpressions = req.body.minImpressions || 100;
        const winner = await abTestingRepository.autoPromoteWinner(campaignId, minImpressions);

        if (winner) {
            res.json({ success: true, winner });
        } else {
            res.json({ success: false, message: "No variant met the minimum impressions threshold" });
        }
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// Scheduling Routes
// ============================================================================

/**
 * GET /api/admin/hero/:id/schedules
 * Get all schedules for a campaign
 */
adminHeroRouter.get("/:id/schedules", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const campaignId = parseInt(req.params.id as string, 10);
        const schedules = await campaignScheduler.getCampaignSchedules(campaignId);
        res.json(schedules);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/hero/:id/schedules
 * Schedule a campaign
 */
adminHeroRouter.post("/:id/schedules", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const campaignId = parseInt(req.params.id as string, 10);
        const data = insertCampaignScheduleSchema.parse({ ...req.body, campaignId });
        const schedule = await campaignScheduler.scheduleCampaign(data);
        res.status(201).json(schedule);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/admin/hero/schedules/:scheduleId
 * Cancel a schedule
 */
adminHeroRouter.delete("/schedules/:scheduleId", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const scheduleId = parseInt(req.params.scheduleId as string, 10);
        await campaignScheduler.cancelSchedule(scheduleId);
        res.sendStatus(204);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/hero/schedules/pending
 * Get all pending schedules
 */
adminHeroRouter.get("/schedules/pending", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const schedules = await campaignScheduler.getPendingSchedules();
        res.json(schedules);
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

