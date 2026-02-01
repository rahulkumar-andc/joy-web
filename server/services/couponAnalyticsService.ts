/**
 * Coupon Analytics Service
 * 
 * Tracks coupon usage, revenue impact, and performance metrics
 * for business intelligence and marketing optimization.
 */

import { db } from '../db';
import { coupons, couponUsage, orders } from '@shared/schema';
import { eq, and, between, sql, desc } from 'drizzle-orm';
import { logger } from '../logger';

interface CouponStats {
    couponId: number;
    code: string;
    discountType: string;
    totalUsage: number;
    totalRevenue: number;
    totalDiscountGiven: number;
    averageOrderValue: number;
    uniqueUsers: number;
    conversionRate?: number;
}

interface RevenueImpact {
    totalOrdersWithCoupons: number;
    totalRevenueWithCoupons: number;
    totalDiscountGiven: number;
    averageDiscountPerOrder: number;
    revenueAfterDiscount: number;
}

interface TimeSeriesData {
    date: string;
    usageCount: number;
    revenue: number;
    discountAmount: number;
}

export class CouponAnalyticsService {
    /**
     * Get comprehensive statistics for a specific coupon
     */
    async getCouponStats(couponId: number): Promise<CouponStats | null> {
        // Get coupon details
        const [coupon] = await db
            .select()
            .from(coupons)
            .where(eq(coupons.id, couponId));

        if (!coupon) {
            return null;
        }

        // Get usage data with order information
        const usageData = await db
            .select({
                orderId: couponUsage.orderId,
                userId: couponUsage.userId,
                orderTotal: orders.totalAmount,
                // discountAmount: orders.discountAmount
            })
            .from(couponUsage)
            .innerJoin(orders, eq(couponUsage.orderId, orders.id))
            .where(eq(couponUsage.couponId, couponId));

        const totalUsage = usageData.length;
        const uniqueUsers = new Set(usageData.map(u => u.userId)).size;

        const totalRevenue = usageData.reduce((sum, u) =>
            sum + parseFloat(u.orderTotal || '0'), 0);

        const totalDiscountGiven = 0;
        // usageData.reduce((sum, u) => sum + parseFloat(u.discountAmount || '0'), 0);

        const averageOrderValue = totalUsage > 0 ? totalRevenue / totalUsage : 0;

        logger.info(`Coupon stats calculated for ${coupon.code}`, {
            totalUsage,
            totalRevenue,
            totalDiscountGiven
        });

        return {
            couponId: coupon.id,
            code: coupon.code,
            discountType: coupon.discountType,
            totalUsage,
            totalRevenue,
            totalDiscountGiven,
            averageOrderValue,
            uniqueUsers
        };
    }

    /**
     * Get overall revenue impact of all coupons
     */
    async getRevenueImpact(startDate?: Date, endDate?: Date): Promise<RevenueImpact> {
        let query = db
            .select({
                orderId: couponUsage.orderId,
                orderTotal: orders.totalAmount,
                // discountAmount: orders.discountAmount
            })
            .from(couponUsage)
            .innerJoin(orders, eq(couponUsage.orderId, orders.id));

        // Add date filter if provided
        if (startDate && endDate) {
            query = query.where(
                between(orders.createdAt, startDate, endDate)
            ) as any;
        }

        const data = await query;

        const totalOrdersWithCoupons = data.length;

        const totalRevenueWithCoupons = data.reduce((sum, d) =>
            sum + parseFloat(d.orderTotal || '0'), 0);

        const totalDiscountGiven = 0;
        // data.reduce((sum, d) => sum + parseFloat(d.discountAmount || '0'), 0);

        const averageDiscountPerOrder = totalOrdersWithCoupons > 0
            ? totalDiscountGiven / totalOrdersWithCoupons
            : 0;

        const revenueAfterDiscount = totalRevenueWithCoupons - totalDiscountGiven;

        return {
            totalOrdersWithCoupons,
            totalRevenueWithCoupons,
            totalDiscountGiven,
            averageDiscountPerOrder,
            revenueAfterDiscount
        };
    }

