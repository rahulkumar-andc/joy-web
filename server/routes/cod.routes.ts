import { Router, Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { db } from "../db";
import { orders } from "@shared/schema";
import { eq, and, isNotNull, isNull } from "drizzle-orm";
import { requirePermission } from "../middleware/rbac";
import { logger } from "../logger";
import { AppError } from "../utils/AppError";

const router = Router();

/**
 * GET /api/admin/orders/cod-pending
 * Get all COD orders pending collection
 */
router.get(
    "/cod-pending",
    requirePermission("orders", "read"),
    catchAsync(async (req: Request, res: Response) => {
        const codOrders = await db
            .select()
            .from(orders)
            .where(
                and(
                    isNotNull(orders.codAmount),
                    eq(orders.codCollected, false),
                    eq(orders.orderState, "DELIVERED")
                )
            )
            .orderBy(orders.createdAt);

        res.json({ orders: codOrders });
    })
);

/**
 * POST /api/admin/orders/:id/collect-cod
 * Mark COD as collected (admin/delivery person)
 */
router.post(
    "/:id/collect-cod",
    requirePermission("orders", "update"),
    catchAsync(async (req: Request, res: Response) => {
        const orderId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
        const { amountCollected, notes } = req.body;
        const userId = (req.user as any).id;

        // Get order
        const [order] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, orderId));

        if (!order) {
            throw new AppError("Order not found", 404);
        }

        if (!order.codAmount) {
            throw new AppError("Order is not COD", 400);
        }

        if (order.codCollected) {
            throw new AppError("COD already collected", 400);
        }

        // Verify amount if provided
        if (amountCollected && Number(amountCollected) !== Number(order.codAmount)) {
            logger.warn("COD amount mismatch", {
                orderId: order.id,
                expected: order.codAmount,
                collected: amountCollected,
            });
        }

        // Update order
        await db
            .update(orders)
            .set({
                codCollected: true,
                codCollectedAt: new Date(),
                codCollectedBy: userId,
                paymentStatus: "paid",
                orderState: "DELIVERED",
            })
            .where(eq(orders.id, orderId));

        // Send confirmation email
        try {
            const { sendEmail } = await import("../services/emailService");
            const { codCollectedTemplate } = await import("../services/emailTemplates");
            const { userRepository } = await import("../repositories/userRepository");

            const user = await userRepository.findById(order.userId);
            if (user) {
                await sendEmail(
                    user.email,
                    `Payment Received - Order #${orderId}`,
                    codCollectedTemplate(user.name, orderId, order.codAmount.toString())
                );
            }
        } catch (emailError) {
            logger.error("Failed to send COD collection email", emailError);
        }

        logger.info("COD collected successfully", {
            orderId: order.id,
            amount: order.codAmount,
            collectedBy: userId,
        });

        res.json({
            success: true,
            message: "COD collected successfully",
        });
    })
);

/**
 * GET /api/admin/orders/cod-stats
 * Get COD collection statistics
 */
router.get(
    "/cod-stats",
    requirePermission("reports", "read"),
    catchAsync(async (req: Request, res: Response) => {
        const pendingCOD = await db
            .select()
            .from(orders)
            .where(
                and(
                    isNotNull(orders.codAmount),
                    eq(orders.codCollected, false)
                )
            );

        const collectedCOD = await db
            .select()
            .from(orders)
            .where(
                and(
                    isNotNull(orders.codAmount),
                    eq(orders.codCollected, true)
                )
            );

        const totalPending = pendingCOD.reduce(
            (sum, order) => sum + Number(order.codAmount || 0),
            0
        );
        const totalCollected = collectedCOD.reduce(
            (sum, order) => sum + Number(order.codAmount || 0),
            0
        );

        res.json({
            pending: {
                count: pendingCOD.length,
                amount: totalPending,
            },
            collected: {
                count: collectedCOD.length,
                amount: totalCollected,
            },
        });
    })
);

export default router;
