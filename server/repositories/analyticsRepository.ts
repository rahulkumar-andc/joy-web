import { db } from "../db";
import { orders, users, products } from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";

export class AnalyticsRepository {
    async getAdminStats(): Promise<{ totalRevenue: number; totalOrders: number; totalUsers: number; lowStockCount: number }> {
        const [revenueResult] = await db.select({ total: sql<string>`sum(${orders.totalAmount})` }).from(orders).where(eq(orders.paymentStatus, "paid"));
        const [ordersResult] = await db.select({ count: sql<number>`count(*)` }).from(orders);
        const [usersResult] = await db.select({ count: sql<number>`count(*)` }).from(users);
        const [lowStockResult] = await db.select({ count: sql<number>`count(*)` }).from(products).where(sql`${products.stockQuantity} < 10`);

        return {
            totalRevenue: Number(revenueResult?.total || 0),
            totalOrders: Number(ordersResult?.count || 0),
            totalUsers: Number(usersResult?.count || 0),
            lowStockCount: Number(lowStockResult?.count || 0)
        };
    }

    async getDailyRevenue(days: number = 7): Promise<{ date: string; revenue: number }[]> {
        const data = await db.select({
            date: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`,
            revenue: sql<string>`sum(${orders.totalAmount})`
        })
            .from(orders)
            .where(and(
                eq(orders.paymentStatus, 'paid'),
                sql`${orders.createdAt} >= NOW() - INTERVAL '${sql.raw(days.toString())} days'`
            ))
            .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`)
            .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD') DESC`);

        return data.map(d => ({
            date: d.date,
            revenue: Number(d.revenue)
        })).reverse();
    }
}

export const analyticsRepository = new AnalyticsRepository();
