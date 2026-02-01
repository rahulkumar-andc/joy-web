/**
 * Coupon Integration Tests
 * Tests validation, discount calculation, and usage tracking
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../server';
import { db } from '../server/db';
import { users, coupons, products, couponUsage, categories, orders } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../server/controllers/authController';
import { couponService } from '../server/services/couponService';

describe('Coupon System', () => {
    let testUser: any;
    let testCoupon: any;
    let testProduct: any;
    let testOrder: any;
    let authCookie: string;

    beforeEach(async () => {
        // Create test user
        const [user] = await db.insert(users).values({
            name: 'Coupon Tester',
            email: 'coupon@test.com',
            password: await hashPassword('Test1234!'),
            role: 'customer',
            isVerified: true
        }).returning();
        testUser = user;

        // Create test category first
        const [category] = await db.insert(categories).values({
            name: 'Test Category',
            slug: 'test-category'
        }).returning();

        // Create test product
        const [product] = await db.insert(products).values({
            name: 'Test Product',
            description: 'Test',
            price: '1000',
            stockQuantity: 10,
            categoryId: category.id,
            images: ['test.jpg']
        }).returning();
        testProduct = product;

        // Create test order
        const [order] = await db.insert(orders).values({
            userId: testUser.id,
            totalAmount: '1000',
            shippingAddress: 'Test Address',
            orderState: 'CREATED',
            stateVersion: 1,
            stateHistory: [],
            orderIdempotencyKey: 'test-key-' + Date.now()
        }).returning();
        testOrder = order;

        // Login to get auth cookie
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'coupon@test.com', password: 'Test1234!' });
        authCookie = loginRes.headers['set-cookie'];
    });

    it('should apply fixed discount correctly', async () => {
        // Create ₹100 off coupon
        await db.insert(coupons).values({
            code: 'SAVE100',
            discountType: 'fixed',
            discountValue: '100',
            minOrderAmount: '0',
            isActive: true
        });

        const validation = await couponService.validateCoupon('SAVE100', testUser.id, 1000);

        expect(validation.valid).toBe(true);
        expect(validation.discountAmount).toBe(100);
        expect(validation.finalAmount).toBe(900);
    });

    it('should apply percentage discount correctly', async () => {
        // Create 20% off coupon
        await db.insert(coupons).values({
            code: 'SAVE20',
            discountType: 'percentage',
            discountValue: '20',
            minOrderAmount: '0',
            isActive: true
        });

        const validation = await couponService.validateCoupon('SAVE20', testUser.id, 1000);

        expect(validation.valid).toBe(true);
        expect(validation.discountAmount).toBe(200); // 20% of 1000
        expect(validation.finalAmount).toBe(800);
    });

    it('should reject expired coupon', async () => {
        await db.insert(coupons).values({
            code: 'EXPIRED',
            discountType: 'fixed',
            discountValue: '50',
            expiresAt: new Date('2024-01-01'), // Past date
            isActive: true
        });

        const validation = await couponService.validateCoupon('EXPIRED', testUser.id, 1000);

        expect(validation.valid).toBe(false);
        expect(validation.error).toBe('Coupon has expired');
    });

    it('should prevent double usage by same user', async () => {
        const [coupon] = await db.insert(coupons).values({
            code: 'ONCEONLY',
            discountType: 'fixed',
            discountValue: '100',
            isActive: true
        }).returning();

        // First usage
        await db.insert(couponUsage).values({
            couponId: coupon.id,
            userId: testUser.id,
            orderId: testOrder.id
        });

        // Second attempt
        const validation = await couponService.validateCoupon('ONCEONLY', testUser.id, 1000);

        expect(validation.valid).toBe(false);
        expect(validation.error).toBe('You have already used this coupon');
    });

    it('should enforce global usage limit', async () => {
        await db.insert(coupons).values({
            code: 'LIMITED',
            discountType: 'fixed',
            discountValue: '50',
            maxUsage: 1,
            usageCount: 1, // Already used once
            isActive: true
        });

        const validation = await couponService.validateCoupon('LIMITED', testUser.id, 1000);

        expect(validation.valid).toBe(false);
        expect(validation.error).toBe('Coupon usage limit exceeded');
    });

    it('should validate minimum purchase amount', async () => {
        await db.insert(coupons).values({
            code: 'MIN500',
            discountType: 'fixed',
            discountValue: '100',
            minOrderAmount: '500',
            isActive: true
        });

        const validation = await couponService.validateCoupon('MIN500', testUser.id, 400);

        expect(validation.valid).toBe(false);
        expect(validation.error).toContain('Minimum order amount');
    });

    it('should record usage after successful order', async () => {
        const [coupon] = await db.insert(coupons).values({
            code: 'TRACK',
            discountType: 'fixed',
            discountValue: '50',
            isActive: true,
            usageCount: 0
        }).returning();

        await couponService.recordUsage(coupon.id, testUser.id, testOrder.id);

        // Verify usage record created
        const [usage] = await db.select().from(couponUsage)
            .where(eq(couponUsage.couponId, coupon.id));
        expect(usage).toBeDefined();
        expect(usage.userId).toBe(testUser.id);
        expect(usage.orderId).toBe(testOrder.id);

        // Verify usage count incremented
        const [updated] = await db.select().from(coupons)
            .where(eq(coupons.id, coupon.id));
        expect(updated.usageCount).toBe(1);
    });
});
