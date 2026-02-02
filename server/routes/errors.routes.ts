import { Router, Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { logger } from "../logger";

const router = Router();

/**
 * POST /api/errors/report
 * Receive client-side error reports
 */
router.post("/report", catchAsync(async (req: Request, res: Response) => {
    const {
        message,
        stack,
        componentStack,
        userAgent,
        url,
        timestamp
    } = req.body;

    // Log error with full context
    logger.error("Client-side error reported:", {
        message,
        stack,
        componentStack,
        userAgent,
        url,
        timestamp,
        userId: req.user ? (req.user as any).id : null,
        ip: req.ip,
    });

    // In production, you might want to:
    // - Send to error tracking service (Sentry, Rollbar, etc.)
    // - Store in database for analysis
    // - Send alerts for critical errors

    res.status(200).json({ success: true });
}));

export default router;
