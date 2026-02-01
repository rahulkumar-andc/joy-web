import { db } from "../db";
import { orders, orderItems, products, users } from "@shared/schema";
import { sql, eq, desc, and, gte } from "drizzle-orm";

export class AnalyticsService {
    async getDailySales(days: number = 7) {
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
    }

    async getTopProducts(limit: number = 5) {
        const result = await db.select({
            id: products.id,
            name: products.name,
            totalSold: sql<number>`SUM(${orderItems.quantity})`
        })
            .from(orderItems)
            .innerJoin(products, eq(orderItems.productId, products.id))
            .innerJoin(orders, eq(orderItems.orderId, orders.id)) // Join orders to check status
            .where(eq(orders.status, 'delivered')) // Only count delivered orders? Or any non-cancelled? Let's say paid/delivered.
            // Actually, schema usually implies paid if order exists? Let's filter out cancelled.
            // .where(ne(orders.status, 'cancelled')) 
            .groupBy(products.id, products.name)
            .orderBy(desc(sql`SUM(${orderItems.quantity})`))
            .limit(limit);

        return result;
    }

    async getOrderStats() {
        const result = await db.select({
            status: orders.status,
            count: sql<number>`COUNT(*)`
        })
            .from(orders)
            .groupBy(orders.status);

        return result;
    }

    async getCustomerProfile(userId: number) {
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
    }
}

export const analyticsService = new AnalyticsService();
