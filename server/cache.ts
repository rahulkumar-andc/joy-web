import NodeCache from "node-cache";

// StdTTL: 5 minutes default
const cache = new NodeCache({ stdTTL: 300 });

export const CacheKeys = {
    HOMEPAGE: "homepage_data",
    CATEGORIES: "categories_list",
    PRODUCTS_LIST: (page: number, limit: number, filters: string) => `products_${page}_${limit}_${filters}`,
};

export const cacheService = {
    get: <T>(key: string): T | undefined => {
        return cache.get<T>(key);
    },

    set: <T>(key: string, value: T, ttl?: number): boolean => {
        return cache.set(key, value, ttl as number);
    },

    del: (key: string): number => {
        return cache.del(key);
    },

    flush: (): void => {
        cache.flushAll();
    },

    // Clear all product related keys (useful when a product is added/updated)
    invalidateProducts: (): void => {
        const keys = cache.keys();
        const productKeys = keys.filter(k => k.startsWith("products_") || k === CacheKeys.HOMEPAGE);
        cache.del(productKeys);
    }
};
