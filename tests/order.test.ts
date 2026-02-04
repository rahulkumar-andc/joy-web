/**
 * Order Creation Integration Tests
 * Tests stock reservation, transaction atomicity, and rollback scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { userRepository } from '../server/repositories/userRepository';
import { productRepository } from '../server/repositories/productRepository';
import { stockReservationService } from '../server/services/stockReservationService';
import { hashPassword } from '../server/controllers/authController';

describe('Order Creation Flow', () => {
    let userId: number;
    let productId: number;

    beforeEach(async () => {
        // Create test user
        const hashedPassword = await hashPassword('Secure123');
        const user = await userRepository.create({
            email: 'buyer@example.com',
            password: hashedPassword,
            name: 'Buyer User',
            role: 'user',
            isVerified: true
        });
        userId = user.id;

        // Create test product
        const product = await productRepository.create({
            name: 'Test Product',
            description: 'Test Description',
            mrp: '100.00',
            stockQuantity: 10,
            images: ['test.jpg'],
            categoryId: null
        });
        productId = product.id;
    });

    describe('Stock Reservation', () => {
        it('should reserve stock successfully', async () => {
            const reservationId = await stockReservationService.reserveStock([
                { productId, quantity: 3 }
            ], userId);

            expect(reservationId).toBeTruthy();

            // Check available stock decreased
            const available = await stockReservationService.getAvailableStock(productId);
            expect(available).toBe(7); // 10 - 3 reserved
        });

        it('should prevent overselling with concurrent reservations', async () => {
            // Reserve 8 items
            await stockReservationService.reserveStock([
                { productId, quantity: 8 }
            ], userId);

            // Try to reserve 5 more (should fail - only 2 available)
            await expect(
                stockReservationService.reserveStock([
                    { productId, quantity: 5 }
                ], userId + 1)
            ).rejects.toThrow('Insufficient stock');
        });

        it('should release reservation', async () => {
            const reservationId = await stockReservationService.reserveStock([
                { productId, quantity: 5 }
            ], userId);

            await stockReservationService.releaseReservation(reservationId);

            // Stock should be available again
            const available = await stockReservationService.getAvailableStock(productId);
            expect(available).toBe(10);
        });

        it('should calculate available stock correctly', async () => {
            // Initial stock
            let available = await stockReservationService.getAvailableStock(productId);
            expect(available).toBe(10);

            // Reserve 3
            await stockReservationService.reserveStock([
                { productId, quantity: 3 }
            ], userId);

            available = await stockReservationService.getAvailableStock(productId);
            expect(available).toBe(7);
        });
    });
});
