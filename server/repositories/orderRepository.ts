import { db } from "../db";
import { orders, orderItems, users, type Order, type OrderItem } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { webSocketService } from "../services/websocketService";

export class OrderRepository {
    async createOrder(orderData: Omit<Order, "id" | "createdAt" | "displayId" | "internalOrderId" | "publicOrderId" | "sequenceNumber">, items: { productId: number; quantity: number; price: number; size?: string; color?: string }[]): Promise<Order> {
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                return await db.transaction(async (tx) => {
                    // 1. Get Global Sequence (Thread-safe, Atomic)
                    const seqResult = await tx.execute(sql`SELECT nextval('global_order_seq') as seq`);
                    const seq = seqResult.rows[0].seq;
                    const seqNum = Number(seq);

                    // 2. Generate Public Order ID (Human Readable, Sequential)
                    const date = new Date();
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const paddedSeq = String(seq).padStart(6, '0');
                    const publicOrderId = `ORD-${year}-${month}-${paddedSeq}`;

                    // 3. Generate Internal Order ID (System, Non-guessable)
                    const timestamp = Date.now().toString();
                    const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
                    const internalOrderId = `ODR${timestamp}${random}`; // e.g., ODR1709823456789123456789

                    // 4. Insert Order
                    const [newOrder] = await tx.insert(orders).values({
                        ...orderData,
                        sequenceNumber: seqNum,
                        publicOrderId: publicOrderId,
                        internalOrderId: internalOrderId,
                        displayId: publicOrderId, // Backward compatibility
                    }).returning();

                    // 5. Insert Order Items
                    for (const item of items) {
                        await tx.insert(orderItems).values({
                            orderId: newOrder.id,
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.price.toString(),
                            size: item.size,
                            color: item.color
                        });
                    }

                    // Broadcast new order event
                    webSocketService.broadcast('NEW_ORDER', newOrder);
                    return newOrder;
                });
            } catch (error: any) {
                // Retry only if it's a unique constraint violation (collision)
                if (error.code === '23505' && attempts < maxAttempts - 1) { // Postgres Unique Violation code
                    console.warn(`Order creation collision detected (Attempt ${attempts + 1}). Retrying...`);
                    attempts++;
                    await new Promise(res => setTimeout(res, 50)); // Small jitter
                    continue;
                }
                throw error;
            }
        }
        throw new Error("Failed to create order after multiple attempts");
    }

    async getOrders(userId: number): Promise<any[]> {
        return await db.query.orders.findMany({
            where: eq(orders.userId, userId),
            orderBy: desc(orders.createdAt),
            with: {
                orderItems: {
                    with: {
                        product: true
                    }
                }
            }
        });
    }

    async getAllOrders(
        page: number = 1,
        limit: number = 20,
        filters: { status?: string; search?: string } = {}
    ): Promise<{ orders: (Order & { user: { name: string; email: string } })[]; total: number }> {
        const offset = (page - 1) * limit;

        let conditions = undefined;
        const conditionsList = [];

        if (filters.status && filters.status !== 'all') {
            conditionsList.push(sql`${orders.status} = ${filters.status}`);
        }

        if (filters.search) {
            conditionsList.push(
                sql`(${orders.id}::text ILIKE ${`%${filters.search}%`} OR ${orders.publicOrderId} ILIKE ${`%${filters.search}%`} OR ${orders.internalOrderId} ILIKE ${`%${filters.search}%`} OR ${users.email} ILIKE ${`%${filters.search}%`} OR ${users.name} ILIKE ${`%${filters.search}%`})`
            );
        }

        if (conditionsList.length > 0) {
            conditions = and(...conditionsList);
        }

        const results = await db.select({
            order: orders,
            user: users
        })
            .from(orders)
            .innerJoin(users, eq(orders.userId, users.id))
            .where(conditions)
            .orderBy(desc(orders.createdAt))
            .limit(limit)
            .offset(offset);

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(orders)
            .innerJoin(users, eq(orders.userId, users.id))
            .where(conditions);

        const formattedOrders = results.map(r => ({
            ...r.order,
            user: { name: r.user.name, email: r.user.email }
        }));

        return { orders: formattedOrders, total: Number(count) };
    }

    async updateOrderStatus(id: number, status: string, courierName?: string, trackingNumber?: string, estimatedDeliveryDate?: string): Promise<Order | undefined> {
        const updateData: any = { status: status as any };

        if (courierName) updateData.courierName = courierName;
        if (trackingNumber) updateData.trackingNumber = trackingNumber;
        if (estimatedDeliveryDate) updateData.estimatedDeliveryDate = new Date(estimatedDeliveryDate);

        // Sync orderState
        const statusToStateMap: Record<string, string> = {
            "pending": "PROCESSING",
            "paid": "CONFIRMED",
            "packed": "PACKED",
            "shipped": "SHIPPED",
            "out_for_delivery": "OUT_FOR_DELIVERY",
            "delivered": "DELIVERED",
            "cancelled": "CANCELLED"
        };

        if (statusToStateMap[status]) {
            updateData.orderState = statusToStateMap[status];
        }

        const [updated] = await db.update(orders)
            .set(updateData)
            .where(eq(orders.id, id))
            .returning();
        return updated;
    }

    async getById(id: number): Promise<any | undefined> {
        return await db.query.orders.findFirst({
            where: eq(orders.id, id),
            with: {
                orderItems: {
                    with: {
                        product: true
                    }
                }
            }
        });
    }

    async getOrderItems(orderId: number): Promise<OrderItem[]> {
        return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    }

    async hasUserPurchasedProduct(userId: number, productId: number): Promise<boolean> {
        const result = await db.select({ id: orderItems.id })
            .from(orderItems)
            .innerJoin(orders, eq(orderItems.orderId, orders.id))
            .where(and(
                eq(orders.userId, userId),
                eq(orderItems.productId, productId),
                eq(orders.status, "delivered" as const)
            ))
            .limit(1);
        return result.length > 0;
    }
}

export const orderRepository = new OrderRepository();
