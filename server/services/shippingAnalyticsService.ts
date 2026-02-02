/**
 * Shipping Analytics Service
 * 
 * Provides analytics data for the shipping dashboard:
 * - Free vs paid shipping breakdown
 * - Revenue impact analysis
 * - Festive mode comparison
 */

import { db } from "../db";
import { orders } from "@shared/schema";
import { sql, gte, lte, and, eq } from "drizzle-orm";
import { logger } from "../logger";

interface ShippingAnalytics {
    summary: {
        totalOrders: number;
        freeShippingOrders: number;
        paidShippingOrders: number;
        freeShippingPercentage: number;
        totalShippingRevenue: number;
        avgOrderValue: number;
        avgOrderValueFreeShipping: number;
        avgOrderValuePaidShipping: number;
    };
    dailyBreakdown: Array<{
        date: string;
        totalOrders: number;
        freeOrders: number;
        paidOrders: number;
        shippingRevenue: number;
    }>;
    thresholdAnalysis: {
        ordersBelow499: number;
        orders499to999: number;
        ordersAbove999: number;
    };
}

class ShippingAnalyticsService {
    /**
     * Get comprehensive shipping analytics
     */
    async getAnalytics(days: number = 30): Promise<ShippingAnalytics> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        try {
            // Summary statistics
            const summaryResult = await db
                .select({
                    totalOrders: sql<number>`COUNT(*)`,
                    freeShippingOrders: sql<number>`SUM(CASE WHEN COALESCE(${orders.shippingCost}, 0) = 0 THEN 1 ELSE 0 END)`,
                    paidShippingOrders: sql<number>`SUM(CASE WHEN COALESCE(${orders.shippingCost}, 0) > 0 THEN 1 ELSE 0 END)`,
                    totalShippingRevenue: sql<number>`SUM(COALESCE(${orders.shippingCost}, 0))`,
                    avgOrderValue: sql<number>`AVG(CAST(${orders.totalAmount} AS DECIMAL))`,
                })
                .from(orders)
                .where(gte(orders.createdAt, startDate));

            const summary = summaryResult[0] || {
                totalOrders: 0,
                freeShippingOrders: 0,
                paidShippingOrders: 0,
                totalShippingRevenue: 0,
                avgOrderValue: 0,
            };

            // Average order value by shipping type
            const avgByType = await db
                .select({
                    freeAvg: sql<number>`AVG(CASE WHEN COALESCE(${orders.shippingCost}, 0) = 0 THEN CAST(${orders.totalAmount} AS DECIMAL) END)`,
                    paidAvg: sql<number>`AVG(CASE WHEN COALESCE(${orders.shippingCost}, 0) > 0 THEN CAST(${orders.totalAmount} AS DECIMAL) END)`,
                })
                .from(orders)
                .where(gte(orders.createdAt, startDate));

            // Daily breakdown
            const dailyResult = await db
                .select({
                    date: sql<string>`DATE(${orders.createdAt})`,
                    totalOrders: sql<number>`COUNT(*)`,
                    freeOrders: sql<number>`SUM(CASE WHEN COALESCE(${orders.shippingCost}, 0) = 0 THEN 1 ELSE 0 END)`,
                    paidOrders: sql<number>`SUM(CASE WHEN COALESCE(${orders.shippingCost}, 0) > 0 THEN 1 ELSE 0 END)`,
                    shippingRevenue: sql<number>`SUM(COALESCE(${orders.shippingCost}, 0))`,
                })
                .from(orders)
                .where(gte(orders.createdAt, startDate))
                .groupBy(sql`DATE(${orders.createdAt})`)
                .orderBy(sql`DATE(${orders.createdAt}) DESC`)
                .limit(days);

            // Threshold analysis
            const thresholdResult = await db
                .select({
                    ordersBelow499: sql<number>`SUM(CASE WHEN CAST(${orders.totalAmount} AS DECIMAL) < 499 THEN 1 ELSE 0 END)`,
                    orders499to999: sql<number>`SUM(CASE WHEN CAST(${orders.totalAmount} AS DECIMAL) >= 499 AND CAST(${orders.totalAmount} AS DECIMAL) < 999 THEN 1 ELSE 0 END)`,
                    ordersAbove999: sql<number>`SUM(CASE WHEN CAST(${orders.totalAmount} AS DECIMAL) >= 999 THEN 1 ELSE 0 END)`,
                })
                .from(orders)
                .where(gte(orders.createdAt, startDate));

            const freePercentage = summary.totalOrders > 0
                ? (Number(summary.freeShippingOrders) / Number(summary.totalOrders)) * 100
                : 0;

            return {
                summary: {
                    totalOrders: Number(summary.totalOrders) || 0,
                    freeShippingOrders: Number(summary.freeShippingOrders) || 0,
                    paidShippingOrders: Number(summary.paidShippingOrders) || 0,
                    freeShippingPercentage: Math.round(freePercentage * 10) / 10,
                    totalShippingRevenue: Number(summary.totalShippingRevenue) || 0,
                    avgOrderValue: Math.round(Number(summary.avgOrderValue) || 0),
                    avgOrderValueFreeShipping: Math.round(Number(avgByType[0]?.freeAvg) || 0),
                    avgOrderValuePaidShipping: Math.round(Number(avgByType[0]?.paidAvg) || 0),
                },
                dailyBreakdown: dailyResult.map((row) => ({
                    date: String(row.date),
                    totalOrders: Number(row.totalOrders) || 0,
                    freeOrders: Number(row.freeOrders) || 0,
                    paidOrders: Number(row.paidOrders) || 0,
                    shippingRevenue: Number(row.shippingRevenue) || 0,
                })),
                thresholdAnalysis: {
                    ordersBelow499: Number(thresholdResult[0]?.ordersBelow499) || 0,
                    orders499to999: Number(thresholdResult[0]?.orders499to999) || 0,
                    ordersAbove999: Number(thresholdResult[0]?.ordersAbove999) || 0,
                },
            };
        } catch (error) {
            logger.error("[ShippingAnalytics] Error fetching analytics:", error);
            return {
                summary: {
                    totalOrders: 0,
                    freeShippingOrders: 0,
                    paidShippingOrders: 0,
                    freeShippingPercentage: 0,
                    totalShippingRevenue: 0,
                    avgOrderValue: 0,
                    avgOrderValueFreeShipping: 0,
                    avgOrderValuePaidShipping: 0,
                },
                dailyBreakdown: [],
                thresholdAnalysis: {
                    ordersBelow499: 0,
                    orders499to999: 0,
                    ordersAbove999: 0,
                },
            };
        }
    }

    /**
     * Get festive mode comparison (festive vs non-festive periods)
     */
    async getFestiveComparison(): Promise<{
        festive: { avgOrderValue: number; freeShippingRate: number };
        normal: { avgOrderValue: number; freeShippingRate: number };
        lift: { orderValueLift: number; freeShippingLift: number };
    }> {
        // This would require tracking when festive mode was active
        // For now, return placeholder indicating feature needs historical data
        return {
            festive: { avgOrderValue: 0, freeShippingRate: 0 },
            normal: { avgOrderValue: 0, freeShippingRate: 0 },
            lift: { orderValueLift: 0, freeShippingLift: 0 },
        };
    }
}

export const shippingAnalyticsService = new ShippingAnalyticsService();
