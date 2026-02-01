/**
 * Guest Cart Routes
 * 
 * API routes for session-based guest cart management.
 * These routes allow unauthenticated users to add items to cart,
 * which can then be migrated to their account on login.
 */

import { Router, Request, Response } from "express";
import { guestCheckoutService } from "../services/guestCheckoutService";
import { logger } from "../logger";

export const guestCartRouter = Router();

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Generate a new guest session ID
 * POST /api/guest/session
 */
guestCartRouter.post("/session", (req: Request, res: Response) => {
    const sessionId = guestCheckoutService.generateSessionId();
    res.json({ sessionId });
});

// ============================================================================
// CART OPERATIONS
// ============================================================================

/**
 * Get guest cart items
 * GET /api/guest/cart
 * Header: X-Guest-Session: <sessionId>
 */
guestCartRouter.get("/cart", async (req: Request, res: Response) => {
    const sessionId = req.headers["x-guest-session"] as string;

    if (!sessionId) {
        return res.status(400).json({ error: "Missing X-Guest-Session header" });
    }

    try {
        const items = await guestCheckoutService.getCart(sessionId);
        const summary = await guestCheckoutService.getCartSummary(sessionId);

        res.json({ items, ...summary });
    } catch (error) {
        logger.error("Error fetching guest cart:", error);
        res.status(500).json({ error: "Failed to fetch cart" });
    }
});

/**
 * Add item to guest cart
 * POST /api/guest/cart
 * Header: X-Guest-Session: <sessionId>
 * Body: { productId, quantity, size?, color? }
 */
guestCartRouter.post("/cart", async (req: Request, res: Response) => {
    const sessionId = req.headers["x-guest-session"] as string;

    if (!sessionId) {
        return res.status(400).json({ error: "Missing X-Guest-Session header" });
    }

    const { productId, quantity, size, color } = req.body;

    if (!productId || !quantity) {
        return res.status(400).json({ error: "productId and quantity are required" });
    }

    try {
        const result = await guestCheckoutService.addToCart(sessionId, {
            productId,
            quantity: parseInt(quantity, 10),
            size,
            color
        });

        if (result.success) {
            res.json({ cartItemId: result.cartItemId });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        logger.error("Error adding to guest cart:", error);
        res.status(500).json({ error: "Failed to add item to cart" });
    }
});

/**
 * Update guest cart item
 * PATCH /api/guest/cart/:itemId
 * Header: X-Guest-Session: <sessionId>
 * Body: { quantity }
 */
guestCartRouter.patch("/cart/:itemId", async (req: Request, res: Response) => {
    const sessionId = req.headers["x-guest-session"];
    if (typeof sessionId !== "string" || !sessionId) {
        return res.status(400).json({ error: "Missing or invalid X-Guest-Session header" });
    }

    const itemId = parseInt(req.params.itemId as string, 10);

    const { quantity } = req.body;

    if (quantity === undefined) {
        return res.status(400).json({ error: "quantity is required" });
    }

    try {
        const success = await guestCheckoutService.updateCartItem(
            sessionId,
            itemId,
            parseInt(quantity, 10)
        );

        if (success) {
            res.json({ success: true });
        } else {
            res.status(400).json({ error: "Failed to update item" });
        }
    } catch (error) {
        logger.error("Error updating guest cart:", error);
        res.status(500).json({ error: "Failed to update item" });
    }
});

/**
 * Remove item from guest cart
 * DELETE /api/guest/cart/:itemId
 * Header: X-Guest-Session: <sessionId>
 */
guestCartRouter.delete("/cart/:itemId", async (req: Request, res: Response) => {
    const sessionId = req.headers["x-guest-session"];
    if (typeof sessionId !== "string" || !sessionId) {
        return res.status(400).json({ error: "Missing or invalid X-Guest-Session header" });
    }

    const itemId = parseInt(req.params.itemId as string, 10);

    try {
        const success = await guestCheckoutService.updateCartItem(sessionId, itemId, 0);

        if (success) {
            res.json({ success: true });
        } else {
            res.status(400).json({ error: "Failed to remove item" });
        }
    } catch (error) {
        logger.error("Error removing from guest cart:", error);
        res.status(500).json({ error: "Failed to remove item" });
    }
});

/**
 * Clear entire guest cart
 * DELETE /api/guest/cart
 * Header: X-Guest-Session: <sessionId>
 */
guestCartRouter.delete("/cart", async (req: Request, res: Response) => {
    const sessionId = req.headers["x-guest-session"] as string;

    if (!sessionId) {
        return res.status(400).json({ error: "Missing X-Guest-Session header" });
    }

    try {
        await guestCheckoutService.clearCart(sessionId);
        res.json({ success: true });
    } catch (error) {
        logger.error("Error clearing guest cart:", error);
        res.status(500).json({ error: "Failed to clear cart" });
    }
});

// ============================================================================
// CART MIGRATION (Called after login)
// ============================================================================

/**
 * Migrate guest cart to user account
 * POST /api/guest/cart/migrate
 * Header: X-Guest-Session: <sessionId>
 * Body: { userId } (in production, this would come from auth)
 * 
 * Note: This should typically be called from the auth controller after login
 */
guestCartRouter.post("/cart/migrate", async (req: Request, res: Response) => {
    const sessionId = req.headers["x-guest-session"] as string;

    if (!sessionId) {
        return res.status(400).json({ error: "Missing X-Guest-Session header" });
    }

    // In production, get userId from authenticated session
    const user = (req as any).user;
    if (!user?.id) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        const result = await guestCheckoutService.migrateCartToUser(sessionId, user.id);
        res.json(result);
    } catch (error) {
        logger.error("Error migrating guest cart:", error);
        res.status(500).json({ error: "Failed to migrate cart" });
    }
});
