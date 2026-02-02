import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import { type Request } from "express";
import { logger } from "../logger";

/**
 * Advanced Rate Limiting with User-Based Tracking
 * 
 * Combines IP and userId for better protection:
 * - Unauthenticated users: limited by IP only
 * - Authenticated users: limited by userId (higher limits)
 * 
 * This prevents a single user from bypassing limits by switching IPs
 * and allows authenticated users more generous limits.
 */

/**
 * Create a rate limiter with user-aware key generator
 */
export function createUserRateLimiter(options: {
    windowMs: number;
    max: number;
    message: string;
    skipSuccessfulRequests?: boolean;
}): RateLimitRequestHandler {
    return rateLimit({
        windowMs: options.windowMs,
        max: options.max,
        message: { error: options.message },
        skipSuccessfulRequests: options.skipSuccessfulRequests || false,

        // Generate key based on user or IP
        keyGenerator: (req: Request) => {
            // If user is authenticated, use userId
            if (req.user && (req.user as any).id) {
                return `user:${(req.user as any).id}`;
            }
            // Otherwise, fall back to IP
            return `ip:${req.ip}`;
        },

        // Log rate limit hits
        handler: (req, res) => {
            const userId = req.user ? (req.user as any).id : null;

            logger.warn("Rate limit exceeded", {
                userId,
                ip: req.ip,
                path: req.path,
                method: req.method,
            });

            res.status(429).json({
                error: options.message,
                retryAfter: Math.ceil(options.windowMs / 1000),
            });
        },
    });
}

/**
 * Composite Rate Limiter
 * Applies different limits for authenticated vs unauthenticated users
 */
export function createCompositeRateLimiter(options: {
    unauthenticated: { windowMs: number; max: number };
    authenticated: { windowMs: number; max: number };
    message: string;
}): RateLimitRequestHandler {
    return rateLimit({
        windowMs: options.unauthenticated.windowMs,

        // Dynamic max based on auth status
        max: (req: Request) => {
            if (req.user && (req.user as any).id) {
                return options.authenticated.max;
            }
            return options.unauthenticated.max;
        },

        keyGenerator: (req: Request) => {
            if (req.user && (req.user as any).id) {
                return `user:${(req.user as any).id}`;
            }
            return `ip:${req.ip}`;
        },

        handler: (req, res) => {
            const userId = req.user ? (req.user as any).id : null;
            const isAuthenticated = !!userId;

            logger.warn("Composite rate limit exceeded", {
                userId,
                ip: req.ip,
                path: req.path,
                isAuthenticated,
            });

            res.status(429).json({
                error: options.message,
                retryAfter: Math.ceil(options.unauthenticated.windowMs / 1000),
            });
        },
    });
}

// ============================================================================
// PREDEFINED LIMITERS
// ============================================================================

/**
 * Payment endpoint limiter (strict)
 * - Unauthenticated: 3 requests per 5 minutes
 * - Authenticated: 10 requests per 5 minutes
 */
export const paymentUserLimiter = createCompositeRateLimiter({
    unauthenticated: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 3,
    },
    authenticated: {
        windowMs: 5 * 60 * 1000,
        max: 10,
    },
    message: "Too many payment requests. Please try again later.",
});

/**
 * Order creation limiter
 * - Unauthenticated: 2 orders per 10 minutes
 * - Authenticated: 5 orders per 10 minutes
 */
export const orderCreationLimiter = createCompositeRateLimiter({
    unauthenticated: {
        windowMs: 10 * 60 * 1000, // 10 minutes
        max: 2,
    },
    authenticated: {
        windowMs: 10 * 60 * 1000,
        max: 5,
    },
    message: "Too many order creation attempts. Please wait before trying again.",
});

/**
 * Checkout endpoint limiter
 * - Unauthenticated: 5 checkouts per 15 minutes
 * - Authenticated: 20 checkouts per 15 minutes
 */
export const checkoutLimiter = createCompositeRateLimiter({
    unauthenticated: {
        windowMs: 15 * 60 * 1000,
        max: 5,
    },
    authenticated: {
        windowMs: 15 * 60 * 1000,
        max: 20,
    },
    message: "Too many checkout attempts. Please slow down.",
});

/**
 * General authenticated user limiter
 * More generous than IP-only limits
 */
export const authenticatedUserLimiter = createUserRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15min for authenticated users
    message: "Rate limit exceeded. Please try again later.",
});

/**
 * Admin action limiter
 * For bulk operations, product updates, etc.
 */
export const adminActionLimiter = createUserRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 admin actions per minute
    message: "Too many admin actions. Please slow down.",
});
