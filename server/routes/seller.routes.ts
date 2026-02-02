import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { restrictTo, requirePermission, requireSellerAccess } from "../middleware/rbac";
import {
    sellerOnboardingService,
    sellerWalletService,
    sellerOrderService,
    sellerProductService,
    commissionService,
} from "../services/seller";
import {
    sellerRegistrationSchema,
    sellerProfileUpdateSchema,
    sellerBankUpdateSchema,
    sellerOrderStatusUpdateSchema,
    sellerPayoutRequestSchema,
    returnResponseSchema,
    adminSellerActionSchema,
    adminProductModerationSchema,
    commissionRuleCreateSchema,
} from "@shared/seller-schema";
import { insertProductSchema } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { sellerProfiles, sellerNotifications } from "@shared/seller-schema";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely parse a route param to integer
 * Handles Express types which can be string | string[] | undefined
 */
const parseParamId = (param: string | string[] | undefined): number => {
    const value = Array.isArray(param) ? param[0] : param;
    return parseInt(String(value || "0"), 10);
};

export const sellerRouter = Router();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Check if user is authenticated
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    next();
};

// Get seller profile from authenticated user
const getSellerProfile = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = (req.user as any).id;
    const seller = await sellerOnboardingService.getSellerByUserId(userId);

    if (!seller) {
        return res.status(404).json({ message: "Seller profile not found" });
    }

    (req as any).seller = seller;
    next();
};

// Check if seller is approved
const requireApprovedSeller = async (req: Request, res: Response, next: NextFunction) => {
    const seller = (req as any).seller;

    if (!seller) {
        return res.status(404).json({ message: "Seller profile not found" });
    }

    if (seller.status !== "approved") {
        return res.status(403).json({
            message: `Seller account is ${seller.status}. Only approved sellers can access this feature.`,
            status: seller.status,
            statusReason: seller.statusReason,
        });
    }

    next();
};

// ============================================================================
// PUBLIC ROUTES - Seller Registration
// ============================================================================

/**
 * POST /api/seller/register
 * Register as a seller (public, but requires auth)
 */
sellerRouter.post("/api/seller/register", requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any).id;

        // Validate input
        const parsed = sellerRegistrationSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        const result = await sellerOnboardingService.registerSeller(userId, parsed.data);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        // Send OTP for email verification
        await sellerOnboardingService.sendVerificationOTP(
            result.sellerId!,
            userId,
            "email",
            parsed.data.businessEmail
        );

        res.status(201).json({
            message: "Seller registration submitted. Please verify your email.",
            sellerId: result.sellerId,
        });
    } catch (error) {
        console.error("[Seller Routes] Register error:", error);
        res.status(500).json({ message: "Failed to register seller" });
    }
});

/**
 * POST /api/seller/verify-email
 * Verify email with OTP
 */
sellerRouter.post("/api/seller/verify-email", requireAuth, async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        const result = await sellerOnboardingService.verifyOTP("email", email, otp);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({ message: "Email verified successfully" });
    } catch (error) {
        console.error("[Seller Routes] Verify email error:", error);
        res.status(500).json({ message: "Failed to verify email" });
    }
});

/**
 * POST /api/seller/verify-phone
 * Verify phone with OTP
 */
sellerRouter.post("/api/seller/verify-phone", requireAuth, async (req: Request, res: Response) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ message: "Phone and OTP are required" });
        }

        const result = await sellerOnboardingService.verifyOTP("phone", phone, otp);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({ message: "Phone verified successfully" });
    } catch (error) {
        console.error("[Seller Routes] Verify phone error:", error);
        res.status(500).json({ message: "Failed to verify phone" });
    }
});

/**
 * POST /api/seller/resend-otp
 * Resend verification OTP
 */
sellerRouter.post("/api/seller/resend-otp", requireAuth, getSellerProfile, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;
        const { type } = req.body; // "email" or "phone"

        if (!["email", "phone"].includes(type)) {
            return res.status(400).json({ message: "Type must be email or phone" });
        }

        const identifier = type === "email" ? seller.businessEmail : seller.businessPhone;

        const result = await sellerOnboardingService.sendVerificationOTP(
            seller.id,
            seller.userId,
            type,
            identifier
        );

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({ message: result.message });
    } catch (error) {
        console.error("[Seller Routes] Resend OTP error:", error);
        res.status(500).json({ message: "Failed to resend OTP" });
    }
});

