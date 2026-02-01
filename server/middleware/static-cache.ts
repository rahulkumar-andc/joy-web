import { Request, Response, NextFunction } from "express";

/**
 * Static Asset Cache Headers Middleware
 * 
 * Sets appropriate Cache-Control headers for static assets to improve performance.
 * Different TTLs are applied based on asset type and mutability.
 */

// Cache durations in seconds
const CACHE_DURATIONS = {
    // Immutable assets (versioned files with hash in filename)
    IMMUTABLE: 31536000,     // 1 year

    // Static assets (may change occasionally)
    STATIC: 2592000,         // 30 days

    // Uploads (user-uploaded content)
    UPLOADS: 86400,          // 24 hours

    // Short-lived (may change frequently)
    SHORT: 3600,             // 1 hour
};

/**
 * Get cache duration based on file path
 */
function getCacheDuration(path: string): number {
    // Versioned/hashed assets (typically from build tools)
    if (path.match(/\.[a-f0-9]{8,}\.(js|css|woff2?|ttf|eot)$/i)) {
        return CACHE_DURATIONS.IMMUTABLE;
    }

    // Image assets in static build
    if (path.match(/\/assets\/.*\.(png|jpg|jpeg|gif|webp|svg|ico)$/i)) {
        return CACHE_DURATIONS.STATIC;
    }

    // Font files
    if (path.match(/\.(woff2?|ttf|eot|otf)$/i)) {
        return CACHE_DURATIONS.STATIC;
    }

    // User uploads (more conservative)
    if (path.startsWith("/uploads/")) {
        return CACHE_DURATIONS.UPLOADS;
    }

    // Other static assets
    if (path.match(/\.(js|css|png|jpg|jpeg|gif|webp|svg|ico)$/i)) {
        return CACHE_DURATIONS.SHORT;
    }

    // Default - no cache for dynamic content
    return 0;
}

/**
 * Middleware to set cache headers for static assets
 */
export function staticCacheMiddleware(req: Request, res: Response, next: NextFunction): void {
    const cacheDuration = getCacheDuration(req.path);

    if (cacheDuration > 0) {
        // Set Cache-Control header
        if (cacheDuration === CACHE_DURATIONS.IMMUTABLE) {
            // Immutable assets can be cached forever
            res.setHeader("Cache-Control", `public, max-age=${cacheDuration}, immutable`);
        } else {
            // Other assets should revalidate after max-age
            res.setHeader("Cache-Control", `public, max-age=${cacheDuration}, stale-while-revalidate=${Math.floor(cacheDuration / 2)}`);
        }

        // Set Vary header for proper CDN behavior
        res.setHeader("Vary", "Accept-Encoding");
    }

    next();
}

/**
 * Middleware specifically for /uploads directory
 * Applied separately for more control
 */
export function uploadsCacheMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Set cache headers for uploaded files
    res.setHeader("Cache-Control", `public, max-age=${CACHE_DURATIONS.UPLOADS}, stale-while-revalidate=3600`);
    res.setHeader("Vary", "Accept-Encoding");
    next();
}

/**
 * Middleware to set no-cache headers for API responses
 * Useful for ensuring fresh data from APIs
 */
export function noCacheMiddleware(req: Request, res: Response, next: NextFunction): void {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
}
