import Redis from "ioredis";
import { logger } from "./logger";

if (!process.env.REDIS_URL) {
    logger.warn("REDIS_URL not set, cache will fail. defaulting to localhost");
}

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

redis.on("error", (err) => {
    logger.error("Redis Client Error", err);
});

redis.on("connect", () => {
    logger.info("Redis connected successfully");
});

export const CacheKeys = {
    HOMEPAGE: "homepage_data",
    CATEGORIES: "categories_list",
    PRODUCTS_LIST: (page: number, limit: number, filters: string) => `products_${page}_${limit}_${filters}`,
};

export const cacheService = {
    // Methods now return Promise because Redis is async
    get: async <T>(key: string): Promise<T | undefined> => {
        try {
            const data = await redis.get(key);
            if (data) return JSON.parse(data);
            return undefined;
        } catch (err) {
            logger.error(`Cache get error for key ${key}:`, err);
            return undefined;
        }
    },

    set: async <T>(key: string, value: T, ttlSeconds: number = 300): Promise<boolean> => {
        try {
            // mode: 'EX' sets expiry in seconds
            await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
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
            // Use scanStream for safer iteration over keys in production
            const stream = redis.scanStream({ match: "products_*" });
            const keysToDelete: string[] = [];

            stream.on("data", (resultKeys) => {
                if (resultKeys.length) {
                    keysToDelete.push(...resultKeys);
                }
            });

            stream.on("end", async () => {
                if (keysToDelete.length > 0) {
                    await redis.del(...keysToDelete);
                }
                await redis.del(CacheKeys.HOMEPAGE);
            });
        } catch (err) {
            logger.error("Cache invalidation error:", err);
        }
    }
};