    /**
     * Get top performing coupons by usage
     */
    async getTopCouponsByUsage(limit: number = 10): Promise<CouponStats[]> {
        const allCoupons = await db.select().from(coupons);

        const stats: CouponStats[] = [];

        for (const coupon of allCoupons) {
            const couponStats = await this.getCouponStats(coupon.id);
            if (couponStats) {
                stats.push(couponStats);
            }
        }

        // Sort by total usage and take top N
        return stats
            .sort((a, b) => b.totalUsage - a.totalUsage)
            .slice(0, limit);
    }

    /**
     * Get top performing coupons by revenue generated
     */
    async getTopCouponsByRevenue(limit: number = 10): Promise<CouponStats[]> {
        const allCoupons = await db.select().from(coupons);

        const stats: CouponStats[] = [];

        for (const coupon of allCoupons) {
            const couponStats = await this.getCouponStats(coupon.id);
            if (couponStats) {
                stats.push(couponStats);
            }
        }

        // Sort by total revenue and take top N
        return stats
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, limit);
    }

    /**
     * Get coupon usage over time (daily aggregation)
     */
    async getCouponUsageTimeSeries(
        couponId: number,
        startDate: Date,
        endDate: Date
    ): Promise<TimeSeriesData[]> {
        const usageData = await db
            .select({
                date: sql<string>`DATE(${orders.createdAt})`,
                usageCount: sql<number>`COUNT(*)`,
                revenue: sql<number>`SUM(${orders.totalAmount})`,
                // discountAmount: sql<number>`SUM(${orders.discountAmount})`
            })
            .from(couponUsage)
            .innerJoin(orders, eq(couponUsage.orderId, orders.id))
            .where(and(
                eq(couponUsage.couponId, couponId),
                between(orders.createdAt, startDate, endDate)
            ))
            .groupBy(sql`DATE(${orders.createdAt})`)
            .orderBy(sql`DATE(${orders.createdAt})`);

        return usageData.map(d => ({
            date: d.date,
            usageCount: Number(d.usageCount),
            revenue: Number(d.revenue),
            discountAmount: 0 // Number(d.discountAmount)
        }));
    }

    /**
     * Get coupon performance summary for admin dashboard
     */
    async getDashboardSummary() {
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);

        const [revenueImpact, topByUsage, topByRevenue] = await Promise.all([
            this.getRevenueImpact(last30Days, new Date()),
            this.getTopCouponsByUsage(5),
            this.getTopCouponsByRevenue(5)
        ]);

        return {
            period: 'Last 30 Days',
            revenueImpact,
            topCouponsByUsage: topByUsage,
            topCouponsByRevenue: topByRevenue
        };
    }

    /**
     * Calculate ROI (Return on Investment) for coupon campaigns
     */
    async calculateCouponROI(couponId: number): Promise<{
        revenue: number;
        discountGiven: number;
        roi: number;
        roiPercentage: number;
    }> {
        const stats = await this.getCouponStats(couponId);

        if (!stats) {
            throw new Error(`Coupon ${couponId} not found`);
        }

        const revenue = stats.totalRevenue;
        const discountGiven = stats.totalDiscountGiven;

        // ROI = (Revenue - Discount) / Discount
        const roi = discountGiven > 0
            ? (revenue - discountGiven) / discountGiven
            : 0;

        const roiPercentage = roi * 100;

        return {
            revenue,
            discountGiven,
            roi,
            roiPercentage
        };
    }

    /**
     * Get user-specific coupon usage analytics
     */
    async getUserCouponHistory(userId: number) {
        const userUsage = await db
            .select({
                couponId: couponUsage.couponId,
                couponCode: coupons.code,
                discountType: coupons.discountType,
                orderId: couponUsage.orderId,
                orderTotal: orders.totalAmount,
                // discountAmount: orders.discountAmount,
                usedAt: couponUsage.usedAt
            })
            .from(couponUsage)
            .innerJoin(coupons, eq(couponUsage.couponId, coupons.id))
            .innerJoin(orders, eq(couponUsage.orderId, orders.id))
            .where(eq(couponUsage.userId, userId))
            .orderBy(desc(couponUsage.usedAt));

        const totalSaved = 0;
        // userUsage.reduce((sum, u) => sum + parseFloat(u.discountAmount || '0'), 0);

        return {
            totalCouponsUsed: userUsage.length,
            totalSaved,
            coupons: userUsage
        };
    }
}

export const couponAnalyticsService = new CouponAnalyticsService();
