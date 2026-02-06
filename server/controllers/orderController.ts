import { Request, Response } from "express";
import crypto from "crypto";
import { api } from "@shared/routes";
import { orderRepository } from "../repositories/orderRepository";
import { cartRepository } from "../repositories/cartRepository";
import { productRepository } from "../repositories/productRepository";
import { userRepository } from "../repositories/userRepository";
import { emailService } from "../services/email";
import { pushNotificationService } from "../services/pushNotificationService";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { AuditService } from "../services/auditService";
import { NotificationService } from "../services/notificationService";
import { cacheService, CacheKeys, CacheTTL } from "../cache";
import { withTransaction } from "../utils/transactionHelpers";
import { products, cartItems as cartItemsTable } from "@shared/schema";
import { sql, eq } from "drizzle-orm";
import { stockReservationService } from "../services/stockReservationService";
import { logger } from "../logger";
import { couponService } from "../services/couponService";
import { shippingSettingsService } from "../services/shippingSettingsService";
import { webSocketService } from "../services/websocketService";

export class OrderController {

    // === CART ===
    static getCart = catchAsync(async (req: Request, res: Response) => {
        const userId = req.user ? (req.user as any).id : undefined;
        const sessionId = req.sessionID;
        const cacheKey = userId ? CacheKeys.USER_CART(userId) : (sessionId ? CacheKeys.SESSION_CART(sessionId) : null);

        if (!cacheKey) {
            // Fallback if neither exists (unlikely given session middleware)
            return res.json([]);
        }

        const cart = await cacheService.getOrSet(
            cacheKey,
            async () => {
                return await cartRepository.getCart(userId, sessionId);
            },
            CacheTTL.USER_DATA
        );

        res.json(cart.map((c: any) => ({ item: c, product: c.product })));
    });

    static addToCart = catchAsync(async (req: Request, res: Response) => {
        const { productId, quantity, size, color } = api.cart.add.input.parse(req.body);
        const userId = req.user ? (req.user as any).id : undefined;
        const sessionId = req.sessionID;
        const cacheKey = userId ? CacheKeys.USER_CART(userId) : (sessionId ? CacheKeys.SESSION_CART(sessionId) : null);

        await cartRepository.addToCart({
            userId,
            sessionId: userId ? null : sessionId,
            productId,
            quantity,
            size: size || null,
            color: color || null
        });

        // Invalidate cache
        if (cacheKey) await cacheService.del(cacheKey);

        // Return the updated cart after adding the item (consistent with frontend expectation)
        // We fetch fresh data and re-cache it immediately to keep cache warm
        const cart = await cartRepository.getCart(userId, userId ? undefined : sessionId);

        if (cacheKey) await cacheService.set(cacheKey, cart, CacheTTL.USER_DATA);

        res.json(cart.map((c: any) => ({ item: c, product: c.product })));
    });

    static updateCartItem = catchAsync(async (req: Request, res: Response) => {
        const { quantity } = api.cart.update.input.parse(req.body);
        const updated = await cartRepository.updateCartItem(Number(req.params.id), quantity);
        if (!updated) throw new AppError("Cart item not found", 404);

        // Invalidate cache logic
        const userId = req.user ? (req.user as any).id : updated.userId;
        const sessionId = req.sessionID;
        const cacheKey = userId ? CacheKeys.USER_CART(userId) : (sessionId ? CacheKeys.SESSION_CART(sessionId) : null);

        if (cacheKey) await cacheService.del(cacheKey);

        res.json(updated);
    });

    static removeFromCart = catchAsync(async (req: Request, res: Response) => {
        await cartRepository.removeFromCart(Number(req.params.id));

        const userId = req.user ? (req.user as any).id : undefined;
        const sessionId = req.sessionID;
        const cacheKey = userId ? CacheKeys.USER_CART(userId) : (sessionId ? CacheKeys.SESSION_CART(sessionId) : null);

        if (cacheKey) await cacheService.del(cacheKey);

        res.status(204).send();
    });