// ============================================================================
// SELLER AUTHENTICATED ROUTES
// ============================================================================

/**
 * GET /api/seller/profile
 * Get seller's own profile
 */
sellerRouter.get("/api/seller/profile", requireAuth, getSellerProfile, async (req: Request, res: Response) => {
    const seller = (req as any).seller;
    res.json(seller);
});

/**
 * PUT /api/seller/profile
 * Update seller profile
 */
sellerRouter.put("/api/seller/profile", requireAuth, getSellerProfile, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;

        const parsed = sellerProfileUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        const result = await sellerOnboardingService.updateSellerProfile(seller.id, parsed.data);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({ message: "Profile updated successfully" });
    } catch (error) {
        console.error("[Seller Routes] Update profile error:", error);
        res.status(500).json({ message: "Failed to update profile" });
    }
});

/**
 * PUT /api/seller/bank-details
 * Update bank details
 */
sellerRouter.put("/api/seller/bank-details", requireAuth, getSellerProfile, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;

        const parsed = sellerBankUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        // Update bank details - service layer will handle resetting bankVerified
        const result = await sellerOnboardingService.updateSellerProfile(seller.id, parsed.data);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({ message: "Bank details updated successfully" });
    } catch (error) {
        console.error("[Seller Routes] Update bank details error:", error);
        res.status(500).json({ message: "Failed to update bank details" });
    }
});

/**
 * GET /api/seller/dashboard
 * Get dashboard statistics
 */
sellerRouter.get("/api/seller/dashboard", requireAuth, getSellerProfile, requireApprovedSeller, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;

        const [orderStats, productStats, wallet, commissionRate] = await Promise.all([
            sellerOrderService.getSellerOrderStats(seller.id),
            sellerProductService.getProductStats(seller.id),
            sellerWalletService.getWallet(seller.id),
            commissionService.getSellerCommissionRate(seller.id),
        ]);

        res.json({
            seller: {
                id: seller.id,
                shopName: seller.shopName,
                status: seller.status,
                rating: seller.rating,
            },
            orders: orderStats,
            products: productStats,
            wallet: wallet
                ? {
                    pendingBalance: wallet.pendingBalance,
                    availableBalance: wallet.availableBalance,
                    totalEarned: wallet.totalEarned,
                    totalWithdrawn: wallet.totalWithdrawn,
                }
                : null,
            commission: commissionRate,
        });
    } catch (error) {
        console.error("[Seller Routes] Dashboard error:", error);
        res.status(500).json({ message: "Failed to get dashboard data" });
    }
});

// ============================================================================
// SELLER WALLET ROUTES
// ============================================================================

/**
 * GET /api/seller/wallet
 * Get wallet balance
 */
sellerRouter.get("/api/seller/wallet", requireAuth, getSellerProfile, requireApprovedSeller, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;
        const wallet = await sellerWalletService.getWallet(seller.id);

        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        res.json(wallet);
    } catch (error) {
        console.error("[Seller Routes] Get wallet error:", error);
        res.status(500).json({ message: "Failed to get wallet" });
    }
});

/**
 * GET /api/seller/transactions
 * Get transaction history
 */
sellerRouter.get("/api/seller/transactions", requireAuth, getSellerProfile, requireApprovedSeller, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const type = req.query.type as string | undefined;

        const result = await sellerWalletService.getTransactionHistory(
            seller.id,
            { type: type as any },
            page,
            limit
        );

        res.json({
            transactions: result.transactions,
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
        });
    } catch (error) {
        console.error("[Seller Routes] Get transactions error:", error);
        res.status(500).json({ message: "Failed to get transactions" });
    }
});

/**
 * POST /api/seller/payout/request
 * Request payout
 */
sellerRouter.post("/api/seller/payout/request", requireAuth, getSellerProfile, requireApprovedSeller, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;
        const userId = (req.user as any).id;

        const parsed = sellerPayoutRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        const result = await sellerWalletService.requestPayout(seller.id, parsed.data.amount, userId);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.status(201).json({
            message: "Payout request submitted",
            payout: result.payout,
        });
    } catch (error) {
        console.error("[Seller Routes] Request payout error:", error);
        res.status(500).json({ message: "Failed to request payout" });
    }
});

