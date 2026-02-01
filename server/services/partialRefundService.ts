/**
 * Partial Refund Service
 * 
 * Handles partial refunds for orders (e.g., refunding specific items or custom amounts)
 */

import { db } from '../db';
import { refunds, orders, orderItems } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../logger';

interface PartialRefundRequest {
    orderId: number;
    userId: number;
    amount: string; // Amount to refund (must be <= order total)
    reason: string;
    description?: string;
    itemIds?: number[]; // Optional: specific order items to refund
    images?: string[];
}

interface PartialRefundResult {
    success: boolean;
    refundId?: number;
    message: string;
    refundAmount?: string;
}

export class PartialRefundService {
    /**
     * Create a partial refund request
     */
    async createPartialRefund(request: PartialRefundRequest): Promise<PartialRefundResult> {
        try {
            // 1. Validate order exists and belongs to user
            const [order] = await db
                .select()
                .from(orders)
                .where(and(
                    eq(orders.id, request.orderId),
                    eq(orders.userId, request.userId)
                ))
                .limit(1);

            if (!order) {
                return {
                    success: false,
                    message: 'Order not found or does not belong to user'
                };
            }

            // 2. Check order is eligible for refund
            if (!['delivered', 'cancelled'].includes(order.status)) {
                return {
                    success: false,
                    message: `Order status '${order.status}' is not eligible for refund`
                };
            }

            // 3. Validate refund amount
            const requestedAmount = parseFloat(request.amount);
            const orderTotal = parseFloat(order.totalAmount);

            if (requestedAmount <= 0) {
                return {
                    success: false,
                    message: 'Refund amount must be greater than 0'
                };
            }

            if (requestedAmount > orderTotal) {
                return {
                    success: false,
                    message: `Refund amount (₹${requestedAmount}) cannot exceed order total (₹${orderTotal})`
                };
            }

            // 4. Check for existing refunds
            const existingRefunds = await db
                .select()
                .from(refunds)
                .where(eq(refunds.orderId, request.orderId));

            const totalRefunded = existingRefunds.reduce((sum, refund) => {
                if (refund.status === 'completed') {
                    return sum + parseFloat(refund.amount);
                }
                return sum;
            }, 0);

            const remainingRefundable = orderTotal - totalRefunded;

            if (requestedAmount > remainingRefundable) {
                return {
                    success: false,
                    message: `Refund amount (₹${requestedAmount}) exceeds remaining refundable amount (₹${remainingRefundable.toFixed(2)})`
                };
            }

            // 5. If specific items are specified, validate them
            if (request.itemIds && request.itemIds.length > 0) {
                const items = await db
                    .select()
                    .from(orderItems)
                    .where(eq(orderItems.orderId, request.orderId));

                const itemTotal = items
                    .filter(item => request.itemIds?.includes(item.id))
                    .reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

                // Warn if amounts don't match (but don't block)
                if (Math.abs(itemTotal - requestedAmount) > 0.01) {
                    logger.warn('Partial refund amount does not match item total', {
                        orderId: request.orderId,
                        requestedAmount,
                        itemTotal,
                        difference: itemTotal - requestedAmount
                    });
                }
            }

            // 6. Create refund request
            const [refund] = await db
                .insert(refunds)
                .values({
                    orderId: request.orderId,
                    userId: request.userId,
                    amount: request.amount,
                    reason: request.reason,
                    description: request.description,
                    images: request.images || [],
                    status: 'pending',
                    refundMethod: 'original'
                })
                .returning();

            logger.info('Partial refund request created', {
                refundId: refund.id,
                orderId: request.orderId,
                amount: request.amount
            });

            return {
                success: true,
                refundId: refund.id,
                message: 'Partial refund request created successfully',
                refundAmount: request.amount
            };
        } catch (error) {
            logger.error('Failed to create partial refund', { error, request });
            return {
                success: false,
                message: 'Failed to create refund request'
            };
        }
    }

    /**
     * Get refund summary for an order
     */
    async getRefundSummary(orderId: number): Promise<{
        orderTotal: number;
        totalRefunded: number;
        remainingRefundable: number;
        refunds: Array<{
            id: number;
            amount: string;
            status: string;
            reason: string;
            createdAt: Date | null;
        }>;
    }> {
        const [order] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, orderId))
            .limit(1);

        if (!order) {
            throw new Error('Order not found');
        }

        const orderRefunds = await db
            .select()
            .from(refunds)
            .where(eq(refunds.orderId, orderId));

        const orderTotal = parseFloat(order.totalAmount);
        const totalRefunded = orderRefunds
            .filter(r => r.status === 'completed')
            .reduce((sum, r) => sum + parseFloat(r.amount), 0);

        return {
            orderTotal,
            totalRefunded,
            remainingRefundable: orderTotal - totalRefunded,
            refunds: orderRefunds.map(r => ({
                id: r.id,
                amount: r.amount,
                status: r.status,
                reason: r.reason,
                createdAt: r.createdAt
            }))
        };
    }
}

export const partialRefundService = new PartialRefundService();