    // === ORDERS ===
    static createOrder = catchAsync(async (req: Request, res: Response) => {
        if (!req.isAuthenticated()) throw new AppError("Login required", 401);

        const { shippingAddress, couponCode } = api.orders.create.input.parse(req.body);
        const userId = (req.user as any).id;

        // Check for reseller attribution cookie
        let resellerLinkId = req.cookies?.reseller_link ? parseInt(req.cookies.reseller_link) : null;
        let referredByReseller: number | null = null;

        // If reseller link exists, fetch reseller info
        // If reseller link exists, fetch reseller info
        if (resellerLinkId) {
            try {
                const { resellerService } = await import("../modules/reseller/reseller.service");
                const { fraudDetectionService } = await import("../modules/reseller/fraud-detection.service");

                const link = await resellerService.getLinkById(resellerLinkId);
                if (link) {
                    // FRAUD CHECK
                    // We need buyer email and IP. 
                    // req.user is guaranteed locally by isAuthenticated check above, but TypeScript needs help.
                    const user = await userRepository.findById(userId);
                    const buyerIp = req.ip || "0.0.0.0";

                    if (user) {
                        const fraudCheck = await fraudDetectionService.checkOrderFraud(
                            link.resellerId,
                            0, // Order ID not known yet
                            user.email,
                            user.phone,
                            buyerIp
                        );

                        if (fraudCheck.shouldBlock) {
                            logger.warn(`Reseller attribution blocked due to fraud risk`, {
                                resellerId: link.resellerId,
                                userId,
                                flags: fraudCheck.flags
                            });
                            // Remove attribution
                            resellerLinkId = null;
                            referredByReseller = null;
                        } else {
                            referredByReseller = link.resellerId;
                        }
                    }
                }
            } catch (error) {
                logger.warn("Failed to fetch reseller link or check fraud", { resellerLinkId, error });
            }
        }

        // Get cart items to convert to order
        const cartItems = await cartRepository.getCart(userId);
        if (cartItems.length === 0) throw new AppError("Cart empty", 400);

        let totalAmount = cartItems.reduce((sum: number, item: any) => {
            const price = Number(item.product.salePrice) > 0
                ? Number(item.product.salePrice)
                : Number(item.product.mrp);
            return sum + (price * item.quantity);
        }, 0);
        let discountAmount = 0;
        let validatedCoupon: { couponId: number; discountAmount: number } | null = null;

        // Validate and apply coupon if provided
        if (couponCode) {
            const validation = await couponService.validateCoupon(couponCode, userId, totalAmount);

            if (!validation.valid) {
                throw new AppError(validation.error || "Invalid coupon", 400);
            }

            discountAmount = validation.discountAmount || 0;
            totalAmount = validation.finalAmount || totalAmount;
            validatedCoupon = {
                couponId: validation.couponId!,
                discountAmount
            };

            logger.info(`Coupon applied: ${couponCode}`, {
                userId,
                discountAmount,
                finalAmount: totalAmount
            });
        }

        // Calculate Shipping
        const shippingCalc = await shippingSettingsService.calculateShipping(totalAmount);
        const shippingCost = shippingCalc.shippingCost;
        totalAmount += shippingCost;

        // ⚠️ PHASE 1: Reserve stock BEFORE creating order
        // This prevents overselling in concurrent checkout scenarios
        let reservationId: number | null = null;
        try {
            reservationId = await stockReservationService.reserveStock(
                cartItems.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity
                })),
                userId
            );