/**
 * GET /api/seller/payouts
 * Get payout history
 */
sellerRouter.get("/api/seller/payouts", requireAuth, getSellerProfile, requireApprovedSeller, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const status = req.query.status as string | undefined;

        const result = await sellerWalletService.getPayoutHistory(seller.id, status as any, page, limit);

        res.json({
            payouts: result.payouts,
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
        });
    } catch (error) {
        console.error("[Seller Routes] Get payouts error:", error);
        res.status(500).json({ message: "Failed to get payouts" });
    }
});

// ============================================================================
// SELLER PRODUCT ROUTES
// ============================================================================

/**
 * GET /api/seller/products
 * List seller's products
 */
sellerRouter.get("/api/seller/products", requireAuth, getSellerProfile, requireApprovedSeller, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const status = req.query.status as string | undefined;
        const search = req.query.search as string | undefined;
        const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;

        const result = await sellerProductService.getSellerProducts(
            seller.id,
            { status: status as any, search, categoryId },
            page,
            limit
        );

        res.json({
            products: result.products,
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
        });
    } catch (error) {
        console.error("[Seller Routes] Get products error:", error);
        res.status(500).json({ message: "Failed to get products" });
    }
});

/**
 * POST /api/seller/products
 * Create a product
 */
sellerRouter.post("/api/seller/products", requireAuth, getSellerProfile, requireApprovedSeller, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;

        const parsed = insertProductSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        const result = await sellerProductService.createProduct(seller.id, parsed.data);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.status(201).json({
            message: "Product created and submitted for review",
            product: result.product,
        });
    } catch (error) {
        console.error("[Seller Routes] Create product error:", error);
        res.status(500).json({ message: "Failed to create product" });
    }
});

/**
 * GET /api/seller/products/:id
 * Get product details
 */
sellerRouter.get("/api/seller/products/:id", requireAuth, getSellerProfile, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;
        const productId = parseParamId(req.params.id);

        const product = await sellerProductService.getSellerProductById(seller.id, productId);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json(product);
    } catch (error) {
        console.error("[Seller Routes] Get product error:", error);
        res.status(500).json({ message: "Failed to get product" });
    }
});

/**
 * PUT /api/seller/products/:id
 * Update a product
 */
sellerRouter.put("/api/seller/products/:id", requireAuth, getSellerProfile, requireApprovedSeller, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;
        const productId = parseParamId(req.params.id);

        const parsed = insertProductSchema.partial().safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        // Check if changes require re-moderation
        const significantFields = ["name", "description", "price", "images"];
        const requiresReModeration = significantFields.some((f) => f in parsed.data);

        const result = await sellerProductService.updateProduct(
            seller.id,
            productId,
            parsed.data,
            requiresReModeration
        );

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({
            message: requiresReModeration
                ? "Product updated and submitted for re-review"
                : "Product updated successfully",
            product: result.product,
        });
    } catch (error) {
        console.error("[Seller Routes] Update product error:", error);
        res.status(500).json({ message: "Failed to update product" });
    }
});

/**
 * DELETE /api/seller/products/:id
 * Delete (disable) a product
 */
sellerRouter.delete("/api/seller/products/:id", requireAuth, getSellerProfile, requireApprovedSeller, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;
        const productId = parseParamId(req.params.id);

        const result = await sellerProductService.deleteProduct(seller.id, productId);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("[Seller Routes] Delete product error:", error);
        res.status(500).json({ message: "Failed to delete product" });
    }
});

/**
 * PATCH /api/seller/products/:id/stock
 * Update product stock
 */
sellerRouter.patch("/api/seller/products/:id/stock", requireAuth, getSellerProfile, requireApprovedSeller, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;
        const productId = parseParamId(req.params.id);

        const { quantity, operation } = req.body;

        if (typeof quantity !== "number" || !["set", "add", "subtract"].includes(operation)) {
            return res.status(400).json({ message: "Invalid quantity or operation" });
        }

        const result = await sellerProductService.updateStock(seller.id, productId, quantity, operation);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({
            message: "Stock updated successfully",
            newStock: result.newStock,
        });
    } catch (error) {
        console.error("[Seller Routes] Update stock error:", error);
        res.status(500).json({ message: "Failed to update stock" });
    }
});

