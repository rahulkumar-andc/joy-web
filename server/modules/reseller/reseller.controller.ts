import { Request, Response, NextFunction } from "express";
import { resellerService } from "./reseller.service";
import { fraudDetectionService } from "./fraud-detection.service";
import {
    createResellerSchema,
    createResellerLinkSchema,
    updateBankDetailsSchema,
    updateUpiSchema,
    requestPayoutSchema,
} from "@shared/schema";
import { z } from "zod";

// Helper to get user ID from request
const getUserId = (req: Request): number | undefined => {
    return (req.user as any)?.id;
};

// === RESELLER CONTROLLER ===

export class ResellerController {
    // ==================
    // RESELLER PROFILE
    // ==================

    /**
     * POST /api/reseller/join
     * Become a reseller
     */
    async becomeReseller(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = getUserId(req);
            if (!userId) {
                return res.status(401).json({ error: "Authentication required" });
            }

            const data = createResellerSchema.parse(req.body);
            const reseller = await resellerService.createReseller(userId, data);

            res.status(201).json({
                message: "Reseller application submitted successfully",
                reseller,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            next(error);
        }
    }

    /**
     * GET /api/reseller/profile
     * Get current user's reseller profile
     */
    async getProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = getUserId(req);
            if (!userId) {
                return res.status(401).json({ error: "Authentication required" });
            }

            const reseller = await resellerService.getResellerByUserId(userId);
            if (!reseller) {
                return res.status(404).json({ error: "Reseller profile not found" });
            }

            res.json(reseller);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/reseller/dashboard
     * Get reseller dashboard with stats
     */
    async getDashboard(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = getUserId(req);
            if (!userId) {
                return res.status(401).json({ error: "Authentication required" });
            }

            const reseller = await resellerService.getResellerByUserId(userId);
            if (!reseller) {
                return res.status(404).json({ error: "Reseller profile not found" });
            }

            if (reseller.status !== "active") {
                return res.status(403).json({
                    error: "Reseller account not active",
                    status: reseller.status
                });
            }

            const dashboard = await resellerService.getResellerDashboard(reseller.id);
            res.json(dashboard);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /api/reseller/bank
     * Update bank details
     */
    async updateBankDetails(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = getUserId(req);
            if (!userId) {
                return res.status(401).json({ error: "Authentication required" });
            }

            const reseller = await resellerService.getResellerByUserId(userId);
            if (!reseller) {
                return res.status(404).json({ error: "Reseller profile not found" });
            }

            const data = updateBankDetailsSchema.parse(req.body);
            const updated = await resellerService.updatePayoutDetails(reseller.id, data);

            res.json({ message: "Bank details updated", reseller: updated });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            next(error);
        }
    }

    /**
     * PATCH /api/reseller/upi
     * Update UPI ID
     */
    async updateUpi(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = getUserId(req);
            if (!userId) {
                return res.status(401).json({ error: "Authentication required" });
            }

            const reseller = await resellerService.getResellerByUserId(userId);
            if (!reseller) {
                return res.status(404).json({ error: "Reseller profile not found" });
            }

            const data = updateUpiSchema.parse(req.body);
            const updated = await resellerService.updatePayoutDetails(reseller.id, data);

            res.json({ message: "UPI ID updated", reseller: updated });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            next(error);
        }
    }

    // ==================
    // PRODUCT LINKS
    // ==================

