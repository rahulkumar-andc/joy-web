import rateLimit from "express-rate-limit";

// General API Rate Limiter
// Allow 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { message: "Too many requests, please try again later." }
});

// Stricter Auth Rate Limiter
// Allow 5 login/register attempts per 15 minutes per IP
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many login attempts, please try again later." }
});
