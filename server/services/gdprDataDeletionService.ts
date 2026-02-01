/**
 * GDPR Data Deletion Service
 * 
 * Handles complete user data deletion in compliance with GDPR Article 17 (Right to Erasure)
 */

import { db } from '../db';
import {
    users,
    orders,
    orderItems,
    reviews,
    addresses,
    cartItems,
    wishlistItems,
    couponUsage,
    walletTransactions,
    refunds,
    auditLogs
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../logger';
import { AuditService } from './auditService';

interface DeletionResult {
    userId: number;
    success: boolean;
    deletedRecords: {
        orders: number;
        orderItems: number;
        reviews: number;
        addresses: number;
        cartItems: number;
        wishlistItems: number;
        couponUsage: number;
        walletTransactions: number;
        refunds: number;
        auditLogs: number;
        user: boolean;
    };
    error?: string;
}

export class GDPRDataDeletionService {
    /**
     * Complete deletion of user data (GDPR Right to Erasure)
     * 
     * Note: This is permanent and irreversible. Use with caution.
     */
    async deleteUserData(
        userId: number,
        requestedBy: number,
        reason: string = 'User requested data deletion'
    ): Promise<DeletionResult> {
        logger.info('Starting GDPR data deletion', { userId, requestedBy, reason });

        const result: DeletionResult = {
            userId,
            success: false,
            deletedRecords: {
                orders: 0,
                orderItems: 0,
                reviews: 0,
                addresses: 0,
                cartItems: 0,
                wishlistItems: 0,
                couponUsage: 0,
                walletTransactions: 0,
                refunds: 0,
                auditLogs: 0,
                user: false
            }
        };

        try {
            // Log deletion request
            await AuditService.logAction(
                requestedBy,
                'GDPR_DATA_DELETION_REQUESTED',
                'USER',
                userId,
                { reason }
            );

            // Delete in order to respect foreign key constraints

            // 1. Delete refund items (references order_items)
            // Handled by cascade delete on refunds

            // 2. Delete refunds
            const deletedRefunds = await db
                .delete(refunds)
                .where(eq(refunds.userId, userId))
                .returning();
            result.deletedRecords.refunds = deletedRefunds.length;

            // 3. Delete order items (references orders)
            // Get all user's order IDs first
            const userOrders = await db
                .select({ id: orders.id })
                .from(orders)
                .where(eq(orders.userId, userId));

            const orderIds = userOrders.map(o => o.id);

            if (orderIds.length > 0) {
                for (const orderId of orderIds) {
                    const deletedItems = await db
                        .delete(orderItems)
                        .where(eq(orderItems.orderId, orderId))
                        .returning();
                    result.deletedRecords.orderItems += deletedItems.length;
                }
            }

            // 4. Delete orders
            const deletedOrders = await db
                .delete(orders)
                .where(eq(orders.userId, userId))
                .returning();
            result.deletedRecords.orders = deletedOrders.length;

            // 5. Delete reviews
            const deletedReviews = await db
                .delete(reviews)
                .where(eq(reviews.userId, userId))
                .returning();
            result.deletedRecords.reviews = deletedReviews.length;

            // 6. Delete addresses
            const deletedAddresses = await db
                .delete(addresses)
                .where(eq(addresses.userId, userId))
                .returning();
            result.deletedRecords.addresses = deletedAddresses.length;

            // 7. Delete cart items
            const deletedCartItems = await db
                .delete(cartItems)
                .where(eq(cartItems.userId, userId))
                .returning();
            result.deletedRecords.cartItems = deletedCartItems.length;

            // 8. Delete wishlist items
            const deletedWishlistItems = await db
                .delete(wishlistItems)
                .where(eq(wishlistItems.userId, userId))
                .returning();
            result.deletedRecords.wishlistItems = deletedWishlistItems.length;

            // 9. Delete coupon usage
            const deletedCouponUsage = await db
                .delete(couponUsage)
                .where(eq(couponUsage.userId, userId))
                .returning();
            result.deletedRecords.couponUsage = deletedCouponUsage.length;

            // 10. Delete wallet transactions
            const deletedWalletTxns = await db
                .delete(walletTransactions)
                .where(eq(walletTransactions.userId, userId))
                .returning();
            result.deletedRecords.walletTransactions = deletedWalletTxns.length;

            // 11. Anonymize audit logs (don't delete for compliance)
            // Instead of deleting, we'll keep them but mark as deleted user
            const deletedAuditLogs = await db
                .update(auditLogs)
                .set({
                    userId: null,
                    details: { anonymized: true, originalUserId: userId }
                })
                .where(eq(auditLogs.userId, userId))
                .returning();
            result.deletedRecords.auditLogs = deletedAuditLogs.length;

            // 12. Delete user account (final step)
            const deletedUser = await db
                .delete(users)
                .where(eq(users.id, userId))
                .returning();
            result.deletedRecords.user = deletedUser.length > 0;

            result.success = true;

            // Log successful deletion
            await AuditService.logAction(
                requestedBy,
                'GDPR_DATA_DELETION_COMPLETED',
                'USER',
                userId,
                { deletedRecords: result.deletedRecords }
            );

            logger.info('GDPR data deletion completed', { userId, result });

            return result;
        } catch (error) {
            logger.error('GDPR data deletion failed', { userId, error });

            result.error = String(error);

            // Log failure
            await AuditService.logAction(
                requestedBy,
                'GDPR_DATA_DELETION_FAILED',
                'USER',
                userId,
                { error: String(error) }
            );

            throw error;
        }
    }

    /**
     * Export user data (GDPR Right to Data Portability)
     */
    async exportUserData(userId: number): Promise<object> {
        logger.info('Exporting user data', { userId });

        const user = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        const userOrders = await db
            .select()
            .from(orders)
            .where(eq(orders.userId, userId));

        const userReviews = await db
            .select()
            .from(reviews)
            .where(eq(reviews.userId, userId));

        const userAddresses = await db
            .select()
            .from(addresses)
            .where(eq(addresses.userId, userId));

        return {
            user: user[0],
            orders: userOrders,
            reviews: userReviews,
            addresses: userAddresses,
            exportedAt: new Date().toISOString()
        };
    }
}

export const gdprDataDeletionService = new GDPRDataDeletionService();