// ============================================================================
// SELLER ORDER ROUTES
// ============================================================================

/**
 * GET /api/seller/orders
 * List seller's orders
 */
sellerRouter.get("/api/seller/orders", requireAuth, getSellerProfile, requireApprovedSeller, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const status = req.query.status as string | undefined;

        const result = await sellerOrderService.getSellerOrders(
            seller.id,
            { status: status as any },
            page,
            limit
        );

        res.json({
            orders: result.orders,
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
        });
    } catch (error) {
        console.error("[Seller Routes] Get orders error:", error);
        res.status(500).json({ message: "Failed to get orders" });
    }
});

/**
 * GET /api/seller/orders/:id
 * Get order details
 */
sellerRouter.get("/api/seller/orders/:id", requireAuth, getSellerProfile, requireApprovedSeller, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;
        const orderId = parseParamId(req.params.id);

        const order = await sellerOrderService.getSellerOrderById(orderId, seller.id);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.json(order);
    } catch (error) {
        console.error("[Seller Routes] Get order error:", error);
        res.status(500).json({ message: "Failed to get order" });
    }
});

/**
 * PUT /api/seller/orders/:id/status
 * Update order status
 */
sellerRouter.put("/api/seller/orders/:id/status", requireAuth, getSellerProfile, requireApprovedSeller, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;
        const orderId = parseParamId(req.params.id);
        const userId = (req.user as any).id;

        const parsed = sellerOrderStatusUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        // Verify ownership
        const order = await sellerOrderService.getSellerOrderById(orderId, seller.id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const result = await sellerOrderService.updateStatus(orderId, parsed.data.status, {
            trackingNumber: parsed.data.trackingNumber,
            shippingProvider: parsed.data.shippingProvider,
            estimatedDelivery: parsed.data.estimatedDelivery
                ? new Date(parsed.data.estimatedDelivery)
                : undefined,
            note: parsed.data.sellerNote,
            updatedBy: userId,
        });

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({ message: "Order status updated" });
    } catch (error) {
        console.error("[Seller Routes] Update order status error:", error);
        res.status(500).json({ message: "Failed to update order status" });
    }
});

/**
 * GET /api/seller/return-requests
 * Get return requests
 */
sellerRouter.get("/api/seller/return-requests", requireAuth, getSellerProfile, requireApprovedSeller, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const status = req.query.status as string | undefined;

        const result = await sellerOrderService.getReturnRequestsForSeller(
            seller.id,
            { status },
            page,
            limit
        );

        res.json({
            requests: result.requests,
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
        });
    } catch (error) {
        console.error("[Seller Routes] Get return requests error:", error);
        res.status(500).json({ message: "Failed to get return requests" });
    }
});

/**
 * PUT /api/seller/return-requests/:id/respond
 * Respond to return request
 */
sellerRouter.put("/api/seller/return-requests/:id/respond", requireAuth, getSellerProfile, requireApprovedSeller, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;
        const userId = (req.user as any).id;
        const requestId = parseParamId(req.params.id);

        const parsed = returnResponseSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        const result = await sellerOrderService.respondToReturnRequest(
            requestId,
            seller.id,
            userId,
            parsed.data.action,
            parsed.data.response
        );

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({ message: "Return request updated successfully" });
    } catch (error) {
        console.error("[Seller Routes] Respond return request error:", error);
        res.status(500).json({ message: "Failed to respond to return request" });
    }
});

// ============================================================================
// SELLER NOTIFICATION ROUTES
// ============================================================================

/**
 * GET /api/seller/notifications
 * Get notifications
 */
