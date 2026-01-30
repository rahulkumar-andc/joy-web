import { Redis } from "@upstash/redis";
import { logger } from "./logger";

// Initialize Upstash Redis
// Falls back to a mock/no-op if credentials are missing in dev, usually.
// But we expect credentials now.
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "https://mock.upstash.io",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "mock_token",
});

export const CacheKeys = {
    HOMEPAGE: "homepage_data",
    CATEGORIES: "categories_list",
    PRODUCTS_LIST: (page: number, limit: number, filters: string) => `products_${page}_${limit}_${filters}`,
};

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

    set: async <T>(key: string, value: T, ttlSeconds: number = 300): Promise<boolean> => {
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

    flush: async (): Promise<void> => {
        try {
            await redis.flushall();
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
            }
            await redis.del(CacheKeys.HOMEPAGE);
        } catch (err) {
            logger.error("Cache invalidation error:", err);
        }
    }
};
