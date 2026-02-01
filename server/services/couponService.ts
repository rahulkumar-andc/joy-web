/**
 * Coupon Service
 * Handles coupon validation, discount calculation, and usage tracking
 */

import { db } from "../db";
import { coupons, couponUsage } from "@shared/schema";
import { eq, and, count } from "drizzle-orm";
import { logger } from "../logger";

interface ValidationResult {
    valid: boolean;
    error?: string;
    couponId?: number;
    discountAmount?: number;
    finalAmount?: number;
}

export class CouponService {
    /**
     * Validate coupon and calculate discount
     */
    async validateCoupon(
        code: string,
        userId: number,
        orderTotal: number
    ): Promise<ValidationResult> {
        // 1. Check if coupon exists and is active
        const [coupon] = await db
            .select()
            .from(coupons)
            .where(and(
                eq(coupons.code, code),
                eq(coupons.isActive, true)
            ));

        if (!coupon) {
            return { valid: false, error: "Invalid coupon code" };
        }

        // 2. Check expiry
        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            return { valid: false, error: "Coupon has expired" };
        }

        // 3. Check minimum order amount
        const minAmount = parseFloat(coupon.minOrderAmount || "0");
        if (orderTotal < minAmount) {
            return {
                valid: false,
                error: `Minimum order amount of ₹${minAmount} required`
            };
        }

        // 4. Check global usage limit
        if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
            return { valid: false, error: "Coupon usage limit exceeded" };
        }

        // 5. ⚠️ PHASE 2: Check per-user usage limit
        if (coupon.maxUsagePerUser) {
            const userUsageCount = await this.getUserUsageCount(coupon.id, userId);
            if (userUsageCount >= coupon.maxUsagePerUser) {
                return {
                    valid: false,
                    error: `You have already used this coupon ${coupon.maxUsagePerUser} time(s)`
                };
            }
        }

        // 6. Check if user has already used this coupon (this is now effectively a duplicate of the above, but kept for historical context if maxUsagePerUser is null)
        // This check is now redundant if maxUsagePerUser is set to 1.
        // If maxUsagePerUser is null, this check ensures a user can only use it once.
        // For now, we'll keep it, but it might be refactored later.
        const hasUsed = await this.hasUserUsedCoupon(coupon.id, userId);
        if (hasUsed && (!coupon.maxUsagePerUser || coupon.maxUsagePerUser === 1)) { // Only trigger if maxUsagePerUser is not set or is 1
            return { valid: false, error: "You have already used this coupon" };
        }


        // 7. Calculate discount
        const discountAmount = this.calculateDiscount(coupon, orderTotal);
        const finalAmount = Math.max(0, orderTotal - discountAmount);

        logger.info(`Coupon validated: ${code}`, {
            userId,
            orderTotal,
            discountAmount,
            finalAmount
        });

        return {
            valid: true,
            couponId: coupon.id,
            discountAmount,
            finalAmount
        };
    }

    /**
     * Calculate discount amount based on coupon type
     */
    private calculateDiscount(
        coupon: typeof coupons.$inferSelect,
        orderTotal: number
    ): number {
        const discountValue = parseFloat(coupon.discountValue);

        if (coupon.discountType === "fixed") {
            // Fixed amount discount (e.g., ₹100 off)
            return Math.min(discountValue, orderTotal);
        } else {
            // Percentage discount (e.g., 20% off)
            const percentageDiscount = (orderTotal * discountValue) / 100;
            return Math.min(percentageDiscount, orderTotal);
        }
    }

    /**
     * Check if user has already used a coupon
     */
    async hasUserUsedCoupon(couponId: number, userId: number): Promise<boolean> {
        const [usage] = await db
            .select()
            .from(couponUsage)
            .where(and(
                eq(couponUsage.couponId, couponId),
                eq(couponUsage.userId, userId)
            ));

        return !!usage;
    }

    /**
     * ⚠️ PHASE 2: Get count of how many times user has used a coupon
     */
    async getUserUsageCount(couponId: number, userId: number): Promise<number> {
        const [result] = await db
            .select({ count: count() })
            .from(couponUsage)
            .where(and(
                eq(couponUsage.couponId, couponId),
                eq(couponUsage.userId, userId)
            ));

        return result?.count || 0;
    }

    /**
     * Record coupon usage after successful order
     */
    async recordUsage(couponId: number, userId: number, orderId: number): Promise<void> {
        try {
            // Insert usage record
            await db.insert(couponUsage).values({
                couponId,
                userId,
                orderId
            });

            // Increment global usage count
            const [current] = await db.select({ count: coupons.usageCount }).from(coupons).where(eq(coupons.id, couponId));
            await db.update(coupons).set({ usageCount: (current?.count || 0) + 1 }).where(eq(coupons.id, couponId));

            logger.info(`Coupon usage recorded`, { couponId, userId, orderId });
        } catch (error) {
            logger.error("Failed to record coupon usage", error);
            throw error;
        }
    }

    /**
     * Get coupon by code (for validation endpoint)
     */
    async getCouponByCode(code: string) {
        const [coupon] = await db
            .select()
            .from(coupons)
            .where(eq(coupons.code, code));

        return coupon;
    }
}

export const couponService = new CouponService();
