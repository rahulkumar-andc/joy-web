import { db } from "../db";
import { orders, orderItems, users, type Order, type OrderItem } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export class OrderRepository {
    async createOrder(orderData: Omit<Order, "id" | "createdAt" | "status" | "paymentStatus">, items: { productId: number; quantity: number; price: number; size?: string; color?: string }[]): Promise<Order> {
        return await db.transaction(async (tx) => {
            const [newOrder] = await tx.insert(orders).values(orderData).returning();

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
            return newOrder;
        });
    }

    async getOrders(userId: number): Promise<Order[]> {
        return await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
    }

    async getAllOrders(): Promise<(Order & { user: { name: string; email: string } })[]> {
        const results = await db.select({
            order: orders,
            user: users
        })
            .from(orders)
            .innerJoin(users, eq(orders.userId, users.id))
            .orderBy(desc(orders.createdAt));

        return results.map(r => ({
            ...r.order,
            user: { name: r.user.name, email: r.user.email }
        }));
    }

    async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
        const [updated] = await db.update(orders)
            .set({ status: status as any })
            .where(eq(orders.id, id))
            .returning();
        return updated;
    }

    async getById(id: number): Promise<Order | undefined> {
        const [order] = await db.select().from(orders).where(eq(orders.id, id));
        return order;
    }

    async getOrderItems(orderId: number): Promise<OrderItem[]> {
        return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    }
}

export const orderRepository = new OrderRepository();
