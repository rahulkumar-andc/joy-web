import { Redis } from "@upstash/redis";
import { logger } from "./logger";

// Initialize Upstash Redis
// Falls back to a mock/no-op if credentials are missing in dev, usually.
// But we expect credentials now.
// Initialize Upstash Redis
// Falls back to a mock/no-op if credentials are missing in dev, usually.
// But we expect credentials now.
export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "https://mock.upstash.io",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "mock_token",
});

// ============================================================================
// REDIS WRAPPER (Safe Serialization)
// ============================================================================

/**
 * Safely parse JSON from Redis. 
 * Returns null if parsing fails or value is missing.
 * Prevents app crashes from "SyntaxError: [object Object] is not valid JSON"
 */
export async function redisGet<T>(key: string): Promise<T | null> {
    try {
        // Force Redis to return string (if Upstash client supports it via config, otherwise we handle what we get)
        // Upstash Redis SDK automatically parses JSON if it detects it.
        // However, if the value is physically "[object Object]" string in Redis, Upstash might return it as string.
        // If we want to be 100% sure we handle raw strings:
        const data = await redis.get(key);

        if (data === null || data === undefined) return null;

        // If Upstash already parsed it as an object, great.
        if (typeof data === 'object') {
            return data as T;
        }

        // If it's a string, try to parse it. 
        // If it's the dreaded "[object Object]", this is where we catch it.
        if (typeof data === 'string') {
            try {
                return JSON.parse(data) as T;
            } catch (parseError) {
                logger.warn(`Redis JSON parse error for key ${key}. Value was: ${data.substring(0, 50)}...`);
                return null; // Graceful fallback
            }
        }

        return data as T; // Should verify if number/boolean need handling
    } catch (err) {
        logger.error(`Redis get error for key ${key}:`, err);
        return null; // Fail safe
    }
}

/**
 * Safely store value in Redis as JSON string.
 */
export async function redisSet<T>(key: string, value: T, ttlSeconds: number = CacheTTL.MEDIUM): Promise<boolean> {
    try {
        // We explicitly stringify to ensure we never store implicit [object Object]
        // Note: Upstash SDK might double-stringify if we pass a string. 
        // But to guarantee consistency, passing a primitive string is safer than relying on SDK magic that might fail.

        let stringValue: string;
        try {
            stringValue = JSON.stringify(value);
        } catch (stringifyError) {
            logger.error(`Redis serialization error for key ${key}:`, stringifyError);
            return false;
        }

        // Use 'ex' for expiry
        await redis.set(key, stringValue, { ex: ttlSeconds });
        return true;
    } catch (err) {
        logger.error(`Redis set error for key ${key}:`, err);
        return false;
    }
}

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
    SESSION_CART: (sessionId: string) => `session_cart_${sessionId}`,
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
        const result = await redisGet<T>(key);
        return result === null ? undefined : result;
    },

    set: async <T>(key: string, value: T, ttlSeconds: number = CacheTTL.MEDIUM): Promise<boolean> => {
        return redisSet(key, value, ttlSeconds);
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
            const cached = await redisGet<T>(key);
            if (cached !== null && cached !== undefined) {
                // Start of Selection
                logger.debug(`Cache HIT: ${key}`);
                return cached;
            }

            // Cache miss - fetch data
            logger.debug(`Cache MISS: ${key}`);
            const data = await fetchFn();

            // Store in cache (fire-and-forget)
            redisSet(key, data, ttlSeconds).catch(err => {
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

