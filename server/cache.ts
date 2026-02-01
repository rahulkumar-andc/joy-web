import { Redis } from "@upstash/redis";
import { logger } from "./logger";

// Initialize Upstash Redis
// Falls back to a mock/no-op if credentials are missing in dev, usually.
// But we expect credentials now.
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "https://mock.upstash.io",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "mock_token",
});

// ============================================================================
// CACHE KEY DEFINITIONS
// ============================================================================
export const CacheKeys = {
    // Homepage and general
    HOMEPAGE: "homepage_data",
    CATEGORIES: "categories_list",

    // Product listings
    PRODUCTS_LIST: (page: number, limit: number, filters: string) => `products_${page}_${limit}_${filters}`,
    PRODUCT_DETAIL: (id: number) => `product_${id}`,
    PRODUCT_REVIEWS: (productId: number, page: number) => `product_reviews_${productId}_${page}`,

    // Category-based caching
    CATEGORY_PRODUCTS: (slug: string, page: number) => `cat_${slug}_${page}`,
    CATEGORY_COUNT: (slug: string) => `cat_count_${slug}`,

    // User-specific caching (shorter TTL)
    USER_CART: (userId: number) => `user_cart_${userId}`,
    USER_WISHLIST: (userId: number) => `user_wishlist_${userId}`,

    // Admin/analytics
    PRODUCT_STATS: "product_stats",
    ORDER_STATS: "order_stats",

    // Hero campaigns
    HERO_ACTIVE: "hero_active_campaign",
    HERO_GUEST: "hero_guest_campaign",
    HERO_USER: "hero_user_campaign",
};

// Cache TTL presets (in seconds)
export const CacheTTL = {
    SHORT: 60,           // 1 minute - for frequently changing data
    MEDIUM: 300,         // 5 minutes - default
    LONG: 3600,          // 1 hour - for semi-static data
    VERY_LONG: 86400,    // 24 hours - for static data
    USER_DATA: 120,      // 2 minutes - for user-specific data
};