    /**
     * POST /api/reseller/links
     * Create a product share link
     */
    async createLink(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = getUserId(req);
            if (!userId) {
                return res.status(401).json({ error: "Authentication required" });
            }

            const reseller = await resellerService.getResellerByUserId(userId);
            if (!reseller) {
                return res.status(404).json({ error: "Reseller profile not found" });
            }

            if (reseller.status !== "active") {
                return res.status(403).json({ error: "Reseller account not active" });
            }

            const data = createResellerLinkSchema.parse(req.body);
            const link = await resellerService.createLink(reseller.id, data);

            res.status(201).json({
                message: "Share link created",
                link,
                shareUrl: `/r/${link.shortCode}`,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            next(error);
        }
    }

    /**
     * GET /api/reseller/links
     * Get all links for current reseller
     */
    async getLinks(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = getUserId(req);
            if (!userId) {
                return res.status(401).json({ error: "Authentication required" });
            }

            const reseller = await resellerService.getResellerByUserId(userId);
            if (!reseller) {
                return res.status(404).json({ error: "Reseller profile not found" });
            }

            const links = await resellerService.getResellerLinks(reseller.id);
            res.json(links);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /r/:shortCode
     * Redirect from share link to product page (tracked)
     */
    async handleShareLink(req: Request, res: Response, next: NextFunction) {
        try {
            const shortCode = req.params.shortCode as string;
            const link = await resellerService.getLinkByShortCode(shortCode);

            if (!link || !link.isActive) {
                return res.status(404).json({ error: "Link not found" });
            }

            // Record click
            await resellerService.recordClick(link.id, {
                ipAddress: req.ip,
                userAgent: req.get("User-Agent"),
                referrer: req.get("Referrer"),
            });

            // Set cookie for attribution (24 hours)
            res.cookie("reseller_link", link.id.toString(), {
                maxAge: 24 * 60 * 60 * 1000,
                httpOnly: true,
                sameSite: "lax",
            });

            // Redirect to product page
            res.redirect(`/product/${link.productId}?ref=${shortCode}`);
        } catch (error) {
            next(error);
        }
    }

    // ==================
    // COMMISSIONS
    // ==================

    /**
     * GET /api/reseller/commissions
     * Get reseller's commissions
     */
    async getCommissions(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = getUserId(req);
            if (!userId) {
                return res.status(401).json({ error: "Authentication required" });
            }

            const reseller = await resellerService.getResellerByUserId(userId);
            if (!reseller) {
                return res.status(404).json({ error: "Reseller profile not found" });
            }

            const status = req.query.status as string | undefined;
            const commissions = await resellerService.getResellerCommissions(
                reseller.id,
                status
            );

            res.json(commissions);
        } catch (error) {
            next(error);
        }
    }

    // ==================
    // PAYOUTS
    // ==================

    /**
     * POST /api/reseller/payouts
     * Request a payout
     */
    async requestPayout(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = getUserId(req);
            if (!userId) {
                return res.status(401).json({ error: "Authentication required" });
            }

            const reseller = await resellerService.getResellerByUserId(userId);
            if (!reseller) {
                return res.status(404).json({ error: "Reseller profile not found" });
            }

            const data = requestPayoutSchema.parse(req.body);

            // Fraud check
            const fraudCheck = await fraudDetectionService.checkPayoutFraud(
                reseller.id,
                data.amount
            );

            if (fraudCheck.shouldBlock) {
                return res.status(403).json({
                    error: "Payout request blocked for review",
                    flags: fraudCheck.flags,
                });
            }

            const payout = await resellerService.requestPayout(
                reseller.id,
                data.amount,
                data.payoutMethod
            );

            res.status(201).json({
                message: "Payout request submitted",
                payout,
                warning: fraudCheck.isRisky ? "Request flagged for review" : undefined,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            next(error);
        }
    }

    /**
     * GET /api/reseller/payouts
     * Get reseller's payouts
     */
    async getPayouts(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = getUserId(req);
            if (!userId) {
                return res.status(401).json({ error: "Authentication required" });
            }

            const reseller = await resellerService.getResellerByUserId(userId);
            if (!reseller) {
                return res.status(404).json({ error: "Reseller profile not found" });
            }

            const payouts = await resellerService.getResellerPayouts(reseller.id);
            res.json(payouts);
        } catch (error) {
            next(error);
        }
    }

    // ==================
    // CATALOG
    // ==================

    /**
     * GET /api/reseller/catalog
     * Get products available for reselling
     */
    async getCatalog(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = getUserId(req);
            if (!userId) {
                return res.status(401).json({ error: "Authentication required" });
            }

            const reseller = await resellerService.getResellerByUserId(userId);
            if (!reseller) {
                return res.status(404).json({ error: "Reseller profile not found" });
            }

            if (reseller.status !== "active") {
                return res.status(403).json({ error: "Reseller account not active" });
            }

            // Get existing links for this reseller
            const existingLinks = await resellerService.getResellerLinks(reseller.id);
            const linkedProductIds = new Set(existingLinks.map(l => l.productId));

            // Return catalog info (products will be fetched from products API)
            res.json({
                reseller: {
                    id: reseller.id,
                    tier: reseller.tier,
                },
                linkedProductIds: Array.from(linkedProductIds),
                links: existingLinks,
            });
        } catch (error) {
            next(error);
        }
    }