sellerRouter.get("/api/seller/notifications", requireAuth, getSellerProfile, async (req: Request, res: Response) => {
    try {
        const seller = (req as any).seller;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
        const unreadOnly = req.query.unread === "true";

        const notifications = await db.query.sellerNotifications.findMany({
            where: unreadOnly
                ? eq(sellerNotifications.sellerId, seller.id) && eq(sellerNotifications.isRead, false)
                : eq(sellerNotifications.sellerId, seller.id),
            orderBy: (n, { desc }) => [desc(n.createdAt)],
            limit,
            offset: (page - 1) * limit,
        });

        res.json({ notifications });
    } catch (error) {
        console.error("[Seller Routes] Get notifications error:", error);
        res.status(500).json({ message: "Failed to get notifications" });
    }
});

/**
 * PUT /api/seller/notifications/:id/read
 * Mark notification as read
 */
sellerRouter.put("/api/seller/notifications/:id/read", requireAuth, getSellerProfile, async (req: Request, res: Response) => {
    try {
        const notificationId = parseParamId(req.params.id);

        await db
            .update(sellerNotifications)
            .set({ isRead: true, readAt: new Date() })
            .where(eq(sellerNotifications.id, notificationId));

        res.json({ message: "Notification marked as read" });
    } catch (error) {
        console.error("[Seller Routes] Mark notification read error:", error);
        res.status(500).json({ message: "Failed to mark notification as read" });
    }
});

// ============================================================================
// ADMIN SELLER MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/admin/sellers
 * List all sellers
 */
sellerRouter.get("/api/admin/sellers", requireAuth, restrictTo("admin", "manager"), async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const status = req.query.status as string | undefined;

        const result = await sellerOnboardingService.getAllSellers(
            { status: status as any },
            page,
            limit
        );

        res.json({
            sellers: result.sellers,
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
        });
    } catch (error) {
        console.error("[Seller Routes] Admin get sellers error:", error);
        res.status(500).json({ message: "Failed to get sellers" });
    }
});

/**
 * GET /api/admin/sellers/pending
 * Get pending seller applications
 */
sellerRouter.get("/api/admin/sellers/pending", requireAuth, restrictTo("admin", "manager"), async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

        const result = await sellerOnboardingService.getPendingSellers(page, limit);

        res.json({
            sellers: result.sellers,
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
        });
    } catch (error) {
        console.error("[Seller Routes] Admin get pending sellers error:", error);
        res.status(500).json({ message: "Failed to get pending sellers" });
    }
});

/**
 * GET /api/admin/sellers/:id
 * Get seller details
 */
sellerRouter.get("/api/admin/sellers/:id", requireAuth, restrictTo("admin", "manager"), async (req: Request, res: Response) => {
    try {
        const sellerId = parseParamId(req.params.id);
        const seller = await sellerOnboardingService.getSellerById(sellerId);

        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        // Get wallet info
        const wallet = await sellerWalletService.getWallet(sellerId);

        res.json({ seller, wallet });
    } catch (error) {
        console.error("[Seller Routes] Admin get seller error:", error);
        res.status(500).json({ message: "Failed to get seller" });
    }
});

/**
 * PUT /api/admin/sellers/:id/action
 * Admin action on seller (approve/reject/suspend/blacklist/reactivate)
 */
sellerRouter.put("/api/admin/sellers/:id/action", requireAuth, restrictTo("admin"), async (req: Request, res: Response) => {
    try {
        const sellerId = parseParamId(req.params.id);
        const adminId = (req.user as any).id;

        const parsed = adminSellerActionSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        let result;

        switch (parsed.data.action) {
            case "approve":
                result = await sellerOnboardingService.approveSeller(sellerId, adminId);
                break;
            case "reject":
                result = await sellerOnboardingService.rejectSeller(sellerId, adminId, parsed.data.reason);
                break;
            case "suspend":
                result = await sellerOnboardingService.suspendSeller(sellerId, adminId, parsed.data.reason);
                break;
            case "blacklist":
                result = await sellerOnboardingService.blacklistSeller(sellerId, adminId, parsed.data.reason);
                break;
            case "reactivate":
                result = await sellerOnboardingService.reactivateSeller(sellerId, adminId);
                break;
            default:
                return res.status(400).json({ message: "Invalid action" });
        }

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({ message: `Seller ${parsed.data.action}d successfully` });
    } catch (error) {
        console.error("[Seller Routes] Admin seller action error:", error);
        res.status(500).json({ message: "Failed to perform action" });
    }
});

