import { db } from "../../db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import {
    sellerOrders,
    sellerOrderItems,
    sellerProfiles,
    sellerNotifications,
    commissionRules,
    SellerOrder,
    SellerOrderItem,
    SELLER_ORDER_TRANSITIONS,
    PAYOUT_HOLD_DAYS,
    DEFAULT_COMMISSION_RATE,
    sellerReturnRequests,
    RETURN_STATUS_TRANSITIONS,
    type SellerReturnRequest, // Import Type
} from "@shared/seller-schema";
import { orders, orderItems, products, categories } from "@shared/schema";
import { sellerWalletService } from "./sellerWalletService";

// ============================================================================
// SELLER ORDER SERVICE
// Handles order splitting, status management, and seller order views
// ============================================================================

interface OrderItemWithProduct {
    id: number;
    orderId: number;
    productId: number;
    quantity: number;
    price: string;
    size?: string | null;
    color?: string | null;
    product: {
        id: number;
        name: string;
        sku?: string | null;
        sellerId: number | null;
        categoryId: number | null;
    };
}

class SellerOrderService {
    /**
     * Generate unique seller order number
     */
    private async generateSellerOrderNumber(sellerId: number): Promise<string> {
        const count = await db
            .select({ count: sql<number>`count(*)` })
            .from(sellerOrders)
            .where(eq(sellerOrders.sellerId, sellerId));

        const seller = await db.query.sellerProfiles.findFirst({
            where: eq(sellerProfiles.id, sellerId),
        });

        const shopCode = seller?.shopName.substring(0, 3).toUpperCase() || "SEL";
        return `SO-${shopCode}-${String(Number(count[0].count) + 1).padStart(5, "0")}`;
    }

    /**
     * Calculate commission for a product
     * Priority: Seller-specific > Category-specific > Default
     */
    async calculateCommission(
        productId: number,
        sellerId: number,
        amount: number
    ): Promise<{ commission: number; rate: number }> {
        // Get product for category
        const product = await db.query.products.findFirst({
            where: eq(products.id, productId),
        });

        // 1. Check for seller-specific rule
        const sellerRule = await db.query.commissionRules.findFirst({
            where: and(
                eq(commissionRules.sellerId, sellerId),
                eq(commissionRules.isActive, true)
            ),
            orderBy: [desc(commissionRules.priority)],
        });

        if (sellerRule) {
            return this.applyRule(sellerRule, amount);
        }

        // 2. Check for category-specific rule
        if (product?.categoryId) {
            const categoryRule = await db.query.commissionRules.findFirst({
                where: and(
                    eq(commissionRules.categoryId, product.categoryId),
                    eq(commissionRules.isActive, true)
                ),
                orderBy: [desc(commissionRules.priority)],
            });

            if (categoryRule) {
                return this.applyRule(categoryRule, amount);
            }
        }

        // 3. Default commission
        const defaultRate = Number(DEFAULT_COMMISSION_RATE) / 100;
        return {
            commission: amount * defaultRate,
            rate: defaultRate * 100,
        };
    }

    private applyRule(
        rule: typeof commissionRules.$inferSelect,
        amount: number
    ): { commission: number; rate: number } {
        let commission: number;
        let rate: number;

        if (rule.commissionType === "fixed") {
            commission = Number(rule.commissionValue);
            rate = (commission / amount) * 100;
        } else {
            rate = Number(rule.commissionValue);
            commission = amount * (rate / 100);

            // Apply min/max limits
            if (rule.minCommission && commission < Number(rule.minCommission)) {
                commission = Number(rule.minCommission);
            }
            if (rule.maxCommission && commission > Number(rule.maxCommission)) {
                commission = Number(rule.maxCommission);
            }
        }

        return { commission, rate };
    }