    // ==================
    // ADMIN ENDPOINTS
    // ==================

    /**
     * GET /api/admin/resellers
     * Get all resellers (admin)
     */
    async getAllResellers(req: Request, res: Response, next: NextFunction) {
        try {
            const flagged = req.query.flagged as string | undefined;

            if (flagged === "true") {
                const resellers = await fraudDetectionService.getFlaggedResellers();
                return res.json(resellers);
            }

            // Basic listing - would need pagination for production
            const resellers = await resellerService.getResellerByUserId(0); // Placeholder
            res.json(resellers);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/admin/payouts
     * Get all payouts (admin)
     */
    async getAllPayouts(req: Request, res: Response, next: NextFunction) {
        try {
            const payouts = await resellerService.getAllPayouts();
            res.json(payouts);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/admin/resellers/:id/approve
     * Approve reseller (admin)
     */
    async approveReseller(req: Request, res: Response, next: NextFunction) {
        try {
            const resellerId = parseInt(req.params.id as string);
            const reseller = await resellerService.approveReseller(resellerId);

            res.json({ message: "Reseller approved", reseller });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/admin/resellers/:id/suspend
     * Suspend reseller (admin)
     */
    async suspendReseller(req: Request, res: Response, next: NextFunction) {
        try {
            const resellerId = parseInt(req.params.id as string);
            const { reason } = req.body;

            if (!reason) {
                return res.status(400).json({ error: "Reason is required" });
            }

            const reseller = await resellerService.suspendReseller(resellerId, reason);
            res.json({ message: "Reseller suspended", reseller });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/admin/resellers/:id/clear-flag
     * Clear fraud flag (admin)
     */
    async clearFlag(req: Request, res: Response, next: NextFunction) {
        try {
            const resellerId = parseInt(req.params.id as string);
            const reseller = await fraudDetectionService.clearFlag(resellerId);

            res.json({ message: "Flag cleared", reseller });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/admin/payouts/:id/complete
     * Complete a payout (admin)
     */
    async completePayout(req: Request, res: Response, next: NextFunction) {
        try {
            const payoutId = parseInt(req.params.id as string);
            const { transactionId } = req.body;

            if (!transactionId) {
                return res.status(400).json({ error: "Transaction ID is required" });
            }

            const payout = await resellerService.completePayout(payoutId, transactionId);
            res.json({ message: "Payout completed", payout });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/admin/payouts/:id/fail
     * Mark payout as failed (admin)
     */
    async failPayout(req: Request, res: Response, next: NextFunction) {
        try {
            const payoutId = parseInt(req.params.id as string);
            const { reason } = req.body;

            if (!reason) {
                return res.status(400).json({ error: "Failure reason is required" });
            }

            const payout = await resellerService.failPayout(payoutId, reason);
            res.json({ message: "Payout marked as failed", payout });
        } catch (error) {
            next(error);
        }
    }
}

export const resellerController = new ResellerController();
