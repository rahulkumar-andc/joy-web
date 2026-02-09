import rateLimit from "express-rate-limit";

// General API Rate Limiter
// Allow 500 requests per 15 minutes per IP (increased for development)
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: true, // Enable `X-RateLimit-*` headers for backward compatibility
    message: { message: "Too many requests, please try again later." },
});

// Stricter Auth Rate Limiter
// Allow 5 login/register attempts per 15 minutes per IP
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: true,
    message: { message: "Too many login attempts, please try again later." },
});

// Strict Payment Rate Limiter
// Allow 10 requests per minute per IP (prevents flooding/replay testing)
export const paymentLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: true,
    message: { message: "Too many payment requests, please try again later." },
});
export const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 60, // 60 requests per minute
    standardHeaders: true,
    legacyHeaders: false, // Strict headers
    message: { message: "Too many webhook requests" },
});

// Ticket creation rate limiter
// Allow 5 tickets per hour per user (prevents support spam)
export const ticketLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many support tickets created. Please wait before creating more." },
    keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise fall back to IP
        const user = (req as any).user;
        return user?.id ? `user-${user.id}` : req.ip || 'unknown';
    },
});