    /**
     * Split a customer order into seller orders
     * Called after payment is confirmed
     */
    async splitOrderBySeller(
        orderId: number
    ): Promise<{ success: boolean; sellerOrders?: SellerOrder[]; error?: string }> {
        try {
            // Get order with items
            const order = await db.query.orders.findFirst({
                where: eq(orders.id, orderId),
                with: {
                    orderItems: {
                        with: {
                            product: true,
                        },
                    },
                },
            });

            if (!order) {
                return { success: false, error: "Order not found" };
            }

            // Group items by seller
            const itemsBySeller = new Map<number, OrderItemWithProduct[]>();

            for (const item of order.orderItems as any[]) {
                const sellerId = item.product?.sellerId;
                if (!sellerId) {
                    console.warn(`Product ${item.productId} has no seller`);
                    continue;
                }

                // Get seller profile
                const seller = await db.query.sellerProfiles.findFirst({
                    where: and(
                        eq(sellerProfiles.userId, sellerId),
                        eq(sellerProfiles.status, "approved")
                    ),
                });

                if (!seller) {
                    console.warn(`No approved seller profile for user ${sellerId}`);
                    continue;
                }

                if (!itemsBySeller.has(seller.id)) {
                    itemsBySeller.set(seller.id, []);
                }
                itemsBySeller.get(seller.id)!.push(item);
            }

            const createdSellerOrders: SellerOrder[] = [];

            // Create seller order for each seller
            for (const [sellerId, items] of Array.from(itemsBySeller.entries())) {
                // Calculate subtotal
                const subtotal = items.reduce(
                    (sum: number, item: OrderItemWithProduct) => sum + Number(item.price) * item.quantity,
                    0
                );

                // Calculate commission for each item and sum
                let totalCommission = 0;
                for (const item of items) {
                    const { commission } = await this.calculateCommission(
                        item.productId,
                        sellerId,
                        Number(item.price) * item.quantity
                    );
                    totalCommission += commission;
                }

                const sellerEarnings = subtotal - totalCommission;
                const commissionRate = (totalCommission / subtotal) * 100;

                const sellerOrderNumber = await this.generateSellerOrderNumber(sellerId);

                // Create seller order
                const [sellerOrder] = await db
                    .insert(sellerOrders)
                    .values({
                        orderId,
                        sellerId,
                        sellerOrderNumber,
                        subtotal: String(subtotal),
                        shippingCost: "0", // TODO: Calculate per-seller shipping
                        discount: "0",
                        platformFee: String(totalCommission),
                        platformFeePercentage: String(commissionRate),
                        sellerEarnings: String(sellerEarnings),
                        status: "pending",
                        payoutStatus: "pending",
                        stateHistory: [
                            {
                                status: "pending",
                                timestamp: new Date().toISOString(),
                                note: "Order created from customer order",
                            },
                        ],
                        customerNote: (order.shippingAddress as any)?.note,
                    })
                    .returning();

                // Create seller order items
                for (const item of items) {
                    await db.insert(sellerOrderItems).values({
                        sellerOrderId: sellerOrder.id,
                        orderItemId: item.id,
                        productId: item.productId,
                        productName: item.product.name,
                        productSku: item.product.sku,
                        quantity: item.quantity,
                        unitPrice: item.price,
                        totalPrice: String(Number(item.price) * item.quantity),
                        size: item.size,
                        color: item.color,
                    });
                }

                // Add to seller's pending balance
                await sellerWalletService.addPendingBalance(
                    sellerId,
                    sellerEarnings,
                    sellerOrder.id,
                    `Order ${sellerOrderNumber} - Pending delivery`
                );

                // Send notification to seller
                await this.sendNotification(sellerId, {
                    type: "order_new",
                    title: "New Order Received!",
                    message: `You have a new order ${sellerOrderNumber} worth ₹${subtotal}`,
                    data: { sellerOrderId: sellerOrder.id, orderId },
                });

                createdSellerOrders.push(sellerOrder);
            }

            return { success: true, sellerOrders: createdSellerOrders };
        } catch (error) {
            console.error("[SellerOrder] Split order error:", error);
            return { success: false, error: "Failed to split order" };
        }
    }

