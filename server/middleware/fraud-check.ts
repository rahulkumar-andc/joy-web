import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { fraudDetectionService } from "../modules/reseller/fraud-detection.service";
import { logger } from "../logger";

/**
 * Fraud Check Middleware
 * Prevents resellers from ordering through their own links (self-ordering)
 */
export async function fraudCheckMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        // Only check if user is authenticated and there's a reseller cookie
        if (!req.isAuthenticated() || !req.cookies?.reseller_link) {
            return next();
        }

        const userId = (req.user as any).id;
        const resellerLinkId = parseInt(req.cookies.reseller_link);

        // Check if this user is trying to order through their own reseller link
        const { resellerService } = await import("../modules/reseller/reseller.service");
        const link = await resellerService.getLinkById(resellerLinkId);

        if (link) {
            const reseller = await resellerService.getResellerByUserId(userId);

            // Block if user is the reseller who created this link
            if (reseller && reseller.id === link.resellerId) {
                logger.warn("Fraud attempt: Self-ordering detected", {
                    userId,
                    resellerId: reseller.id,
                    linkId: resellerLinkId
                });

                // Clear the reseller cookie to prevent further attempts
                res.clearCookie("reseller_link");

                throw new AppError(
                    "You cannot place orders through your own reseller links",
                    403
                );
            }
        }

        next();
    } catch (error) {
        next(error);
    }
}
