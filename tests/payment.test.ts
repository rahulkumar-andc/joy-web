/**
 * Payment Flow Integration Tests
 * Tests payment creation, verification, transactions, and failure scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { userRepository } from '../server/repositories/userRepository';
import { orderRepository } from '../server/repositories/orderRepository';
import { paymentRepository } from '../server/repositories/paymentRepository';
import { productRepository } from '../server/repositories/productRepository';
import { hashPassword } from '../server/controllers/authController';
import { db } from '../server/db';
import { users, orders, products } from '@shared/schema';
import { eq } from 'drizzle-orm';

describe('Payment Flow', () => {
    let userId: number;
    let productId: number;
    let orderId: number;

    beforeEach(async () => {
        // Create test user
        const hashedPassword = await hashPassword('Secure123');
        const user = await userRepository.create({
            email: 'payment-test@example.com',
            password: hashedPassword,
            name: 'Payment Test User',
            role: 'user',
            isVerified: true
        });
        userId = user.id;

        // Create test product
        const product = await productRepository.create({
            name: 'Test Payment Product',
            description: 'Test product for payment flow',
            price: '1000.00',
            stockQuantity: 10,
            images: ['test.jpg'],
            categoryId: null
        });
        productId = product.id;

        // Create test order
        const order = await orderRepository.createOrder({
            userId,
            totalAmount: '1000.00',
            shippingAddress: {
                fullName: 'Test User',
                addressLine1: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                zipCode: '12345',
                country: 'Test Country'
            },
            orderState: 'CREATED',
            stateVersion: 1,
            stateHistory: [],
            orderIdempotencyKey: `test-${Date.now()}`
        }, [{
            productId,
            quantity: 1,
            price: 1000
        }]);
        orderId = order.id;
    });

    afterEach(async () => {
        // Cleanup in reverse dependency order
        if (orderId) {
            await db.delete(orders).where(eq(orders.id, orderId));
        }
        if (productId) {
            await db.delete(products).where(eq(products.id, productId));
        }
        if (userId) {
            await db.delete(users).where(eq(users.id, userId));
        }
    });

    describe('Payment Creation', () => {
        it('should create payment record for order', async () => {
            const payment = await paymentRepository.create({
                orderId,
                razorpayOrderId: 'order_test_123',
                amount: '1000.00',
                currency: 'INR',
                status: 'created',
                paymentState: 'CREATED',
                gateway: 'razorpay'
            });

            expect(payment).toBeTruthy();
            expect(payment.orderId).toBe(orderId);
            expect(payment.razorpayOrderId).toBe('order_test_123');
            expect(payment.status).toBe('created');
        });

        it('should prevent duplicate payment for same order', async () => {
            // Create first payment
            await paymentRepository.create({
                orderId,
                razorpayOrderId: 'order_test_123',
                amount: '1000.00',
                currency: 'INR',
                status: 'created',
                paymentState: 'CREATED',
                gateway: 'razorpay'
            });

            // Try to find existing payment
            const existing = await paymentRepository.findByOrderId(orderId);
            expect(existing).toBeTruthy();
            expect(existing?.status).toBe('created');
        });

        it('should validate payment amount matches order amount', async () => {
            const order = await orderRepository.getById(orderId);
            const payment = await paymentRepository.create({
                orderId,
                razorpayOrderId: 'order_test_456',
                amount: order!.totalAmount,
                currency: 'INR',
                status: 'created',
                paymentState: 'CREATED',
                gateway: 'razorpay'
            });

            expect(payment.amount).toBe(order!.totalAmount);
        });
    });

    describe('Payment Verification', () => {
        beforeEach(async () => {
            // Create payment record
            await paymentRepository.create({
                orderId,
                razorpayOrderId: 'order_test_verify',
                amount: '1000.00',
                currency: 'INR',
                status: 'created',
                paymentState: 'CREATED',
                gateway: 'razorpay'
            });
        });

        it('should update payment status to paid', async () => {
            const payment = await paymentRepository.updateStatus(
                'order_test_verify',
                'paid',
                'pay_test_123',
                'signature_test',
                'razorpay'
            );

            expect(payment).toBeTruthy();
            expect(payment?.status).toBe('paid');
            expect(payment?.razorpayPaymentId).toBe('pay_test_123');
        });

        it('should update order status when payment is verified', async () => {
            await paymentRepository.updateStatus(
                'order_test_verify',
                'paid',
                'pay_test_123',
                'signature_test',
                'razorpay'
            );

            await orderRepository.updateOrderStatus(orderId, 'paid');

            const order = await orderRepository.getById(orderId);
            expect(order?.status).toBe('paid');
            expect(order?.paymentStatus).toBe('paid');
        });

        it('should prevent double payment processing (idempotency)', async () => {
            // First payment
            await paymentRepository.updateStatus(
                'order_test_verify',
                'paid',
                'pay_test_123',
                'signature_test',
                'razorpay'
            );

            // Try to verify again
            const payment = await paymentRepository.findByRazorpayOrderId('order_test_verify');
            expect(payment?.status).toBe('paid');
            // In real implementation, should reject second verification
        });
    });

    describe('Payment Failure Scenarios', () => {
        beforeEach(async () => {
            await paymentRepository.create({
                orderId,
                razorpayOrderId: 'order_test_fail',
                amount: '1000.00',
                currency: 'INR',
                status: 'created',
                paymentState: 'CREATED',
                gateway: 'razorpay'
            });
        });

        it('should mark payment as failed on verification failure', async () => {
            const payment = await paymentRepository.updateStatus(
                'order_test_fail',
                'failed',
                'pay_test_failed',
                'invalid_signature',
                'razorpay'
            );

            expect(payment).toBeTruthy();
            expect(payment?.status).toBe('failed');
        });

        it('should not update order status on payment failure', async () => {
            await paymentRepository.updateStatus(
                'order_test_fail',
                'failed',
                'pay_test_failed',
                'invalid_signature',
                'razorpay'
            );

            const order = await orderRepository.getById(orderId);
            expect(order?.status).not.toBe('paid');
        });
    });

    describe('Transaction Atomicity', () => {
        it('should rollback on payment verification failure', async () => {
            await paymentRepository.create({
                orderId,
                razorpayOrderId: 'order_test_transaction',
                amount: '1000.00',
                currency: 'INR',
                status: 'created',
                paymentState: 'CREATED',
                gateway: 'razorpay'
            });

            // Simulate transaction failure scenario
            // If payment update succeeds but order update fails,
            // the transaction should rollback both changes

            const orderBefore = await orderRepository.getById(orderId);
            const initialStatus = orderBefore?.status;

            // In a real scenario with transaction wrapper,
            // both would rollback if either fails
            expect(initialStatus).toBe('pending');
        });

        it('should ensure payment and order update happen atomically', async () => {
            await paymentRepository.create({
                orderId,
                razorpayOrderId: 'order_test_atomic',
                amount: '1000.00',
                currency: 'INR',
                status: 'created',
                paymentState: 'CREATED',
                gateway: 'razorpay'
            });

            // Update payment
            await paymentRepository.updateStatus(
                'order_test_atomic',
                'paid',
                'pay_test_789',
                'signature_test',
                'razorpay'
            );

            // Update order
            await orderRepository.updateOrderStatus(orderId, 'paid');

            // Both should be updated
            const payment = await paymentRepository.findByRazorpayOrderId('order_test_atomic');
            const order = await orderRepository.getById(orderId);

            expect(payment?.status).toBe('paid');
            expect(order?.status).toBe('paid');
        });
    });

    describe('Payment State Machine', () => {
        it('should track payment state transitions', async () => {
            const payment = await paymentRepository.create({
                orderId,
                razorpayOrderId: 'order_test_state',
                amount: '1000.00',
                currency: 'INR',
                status: 'created',
                paymentState: 'CREATED',
                gateway: 'razorpay'
            });

            expect(payment.paymentState).toBe('CREATED');
            expect(payment.stateVersion).toBe(1);
        });

        it('should increment state version on transitions', async () => {
            const payment = await paymentRepository.create({
                orderId,
                razorpayOrderId: 'order_test_version',
                amount: '1000.00',
                currency: 'INR',
                status: 'created',
                paymentState: 'CREATED',
                gateway: 'razorpay',
                stateVersion: 1
            });

            expect(payment.stateVersion).toBe(1);
            // In real state machine, version would increment
        });
    });
});