// ============================================================================
// ADMIN PRODUCT MODERATION ROUTES
// ============================================================================

/**
 * GET /api/admin/products/pending
 * Get products pending moderation
 */
sellerRouter.get("/api/admin/products/pending", requireAuth, restrictTo("admin", "manager"), async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

        const result = await sellerProductService.getPendingProducts(page, limit);

        res.json({
            products: result.products,
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
        });
    } catch (error) {
        console.error("[Seller Routes] Admin get pending products error:", error);
        res.status(500).json({ message: "Failed to get pending products" });
    }
});

/**
 * PUT /api/admin/products/:id/moderate
 * Approve or reject a product
 */
sellerRouter.put("/api/admin/products/:id/moderate", requireAuth, restrictTo("admin", "manager"), async (req: Request, res: Response) => {
    try {
        const productId = parseParamId(req.params.id);
        const adminId = (req.user as any).id;

        const parsed = adminProductModerationSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        let result;

        if (parsed.data.action === "approve") {
            result = await sellerProductService.approveProduct(productId, adminId);
        } else {
            if (!parsed.data.reason) {
                return res.status(400).json({ message: "Reason is required for rejection" });
            }
            result = await sellerProductService.rejectProduct(productId, adminId, parsed.data.reason);
        }

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({ message: `Product ${parsed.data.action}d successfully` });
    } catch (error) {
        console.error("[Seller Routes] Admin moderate product error:", error);
        res.status(500).json({ message: "Failed to moderate product" });
    }
});

// ============================================================================
// ADMIN COMMISSION ROUTES
// ============================================================================

/**
 * GET /api/admin/commission/rules
 * List commission rules
 */
sellerRouter.get("/api/admin/commission/rules", requireAuth, restrictTo("admin"), async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

        const result = await commissionService.getAllRules({}, page, limit);

        res.json({
            rules: result.rules,
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
        });
    } catch (error) {
        console.error("[Seller Routes] Admin get commission rules error:", error);
        res.status(500).json({ message: "Failed to get commission rules" });
    }
});

/**
 * POST /api/admin/commission/rules
 * Create commission rule
 */
sellerRouter.post("/api/admin/commission/rules", requireAuth, restrictTo("admin"), async (req: Request, res: Response) => {
    try {
        const adminId = (req.user as any).id;

        const parsed = commissionRuleCreateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        const result = await commissionService.createRule(parsed.data as any, adminId);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.status(201).json({
            message: "Commission rule created",
            rule: result.rule,
        });
    } catch (error) {
        console.error("[Seller Routes] Admin create commission rule error:", error);
        res.status(500).json({ message: "Failed to create commission rule" });
    }
});

/**
 * PUT /api/admin/commission/rules/:id
 * Update commission rule
 */
sellerRouter.put("/api/admin/commission/rules/:id", requireAuth, restrictTo("admin"), async (req: Request, res: Response) => {
    try {
        const ruleId = parseParamId(req.params.id);

        const parsed = commissionRuleCreateSchema.partial().safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        const result = await commissionService.updateRule(ruleId, parsed.data as any);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({
            message: "Commission rule updated",
            rule: result.rule,
        });
    } catch (error) {
        console.error("[Seller Routes] Admin update commission rule error:", error);
        res.status(500).json({ message: "Failed to update commission rule" });
    }
});

/**
 * DELETE /api/admin/commission/rules/:id
 * Delete commission rule
 */
sellerRouter.delete("/api/admin/commission/rules/:id", requireAuth, restrictTo("admin"), async (req: Request, res: Response) => {
    try {
        const ruleId = parseParamId(req.params.id);

        const result = await commissionService.deleteRule(ruleId);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({ message: "Commission rule deleted" });
    } catch (error) {
        console.error("[Seller Routes] Admin delete commission rule error:", error);
        res.status(500).json({ message: "Failed to delete commission rule" });
    }
});

// ============================================================================
// ADMIN PAYOUT ROUTES
// ============================================================================

/**
 * GET /api/admin/payouts
 * List all payouts
 */