// ============================================================================
// CACHE SERVICE
// ============================================================================
export const cacheService = {
    // Upstash Redis methods return Promises by default (HTTP requests)
    get: async <T>(key: string): Promise<T | undefined> => {
        try {
            const data = await redis.get(key);
            // Upstash auto-parses JSON if it was stored as JSON, or we might need to handle it.
            // But usually, redis.get<T> works.
            return data as T;
        } catch (err) {
            logger.error(`Cache get error for key ${key}:`, err);
            return undefined;
        }
    },

    set: async <T>(key: string, value: T, ttlSeconds: number = CacheTTL.MEDIUM): Promise<boolean> => {
        try {
            // ex: expiry in seconds
            await redis.set(key, value, { ex: ttlSeconds });
            return true;
        } catch (err) {
            logger.error(`Cache set error for key ${key}:`, err);
            return false;
        }
    },

    del: async (key: string): Promise<number> => {
        try {
            return await redis.del(key);
        } catch (err) {
            logger.error(`Cache del error for key ${key}:`, err);
            return 0;
        }
    },

    /**
     * Get or set pattern - fetch from cache, or execute callback and cache result
     */
    getOrSet: async <T>(
        key: string,
        fetchFn: () => Promise<T>,
        ttlSeconds: number = CacheTTL.MEDIUM
    ): Promise<T> => {
        try {
            // Try cache first
            const cached = await redis.get(key);
            if (cached !== null && cached !== undefined) {
                logger.debug(`Cache HIT: ${key}`);
                return cached as T;
            }

            // Cache miss - fetch data
            logger.debug(`Cache MISS: ${key}`);
            const data = await fetchFn();

            // Store in cache (fire-and-forget)
            redis.set(key, data, { ex: ttlSeconds }).catch(err => {
                logger.error(`Cache set error for key ${key}:`, err);
            });

            return data;
        } catch (err) {
            logger.error(`Cache getOrSet error for key ${key}:`, err);
            // Fallback to fetch function on error
            return fetchFn();
        }
    },

    flush: async (): Promise<void> => {
        try {
            await redis.flushall();
            logger.info("Cache flushed");
        } catch (err) {
            logger.error("Cache flush error:", err);
        }
    },

    // Clear all product related keys
    invalidateProducts: async (): Promise<void> => {
        try {
            // Upstash REST API scan is available but iterating might be different.
            // A simple "scan" loop:
            let cursor = 0;
            const keysToDelete: string[] = [];

            do {
                const [nextCursor, keys] = await redis.scan(cursor, { match: "products_*", count: 100 });
                cursor = Number(nextCursor);
                if (keys.length > 0) {
                    keysToDelete.push(...keys);
                }
            } while (cursor !== 0);

            if (keysToDelete.length > 0) {
                await redis.del(...keysToDelete);
                logger.info(`Invalidated ${keysToDelete.length} product cache entries`);
            }
            await redis.del(CacheKeys.HOMEPAGE);
        } catch (err) {
            logger.error("Cache invalidation error:", err);
        }
    },

    /**
     * Invalidate a single product's cache
     */
    invalidateProduct: async (productId: number): Promise<void> => {
        try {
            await redis.del(CacheKeys.PRODUCT_DETAIL(productId));
            // Also invalidate list caches as product data changed
            await cacheService.invalidateProducts();
        } catch (err) {
            logger.error(`Cache invalidation error for product ${productId}:`, err);
        }
    },

    /**
     * Invalidate category-related caches
     */
    invalidateCategory: async (slug: string): Promise<void> => {
        try {
            let cursor = 0;
            const keysToDelete: string[] = [];

            do {
                const [nextCursor, keys] = await redis.scan(cursor, { match: `cat_${slug}_*`, count: 100 });
                cursor = Number(nextCursor);
                if (keys.length > 0) {
                    keysToDelete.push(...keys);
                }
            } while (cursor !== 0);

            if (keysToDelete.length > 0) {
                await redis.del(...keysToDelete);
            }
            await redis.del(CacheKeys.CATEGORIES);
            logger.info(`Invalidated category cache for: ${slug}`);
        } catch (err) {
            logger.error(`Cache invalidation error for category ${slug}:`, err);
        }
    },

    /**
     * Invalidate user-specific caches
     */
    invalidateUser: async (userId: number): Promise<void> => {
        try {
            await redis.del(CacheKeys.USER_CART(userId));
            await redis.del(CacheKeys.USER_WISHLIST(userId));
        } catch (err) {
            logger.error(`Cache invalidation error for user ${userId}:`, err);
        }
    },

    /**
     * Check if cache is available
     */
    ping: async (): Promise<boolean> => {
        try {
            await redis.ping();
            return true;
        } catch (err) {
            logger.error("Cache ping failed:", err);
            return false;
        }
    },
};

// ============================================================================
// CACHE WARMING
// ============================================================================

/**
 * Pre-warm frequently accessed cache entries on startup
 * Call this during server initialization
 */
export async function warmCache(): Promise<void> {
    logger.info("🔥 Starting cache warm-up...");
    const startTime = Date.now();

    try {
        // Import services dynamically to avoid circular dependencies
        const { productRepository } = await import("./repositories/productRepository");

        // Warm product categories
        const categories = await productRepository.getCategories();
        await cacheService.set(CacheKeys.CATEGORIES, categories, CacheTTL.LONG);
        logger.info(`  ✓ Cached ${categories.length} categories`);

        // Warm first page of products (most accessed)
        const { products, total } = await productRepository.findAll({ page: 1, limit: 50 });
        await cacheService.set(CacheKeys.PRODUCTS_LIST(1, 50, ""), { products, total }, CacheTTL.MEDIUM);
        logger.info(`  ✓ Cached first page of products (${products.length} items)`);

        // Warm hero campaigns if hero module exists
        try {
            const { heroService } = await import("./modules/hero/service");
            const activeCampaign = await heroService.getActiveCampaign(false); // Guest user default
            if (activeCampaign) {
                await cacheService.set(CacheKeys.HERO_ACTIVE, activeCampaign, CacheTTL.MEDIUM);
                logger.info(`  ✓ Cached active hero campaign`);
            }
        } catch {
            // Hero module might not exist, skip silently
        }

        const duration = Date.now() - startTime;
        logger.info(`🔥 Cache warm-up completed in ${duration}ms`);
    } catch (err) {
        logger.error("Cache warm-up failed:", err);
    }
}