    /**
     * Update seller order status
     */
    async updateStatus(
        sellerOrderId: number,
        newStatus: SellerOrder["status"],
        details?: {
            trackingNumber?: string;
            shippingProvider?: string;
            estimatedDelivery?: Date;
            note?: string;
            updatedBy?: number;
        }
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const sellerOrder = await db.query.sellerOrders.findFirst({
                where: eq(sellerOrders.id, sellerOrderId),
            });

            if (!sellerOrder) {
                return { success: false, error: "Seller order not found" };
            }

            // Validate status transition
            const allowedTransitions = SELLER_ORDER_TRANSITIONS[sellerOrder.status];
            if (!allowedTransitions?.includes(newStatus)) {
                return {
                    success: false,
                    error: `Cannot transition from ${sellerOrder.status} to ${newStatus}`,
                };
            }

            const updates: Partial<SellerOrder> = {
                status: newStatus,
                stateVersion: (sellerOrder.stateVersion || 1) + 1,
                stateHistory: [
                    ...(sellerOrder.stateHistory as any[] || []),
                    {
                        status: newStatus,
                        timestamp: new Date().toISOString(),
                        note: details?.note,
                        updatedBy: details?.updatedBy,
                    },
                ],
                updatedAt: new Date(),
            };

            // Handle specific status updates
            switch (newStatus) {
                case "shipped":
                    updates.shippedAt = new Date();
                    if (details?.trackingNumber) {
                        updates.trackingNumber = details.trackingNumber;
                    }
                    if (details?.shippingProvider) {
                        updates.shippingProvider = details.shippingProvider;
                    }
                    if (details?.estimatedDelivery) {
                        updates.estimatedDelivery = details.estimatedDelivery;
                    }
                    break;

                case "delivered":
                    updates.deliveredAt = new Date();
                    // Set payout eligible date
                    const eligibleDate = new Date();
                    eligibleDate.setDate(eligibleDate.getDate() + PAYOUT_HOLD_DAYS);
                    updates.payoutEligibleAt = eligibleDate;
                    break;

                case "cancelled":
                    updates.cancelledAt = new Date();
                    updates.cancelledBy = details?.updatedBy;
                    updates.cancellationReason = details?.note;

                    // Deduct from pending balance
                    await sellerWalletService.deductForRefund(
                        sellerOrder.sellerId,
                        Number(sellerOrder.sellerEarnings),
                        sellerOrderId,
                        true // from pending
                    );
                    break;
            }

            if (details?.note) {
                updates.sellerNote = details.note;
            }

            await db
                .update(sellerOrders)
                .set(updates)
                .where(eq(sellerOrders.id, sellerOrderId));

            return { success: true };
        } catch (error) {
            console.error("[SellerOrder] Update status error:", error);
            return { success: false, error: "Failed to update status" };
        }
    }

    /**
     * Get seller orders (for seller dashboard)
     */
    async getSellerOrders(
        sellerId: number,
        filters?: {
            status?: SellerOrder["status"];
            startDate?: Date;
            endDate?: Date;
        },
        page: number = 1,
        limit: number = 20
    ): Promise<{ orders: SellerOrder[]; total: number }> {
        const offset = (page - 1) * limit;

        let whereCondition = eq(sellerOrders.sellerId, sellerId);

        if (filters?.status) {
            whereCondition = and(whereCondition, eq(sellerOrders.status, filters.status)) as any;
        }

        const orders = await db.query.sellerOrders.findMany({
            where: whereCondition,
            with: {
                items: true,
                order: {
                    columns: {
                        id: true,
                        shippingAddress: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: [desc(sellerOrders.createdAt)],
            limit,
            offset,
        });

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(sellerOrders)
            .where(whereCondition);

        return { orders, total: Number(count) };
    }

    /**
     * Get seller order by ID (with ownership check)
     */
    async getSellerOrderById(
        sellerOrderId: number,
        sellerId: number
    ): Promise<SellerOrder | null> {
        const order = await db.query.sellerOrders.findFirst({
            where: and(
                eq(sellerOrders.id, sellerOrderId),
                eq(sellerOrders.sellerId, sellerId)
            ),
            with: {
                items: {
                    with: {
                        product: true,
                    },
                },
                order: {
                    columns: {
                        id: true,
                        shippingAddress: true,
                        createdAt: true,
                        userId: true,
                    },
                },
            },
        });

        return order || null;
    }

    /**
     * Get order statistics for seller dashboard
     */
    async getSellerOrderStats(sellerId: number): Promise<{
        totalOrders: number;
        pendingOrders: number;
        confirmedOrders: number;
        shippedOrders: number;
        deliveredOrders: number;
        cancelledOrders: number;
        totalRevenue: number;
        pendingRevenue: number;
    }> {
        const stats = await db
            .select({
                status: sellerOrders.status,
                count: sql<number>`count(*)`,
                revenue: sql<number>`sum(seller_earnings::numeric)`,
            })
            .from(sellerOrders)
            .where(eq(sellerOrders.sellerId, sellerId))
            .groupBy(sellerOrders.status);

        const result = {
            totalOrders: 0,
            pendingOrders: 0,
            confirmedOrders: 0,
            shippedOrders: 0,
            deliveredOrders: 0,
            cancelledOrders: 0,
            totalRevenue: 0,
            pendingRevenue: 0,
        };

        for (const row of stats) {
            const count = Number(row.count);
            const revenue = Number(row.revenue) || 0;
            result.totalOrders += count;
            result.totalRevenue += revenue;

            switch (row.status) {
                case "pending":
                    result.pendingOrders = count;
                    result.pendingRevenue += revenue;
                    break;
                case "confirmed":
                    result.confirmedOrders = count;
                    result.pendingRevenue += revenue;
                    break;
                case "shipped":
                case "out_for_delivery":
                    result.shippedOrders += count;
                    result.pendingRevenue += revenue;
                    break;
                case "delivered":
                    result.deliveredOrders += count;
                    break;
                case "cancelled":
                case "returned":
                    result.cancelledOrders += count;
                    break;
            }
        }

        return result;
    }

    /**
     * Admin: Get all seller orders
     */
    async getAllSellerOrders(
        filters?: {
            sellerId?: number;
            status?: SellerOrder["status"];
        },
        page: number = 1,
        limit: number = 20
    ): Promise<{ orders: SellerOrder[]; total: number }> {
        const offset = (page - 1) * limit;

        let whereConditions: any[] = [];

        if (filters?.sellerId) {
            whereConditions.push(eq(sellerOrders.sellerId, filters.sellerId));
        }
        if (filters?.status) {
            whereConditions.push(eq(sellerOrders.status, filters.status));
        }

        const whereClause = whereConditions.length > 0
            ? and(...whereConditions)
            : undefined;

        const orders = await db.query.sellerOrders.findMany({
            where: whereClause,
            with: {
                seller: {
                    columns: {
                        id: true,
                        shopName: true,
                        status: true,
                    },
                },
                items: true,
            },
            orderBy: [desc(sellerOrders.createdAt)],
            limit,
            offset,
        });

        const countQuery = await db
            .select({ count: sql<number>`count(*)` })
            .from(sellerOrders)
            .where(whereClause);

        return { orders, total: Number(countQuery[0].count) };
    }

    /**
     * Admin: Override order status
     */
    async adminUpdateStatus(
        sellerOrderId: number,
        newStatus: SellerOrder["status"],
        adminId: number,
        note: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const sellerOrder = await db.query.sellerOrders.findFirst({
                where: eq(sellerOrders.id, sellerOrderId),
            });

            if (!sellerOrder) {
                return { success: false, error: "Seller order not found" };
            }

            // Admin can override any transition
            const updates: Partial<SellerOrder> = {
                status: newStatus,
                stateVersion: (sellerOrder.stateVersion || 1) + 1,
                stateHistory: [
                    ...(sellerOrder.stateHistory as any[] || []),
                    {
                        status: newStatus,
                        timestamp: new Date().toISOString(),
                        note: `Admin override: ${note}`,
                        updatedBy: adminId,
                        isAdminOverride: true,
                    },
                ],
                updatedAt: new Date(),
            };

            await db
                .update(sellerOrders)
                .set(updates)
                .where(eq(sellerOrders.id, sellerOrderId));

            return { success: true };
        } catch (error) {
            console.error("[SellerOrder] Admin update status error:", error);
            return { success: false, error: "Failed to update status" };
        }
    }

    /**
     * Admin: Get return requests
     */
    async getAdminReturnRequests(
        statusFilter: string = "all",
        page: number = 1,
        limit: number = 20
    ) {
        const offset = (page - 1) * limit;

        let whereCondition: any = undefined;
        if (statusFilter !== "all") {
            whereCondition = eq(sellerReturnRequests.status, statusFilter as any);
        }

        const requests = await db.query.sellerReturnRequests.findMany({
            where: whereCondition,
            with: {
                seller: {
                    columns: {
                        id: true,
                        shopName: true,
                        businessEmail: true,
                    },
                },
                sellerOrder: {
                    columns: {
                        id: true,
                        sellerOrderNumber: true,
                        subtotal: true, // Corrected from totalPrice
                        sellerEarnings: true,
                    },
                },
                customer: {
                    columns: {
                        id: true,
                        name: true, // Corrected from username
                        email: true,
                    },
                },
            },
            orderBy: [desc(sellerReturnRequests.createdAt)],
            limit,
            offset,
        });

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(sellerReturnRequests)
            .where(whereCondition);

        return { requests, total: Number(count) };
    }

    /**
     * Admin: Update return request (Dispute Resolution)
     */
    async updateReturnRequest(
        returnId: number,
        action: "approve" | "reject" | "schedule_pickup" | "refund",
        note: string,
        adminId: number
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const request = await db.query.sellerReturnRequests.findFirst({
                where: eq(sellerReturnRequests.id, returnId),
            });

            if (!request) {
                return { success: false, error: "Return request not found" };
            }

            // Determine status based on action
            let newStatus = request.status;
            if (action === "approve") {
                // If disputing seller rejection, 'approve' means forcing return logic
                newStatus = "pickup_scheduled"; // Admin overrides and schedules pickup
            } else if (action === "reject") {
                newStatus = "closed"; // Admin agrees with seller or rejects customer
            } else if (action === "refund") {
                newStatus = "refund_approved";
            }

            await db
                .update(sellerReturnRequests)
                .set({
                    status: newStatus as any,
                    adminNote: note,
                    respondedBy: adminId,
                    updatedAt: new Date(),
                })
                .where(eq(sellerReturnRequests.id, returnId));

            // TODO: If refund_approved, trigger Wallet Deduction if needed using SellerWalletService
            if (newStatus === "refund_approved") {
                // Logic to deduct from seller and refund customer would go here
            }

            return { success: true };
        } catch (error) {
            console.error("[SellerOrder] Update return request error:", error);
            return { success: false, error: "Failed to update return request" };
        }
    }

    /**
     * Get return requests for seller
     */
    async getReturnRequestsForSeller(
        sellerId: number,
        filters?: {
            status?: string;
            startDate?: Date;
            endDate?: Date;
        },
        page: number = 1,
        limit: number = 20
    ): Promise<{ requests: SellerReturnRequest[]; total: number }> {
        const offset = (page - 1) * limit;

        const whereConditions: any[] = [eq(sellerReturnRequests.sellerId, sellerId)];

        if (filters?.status && filters.status !== "all") {
            whereConditions.push(eq(sellerReturnRequests.status, filters.status as any));
        }

        // Add date filters if needed

        const whereClause = and(...whereConditions);

        const requests = await db.query.sellerReturnRequests.findMany({
            where: whereClause,
            with: {
                sellerOrder: {
                    columns: {
                        id: true,
                        sellerOrderNumber: true,
                        subtotal: true,
                    },
                },
                customer: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: [desc(sellerReturnRequests.createdAt)],
            limit,
            offset,
        });

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(sellerReturnRequests)
            .where(whereClause);

        return { requests: requests as any, total: Number(count) };
    }

    /**
     * Respond to return request (Seller Action)
     */
    async respondToReturnRequest(
        requestId: number,
        sellerId: number,
        userId: number,
        action: "approve" | "reject",
        response: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const request = await db.query.sellerReturnRequests.findFirst({
                where: and(
                    eq(sellerReturnRequests.id, requestId),
                    eq(sellerReturnRequests.sellerId, sellerId)
                ),
            });

            if (!request) {
                return { success: false, error: "Return request not found" };
            }

            if (request.status !== "requested") {
                return { success: false, error: "Return request is not in pending state" };
            }

            let newStatus: string = request.status;
            if (action === "approve") {
                newStatus = "seller_approved"; // Triggers pickup
            } else if (action === "reject") {
                newStatus = "seller_rejected"; // Triggers admin dispute/customer review
            }

            await db
                .update(sellerReturnRequests)
                .set({
                    status: newStatus as any,
                    sellerResponse: response,
                    sellerRespondedAt: new Date(),
                    respondedBy: userId,
                    updatedAt: new Date(),
                })
                .where(eq(sellerReturnRequests.id, requestId));

            // Notify Customer (Placeholder)
            // notifyService.notifyUser(request.customerId, ...)

            // If rejected, maybe notify Admin?

            return { success: true };
        } catch (error) {
            console.error("[SellerOrder] Respond to return request error:", error);
            return { success: false, error: "Failed to respond to return request" };
        }
    }

    /**
     * Send notification helper
     */
    private async sendNotification(
        sellerId: number,
        notification: {
            type: "order_new" | "order_cancelled";
            title: string;
            message: string;
            data?: Record<string, any>;
        }
    ): Promise<void> {
        try {
            await db.insert(sellerNotifications).values({
                sellerId,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data,
            });
        } catch (error) {
            console.error("[SellerOrder] Send notification error:", error);
        }
    }
}

export const sellerOrderService = new SellerOrderService();