sellerRouter.get("/api/admin/payouts", requireAuth, restrictTo("admin"), async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const status = (req.query.status as string) || "all";

        const result = await sellerWalletService.getAllPayouts(status, page, limit);

        res.json({
            payouts: result.payouts,
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
        });
    } catch (error) {
        console.error("[Seller Routes] Admin get payouts error:", error);
        res.status(500).json({ message: "Failed to get payouts" });
    }
});

/**
 * PUT /api/admin/payouts/:id/process
 * Process payout (approve/process/complete/fail/cancel)
 */
sellerRouter.put("/api/admin/payouts/:id/process", requireAuth, restrictTo("admin"), async (req: Request, res: Response) => {
    try {
        const payoutId = parseParamId(req.params.id);
        const adminId = (req.user as any).id;

        const { action, transactionId, utrNumber, failureReason, note } = req.body;

        if (!["approve", "process", "complete", "fail", "cancel"].includes(action)) {
            return res.status(400).json({ message: "Invalid action" });
        }

        const result = await sellerWalletService.processPayout(payoutId, adminId, action, {
            transactionId,
            utrNumber,
            failureReason,
            note,
        });

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({ message: `Payout ${action}d successfully` });
    } catch (error) {
        console.error("[Seller Routes] Admin process payout error:", error);
        res.status(500).json({ message: "Failed to process payout" });
    }
});

// ============================================================================
// ADMIN ORDER ROUTES
// ============================================================================

/**
 * GET /api/admin/seller-orders
 * List all seller orders
 */
sellerRouter.get("/api/admin/seller-orders", requireAuth, restrictTo("admin", "manager"), async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const sellerId = req.query.sellerId ? parseInt(req.query.sellerId as string) : undefined;
        const status = req.query.status as string | undefined;

        const result = await sellerOrderService.getAllSellerOrders(
            { sellerId, status: status as any },
            page,
            limit
        );

        res.json({
            orders: result.orders,
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
        });
    } catch (error) {
        console.error("[Seller Routes] Admin get seller orders error:", error);
        res.status(500).json({ message: "Failed to get seller orders" });
    }
});

/**
 * PUT /api/admin/seller-orders/:id/status
 * Admin override order status
 */
sellerRouter.put("/api/admin/seller-orders/:id/status", requireAuth, restrictTo("admin"), async (req: Request, res: Response) => {
    try {
        const orderId = parseParamId(req.params.id);
        const adminId = (req.user as any).id;

        const { status, note } = req.body;

        if (!status || !note) {
            return res.status(400).json({ message: "Status and note are required" });
        }

        const result = await sellerOrderService.adminUpdateStatus(orderId, status, adminId, note);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json({ message: "Order status updated" });
    } catch (error) {
        console.error("[Seller Routes] Admin update order status error:", error);
        res.status(500).json({ message: "Failed to update order status" });
    }
});

// ============================================================================
// ADMIN RETURN REQUEST ROUTES (Dispute Handling)
// ============================================================================

/**
 * GET /api/admin/return-requests
 * List all return requests (for dispute resolution)
 */
sellerRouter.get("/api/admin/return-requests", requireAuth, restrictTo("admin", "manager"), async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const status = (req.query.status as string) || "all";

        const result = await sellerOrderService.getAdminReturnRequests(status, page, limit);

        res.json({
            requests: result.requests,
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
        });
    } catch (error) {
        console.error("[Seller Routes] Admin get return requests error:", error);
        res.status(500).json({ message: "Failed to get return requests" });
    }
});

/**
 * PUT /api/admin/return-requests/:id/resolve
 * Resolve return request dispute
 */
sellerRouter.put("/api/admin/return-requests/:id/resolve", requireAuth, restrictTo("admin", "manager"), async (req: Request, res: Response) => {
    try {
        const returnId = parseParamId(req.params.id);
        const { action, note } = req.body;
        const userId = (req.user as any).id;

        if (!["approve", "reject", "refund"].includes(action)) {
            return res.status(400).json({ message: "Invalid action" });
        }

        const result = await sellerOrderService.updateReturnRequest(returnId, action, note, userId);

        if (!result.success) {
            return res.status(400).json({ message: result.error });
        }

        res.json(result);
    } catch (error) {
        console.error("[Seller Routes] Admin resolve return request error:", error);
        res.status(500).json({ message: "Failed to resolve return request" });
    }
});
