import { db } from "../db";
import { coupons, type Coupon, type InsertCoupon } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export class CouponRepository {
    async getByCode(code: string): Promise<Coupon | undefined> {
        const [coupon] = await db.select().from(coupons)
            .where(and(eq(coupons.code, code.toUpperCase()), eq(coupons.isActive, true)));
        return coupon;
    }

    async validate(code: string, orderAmount: number): Promise<{ valid: boolean; discount: number; message?: string }> {
        const coupon = await this.getByCode(code);

        if (!coupon) {
            return { valid: false, discount: 0, message: "Invalid coupon code" };
        }

        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            return { valid: false, discount: 0, message: "Coupon has expired" };
        }

        if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
            return { valid: false, discount: 0, message: "Coupon usage limit reached" };
        }

        const minAmount = parseFloat(coupon.minOrderAmount || "0");
        if (orderAmount < minAmount) {
            return { valid: false, discount: 0, message: `Minimum order amount is ₹${minAmount}` };
        }

        let discount = 0;
        if (coupon.discountType === "percentage") {
            discount = (orderAmount * parseFloat(coupon.discountValue)) / 100;
        } else {
            discount = parseFloat(coupon.discountValue);
        }

        return { valid: true, discount: Math.min(discount, orderAmount) };
    }

    async incrementUsage(code: string): Promise<void> {
        await db.update(coupons)
            .set({ usageCount: sql`${coupons.usageCount} + 1` })
            .where(eq(coupons.code, code.toUpperCase()));
    }

    async create(coupon: InsertCoupon): Promise<Coupon> {
        const [newCoupon] = await db.insert(coupons)
            .values({ ...coupon, code: coupon.code.toUpperCase() })
            .returning();
        return newCoupon;
    }

    async getAll(): Promise<Coupon[]> {
        return await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    }

    async delete(id: number): Promise<boolean> {
        const [updated] = await db.update(coupons)
            .set({ isActive: false })
            .where(eq(coupons.id, id))
            .returning();
        return !!updated;
    }
}

export const couponRepository = new CouponRepository();