            logger.info(`Stock reserved for user ${userId}`, { reservationId });
        } catch (error: any) {
            // Stock reservation failed (insufficient stock)
            throw new AppError(error.message || "Failed to reserve stock", 400);
        }

        // ⚠️ PHASE 2: Create order in transaction
        // If this fails, we'll release the reservation in the catch block
        let order;
        try {
            order = await withTransaction(async (tx) => {
                // 1. Create order with order items (repository handles this internally)
                // 1. Create order with order items (repository handles this internally)
                const isFreeOrder = totalAmount <= 0;

                const newOrder = await orderRepository.createOrder({
                    userId,
                    totalAmount: totalAmount.toString(),
                    shippingCost: shippingCost.toString(),
                    shippingAddress,
                    orderState: isFreeOrder ? "CONFIRMED" : "CREATED",
                    status: isFreeOrder ? "paid" : "pending",
                    paymentStatus: isFreeOrder ? "paid" : "pending",
                    stateVersion: 1,
                    stateHistory: [],
                    orderIdempotencyKey: crypto.randomUUID(),
                    invoiceId: null,
                    refundStatus: "none",
                    deliveredAt: null,
                    resellerLinkId: resellerLinkId || null,
                    referredByReseller: referredByReseller || null,
                    courierName: null,
                    trackingNumber: null,
                    estimatedDeliveryDate: null,

                    // COD Defaults
                    codAmount: null,
                    codCollected: false,
                    codCollectedAt: null,
                    codCollectedBy: null,
                    deliveryInstructions: null,

                    // In-House Delivery Defaults
                    assignedCourier: null,
                    deliveryStatus: "pending",
                    proofOfDeliveryImage: null,
                    podLocation: null,
                    podTimestamp: null,
                    isSuspiciousDelivery: false,
                    suspiciousReason: null,

                    // COD Settlement Defaults
                    paymentSettled: false,
                    settlementTimestamp: null,
                    settledBy: null,
                }, cartItems.map((item: any) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: Number(item.product.salePrice) > 0
                        ? Number(item.product.salePrice)
                        : Number(item.product.mrp),
                    size: item.size ?? undefined,
                    color: item.color ?? undefined
                })));

                // 2. Update stock quantities atomically
                for (const item of cartItems) {
                    await tx
                        .update(products)
                        .set({
                            stockQuantity: sql`${products.stockQuantity} - ${item.quantity}`
                        })
                        .where(eq(products.id, item.productId));
                }

                // 3. Clear user's cart atomically
                await tx.delete(cartItemsTable).where(eq(cartItemsTable.userId, userId));

                return newOrder;
            });

            // ⚠️ PHASE 3: Mark reservation as consumed (order successfully created)
            if (reservationId) {
                await stockReservationService.consumeReservation(reservationId, order.id);
                logger.info(`Stock reservation consumed`, { reservationId, orderId: order.id });

                // Record coupon usage if coupon was applied
                if (validatedCoupon) {
                    try {
                        await couponService.recordUsage(validatedCoupon.couponId, userId, order.id);
                        logger.info(`Coupon usage recorded`, { couponId: validatedCoupon.couponId, userId, orderId: order.id, discountAmount: validatedCoupon.discountAmount });
                    } catch (couponError) {
                        logger.error("Failed to record coupon usage", couponError);
                    }
                }

                // Mark reseller click as converted & Create Pending Commission
                if (resellerLinkId) {
                    try {
                        const { resellerService } = await import("../modules/reseller/reseller.service");

                        // 1. Mark click converted
                        await resellerService.markClickAsConverted(resellerLinkId, order.id);

                        // 2. Create Pending Commission immediately
                        const link = await resellerService.getLinkById(resellerLinkId);
                        if (link) {
                            await resellerService.createCommission(
                                link.resellerId,
                                order.id,
                                parseFloat(order.totalAmount),
                                resellerLinkId
                            );
                            logger.info(`Pending commission created for order ${order.id}`, { resellerId: link.resellerId });
                        }

                    } catch (resellerError) {
                        logger.error("Failed to process reseller attribution", resellerError);
                    }
                }
            }

        } catch (error) {
            // Order creation failed - release the stock reservation
            if (reservationId) {
                await stockReservationService.releaseReservation(reservationId);
                logger.warn(`Order creation failed, reservation released`, { reservationId });
            }
            throw error; // Re-throw to be handled by catchAsync
        }

        // Send Order Confirmation - ONLY IF FREE/PAID (Zero Amount)
        // For regular payments, the email is sent by PaymentController after successful payment
        if (totalAmount <= 0) {
            const user = await userRepository.findById(userId);
            if (user) {
                emailService.sendOrderConfirmation({
                    email: user.email,
                    name: user.name,
                }, {
                    id: order.id,
                    totalAmount: order.totalAmount,
                    items: cartItems.map((item: any) => ({
                        name: item.product.name,
                        quantity: item.quantity,
                        price: item.product.mrp
                    }))
                });
            }
        }

        // Invalidate product cache so stock quantities update immediately
        await cacheService.invalidateProducts();

        res.status(201).json(order);
    });

    static listOrders = catchAsync(async (req: Request, res: Response) => {
        if (!req.isAuthenticated()) throw new AppError("Login required", 401);

        if ((req.user as any).role === 'admin') {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const result = await orderRepository.getAllOrders(page, limit);
            return res.json(result.orders);
        }

        const orders = await orderRepository.getOrders((req.user as any).id);
        res.json(orders);
    });

    static getAllOrders = catchAsync(async (req: Request, res: Response) => {
        if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
            throw new AppError("Admin access required", 403);
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string;
        const search = req.query.search as string;

        const result = await orderRepository.getAllOrders(page, limit, { status, search });
        res.json(result);
    });

    // GET /api/orders/:id - Get single order for tracking
    static getOrderById = catchAsync(async (req: Request, res: Response) => {
        if (!req.isAuthenticated()) throw new AppError("Login required", 401);

        const orderId = parseInt(req.params.id as string);
        const userId = (req.user as any).id;
        const isAdmin = (req.user as any).role === "admin";

        const order = await orderRepository.getById(orderId);
        if (!order) throw new AppError("Order not found", 404);

        // Ensure user can only view their own orders (unless admin)
        if (!isAdmin && order.userId !== userId) {
            throw new AppError("Unauthorized", 403);
        }

        // Fetch order items
        const items = await orderRepository.getOrderItems(orderId);

        res.json({ ...order, items });
    });

    // User: Update/Cancel Order
    static updateOrder = catchAsync(async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string);
        const { status } = req.body;
        const userId = (req.user as any).id;

        // Currently only cancellation is supported for users
        if (status !== 'cancelled') {
            throw new AppError("Users can only cancel orders", 400);
        }

        const order = await orderRepository.getById(id);
        if (!order) throw new AppError("Order not found", 404);
        if (order.userId !== userId) throw new AppError("Unauthorized", 403);

        if (!["pending", "created", "confirmed", "payment_pending"].includes(order.status)) {
            throw new AppError("Order cannot be cancelled in current status", 400);
        }

        // Perform cancellation
        const updated = await orderRepository.updateOrderStatus(id, "cancelled");

        // ⚠️ STOCK RELEASE: Add back stock for cancelled items
        try {
            const items = await orderRepository.getOrderItems(id);
            const { db } = await import("../db");
            const { products } = await import("@shared/schema");
            const { eq, sql } = await import("drizzle-orm");

            await withTransaction(async (tx) => {
                for (const item of items) {
                    await tx
                        .update(products)
                        .set({
                            stockQuantity: sql`${products.stockQuantity} + ${item.quantity}`
                        })
                        .where(eq(products.id, item.productId));
                }
            });
            logger.info(`Stock released for cancelled order ${id}`);
        } catch (stockError) {
            logger.error("Failed to release stock for cancelled order", { orderId: id, error: stockError });
        }

        // ⚠️ REFUND IMPACT: Cancel commission when order is cancelled
        if (updated && updated.resellerLinkId) {
            try {
                const { resellerService } = await import("../modules/reseller/reseller.service");
                const { db } = await import("../db");
                const { resellerCommissions } = await import("@shared/schema");
                const { eq } = await import("drizzle-orm");

                const commission = await db.query.resellerCommissions.findFirst({
                    where: eq(resellerCommissions.orderId, updated.id)
                });

                if (commission) {
                    await resellerService.cancelCommission(
                        commission.id,
                        `Order cancelled by user`
                    );
                    logger.info(`Commission cancelled for order ${updated.id}`, { commissionId: commission.id });
                }
            } catch (refundError) {
                logger.error("Failed to cancel commission", { orderId: updated.id, error: refundError });
            }
        }

        // Notify User
        const user = await userRepository.findById(userId);
        if (user) {
            await NotificationService.notifyOrderStatusChange(user.email, id, "cancelled", user.name);
            await emailService.sendOrderCancelled(
                { email: user.email, name: user.name },
                id
            );
        }

        res.json(updated);
    });

    static updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string);
        const { status, courierName, trackingNumber, estimatedDeliveryDate } = req.body;

        const validStatuses = ["pending", "paid", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"];
        if (!validStatuses.includes(status)) {
            throw new AppError("Invalid status", 400);
        }

        // Validation: Courier & Tracking only allowed when status is SHIPPED
        if ((courierName || trackingNumber || estimatedDeliveryDate) && status !== 'shipped') {
            throw new AppError("Courier, Tracking, and Estimated Delivery details can only be added when status is SHIPPED", 400);
        }

        const updated = await orderRepository.updateOrderStatus(id, status, courierName, trackingNumber, estimatedDeliveryDate);
        if (!updated) throw new AppError("Order not found", 404);

        // Audit Log
        if (req.user) {
            await AuditService.logAction(
                (req.user as any).id,
                "UPDATE_ORDER_STATUS",
                "ORDER",
                id,
                { status }
            );
        }

        // Notify User
        // Need to fetch user email. updated order might need to join user or we fetch user.
        // Assuming updated order has userId.
        const user = await userRepository.findById(updated.userId);
        if (user) {
            await NotificationService.notifyOrderStatusChange(user.email, id, status, user.name);

            // Send email notifications based on status
            if (status === "shipped") {
                await emailService.sendOrderShipped(
                    { email: user.email, name: user.name },
                    id,
                    courierName,
                    trackingNumber,
                    estimatedDeliveryDate
                );
                // Send browser push notification
                await pushNotificationService.sendOrderUpdate(updated.userId, id, status);
            } else if (status === "delivered") {
                await emailService.sendOrderDelivered(
                    { email: user.email, name: user.name },
                    id
                );
                await pushNotificationService.sendOrderUpdate(updated.userId, id, status);
            } else if (status === "cancelled") {
                await emailService.sendOrderCancelled(
                    { email: user.email, name: user.name },
                    id
                );
                await pushNotificationService.sendOrderUpdate(updated.userId, id, status);
            }

            // 🔴 WebSocket: Broadcast real-time order status update to customer
            webSocketService.broadcastToUser(updated.userId, 'ORDER_STATUS_UPDATE', {
                orderId: updated.id,
                status: updated.status,
                deliveryStatus: updated.deliveryStatus,
                courierName: updated.courierName,
                trackingNumber: updated.trackingNumber,
                estimatedDeliveryDate: updated.estimatedDeliveryDate
            });
        }

        // ⚠️ COMMISSION CALCULATION: Trigger when order is delivered
        // ⚠️ COMMISSION CALCULATION: Confirm commission when order is delivered
        if (status === "delivered" && updated.resellerLinkId) {
            try {
                const { resellerService } = await import("../modules/reseller/reseller.service");

                // Find pending commission
                const { db } = await import("../db");
                const { resellerCommissions } = await import("@shared/schema");
                const { eq, and } = await import("drizzle-orm");

                const commission = await db.query.resellerCommissions.findFirst({
                    where: and(
                        eq(resellerCommissions.orderId, updated.id),
                        eq(resellerCommissions.status, "pending")
                    )
                });

                if (commission) {
                    await resellerService.confirmCommission(commission.id);
                    logger.info(`Commission confirmed for order ${updated.id}`, { commissionId: commission.id });
                } else {
                    logger.warn(`No pending commission found to confirm for order ${updated.id}`);
                }
            } catch (commissionError) {
                logger.error("Failed to confirm commission", { orderId: updated.id, error: commissionError });
            }
        }

        // ⚠️ REFUND IMPACT: Cancel commission when order is cancelled
        if (status === "cancelled" && updated.resellerLinkId) {
            try {
                const { resellerService } = await import("../modules/reseller/reseller.service");
                // Find commission for this order
                const { db } = await import("../db");
                const { resellerCommissions } = await import("@shared/schema");
                const { eq } = await import("drizzle-orm");

                const commission = await db.query.resellerCommissions.findFirst({
                    where: eq(resellerCommissions.orderId, updated.id)
                });

                if (commission) {
                    await resellerService.cancelCommission(
                        commission.id,
                        `Order cancelled by ${req.user ? 'admin' : 'system'}`
                    );

                    logger.info(`Commission cancelled for order ${updated.id}`, {
                        commissionId: commission.id
                    });
                }
            } catch (refundError) {
                logger.error("Failed to cancel commission", { orderId: updated.id, error: refundError });
            }
        }

        res.json(updated);
    });
}
