import { db } from "../db";
import { orders, orderItems, products, users } from "@shared/schema";
import { sql, eq, desc, and, gte } from "drizzle-orm";
import { measureAsync } from "../utils/performance";

export class AnalyticsService {
    async getDailySales(days: number = 7) {
        return measureAsync("Analytics.getDailySales", async () => {
            const result = await db.execute(sql`
                SELECT 
                    DATE(created_at) as date,
                    SUM(total_amount) as total
                FROM ${orders}
                WHERE created_at >= NOW() - INTERVAL '${sql.raw(days.toString())} days'
                AND status != 'cancelled'
                GROUP BY DATE(created_at)
                ORDER BY DATE(created_at) ASC
            `);
            return result.rows;
        });
    }

    async getTopProducts(limit: number = 5) {
        return measureAsync("Analytics.getTopProducts", async () => {
            const result = await db.select({
                id: products.id,
                name: products.name,
                totalSold: sql<number>`SUM(${orderItems.quantity})`
            })
                .from(orderItems)
                .innerJoin(products, eq(orderItems.productId, products.id))
                .innerJoin(orders, eq(orderItems.orderId, orders.id))
                .where(eq(orders.status, 'delivered'))
                .groupBy(products.id, products.name)
                .orderBy(desc(sql`SUM(${orderItems.quantity})`))
                .limit(limit);

            return result;
        });
    }

    async getOrderStats() {
        return measureAsync("Analytics.getOrderStats", async () => {
            const result = await db.select({
                status: orders.status,
                count: sql<number>`COUNT(*)`
            })
                .from(orders)
                .groupBy(orders.status);

            return result;
        });
    }

    async getProductStats() {
        return measureAsync("Analytics.getProductStats", async () => {
            const result = await db.select({
                status: products.moderationStatus,
                count: sql<number>`COUNT(*)`
            })
                .from(products)
                .groupBy(products.moderationStatus);

            return result;
        });
    }

    async getUserStats() {
        return measureAsync("Analytics.getUserStats", async () => {
            const result = await db.select({
                role: users.role,
                count: sql<number>`COUNT(*)`
            })
                .from(users)
                .groupBy(users.role);

            return result;
        });
    }

    async getCustomerProfile(userId: number) {
        return measureAsync("Analytics.getCustomerProfile", async () => {
            const [user] = await db
                .select({
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    role: users.role,
                    createdAt: users.createdAt,
                })
                .from(users)
                .where(eq(users.id, userId));

            if (!user) return null;

            const userOrders = await db
                .select()
                .from(orders)
                .where(eq(orders.userId, userId))
                .orderBy(desc(orders.createdAt));

            return {
                ...user,
                orders: userOrders,
                totalSpent: userOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0),
                orderCount: userOrders.length
            };
        });
    }

    async getOpsStats() {
        return measureAsync("Analytics.getOpsStats", async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [orderCounts, courierCount, completedToday] = await Promise.all([
                db.select({
                    status: orders.status,
                    deliveryStatus: orders.deliveryStatus,
                    count: sql<number>`count(*)`
                })
                    .from(orders)
                    .groupBy(orders.status, orders.deliveryStatus),

                db.select({ count: sql<number>`count(*)` })
                    .from(users)
                    .where(eq(users.role, 'courier')),

                db.select({ count: sql<number>`count(*)` })
                    .from(orders)
                    .where(and(
                        eq(orders.status, 'delivered'),
                        gte(orders.deliveredAt, today)
                    ))
            ]);

            return {
                orders: orderCounts,
                couriers: Number(courierCount[0]?.count || 0),
                completedToday: Number(completedToday[0]?.count || 0)
            };
        });
    }
}

export const analyticsService = new AnalyticsService();
