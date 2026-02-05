/**
 * Stock Reservation Service
 * 
 * Manages temporary stock locks during checkout to prevent overselling.
 * Reservations expire after 15 minutes and are automatically released.
 */

import { db } from "../db";
import { stockReservations, products } from "@shared/schema";
import { eq, and, lt, gt, sql } from "drizzle-orm";
import { logger } from "../logger";

export class StockReservationService {
    private static RESERVATION_TIMEOUT_MINUTES = 15;

    /**
     * Reserve stock for cart items during checkout
     * Returns reservation ID if successful
     */
    async reserveStock(
        cartItems: Array<{ productId: number; quantity: number }>,
        userId?: number,
        sessionId?: string
    ): Promise<number> {
        if (!userId && !sessionId) {
            throw new Error("Either userId or sessionId must be provided");
        }

        // Use database time for expiration to avoid clock skew
        const expiresAt = sql`NOW() + INTERVAL '${sql.raw(StockReservationService.RESERVATION_TIMEOUT_MINUTES.toString())} minutes'`;

        return await db.transaction(async (tx) => {
            // Sort items by ID to prevent deadlocks when locking multiple rows
            const sortedItems = [...cartItems].sort((a, b) => a.productId - b.productId);
            const reservations = [];

            for (const item of sortedItems) {
                // 1. LOCK the product row to serialize access
                // This prevents other transactions from reserving this product until we commit/rollback
                const [product] = await tx
                    .select({ stockQuantity: products.stockQuantity })
                    .from(products)
                    .where(eq(products.id, item.productId))
                    .for('update');

                if (!product) {
                    throw new Error(`Product ${item.productId} not found`);
                }

                // 2. Calculate currently active reservations (inside the same transaction)
                const [result] = await tx
                    .select({ reserved: sql<number>`COALESCE(SUM(${stockReservations.quantity}), 0)` })
                    .from(stockReservations)
                    .where(
                        and(
                            eq(stockReservations.productId, item.productId),
                            eq(stockReservations.status, "active"),
                            gt(stockReservations.expiresAt, sql`NOW()`)
                        )
                    );

                const reservedQuantity = Number(result?.reserved || 0);
                const availableStock = product.stockQuantity - reservedQuantity;

                if (availableStock < item.quantity) {
                    throw new Error(`Insufficient stock for product ${item.productId}. Available: ${availableStock}, Requested: ${item.quantity}`);
                }

                // 3. Insert reservation
                const [reservation] = await tx.insert(stockReservations).values({
                    productId: item.productId,
                    userId,
                    sessionId,
                    quantity: item.quantity,
                    expiresAt,
                    status: "active"
                }).returning();

                reservations.push(reservation);
            }

            // Validated and inserted for all items.
            logger.info(`Stock reserved atomically for ${reservations.length} items`, { userId, sessionId });
            return reservations[0].id;
        });
    }

    /**
     * Get available stock for a product (physical stock - active reservations)
     */
    async getAvailableStock(productId: number): Promise<number> {
        // Get physical stock
        const [product] = await db
            .select({ stockQuantity: products.stockQuantity })
            .from(products)
            .where(eq(products.id, productId));

        if (!product) {
            throw new Error(`Product ${productId} not found`);
        }

        // Get sum of active reservations
        const result = await db
            .select({ reserved: sql<number>`COALESCE(SUM(${stockReservations.quantity}), 0)` })
            .from(stockReservations)
            .where(
                and(
                    eq(stockReservations.productId, productId),
                    eq(stockReservations.status, "active"),
                    gt(stockReservations.expiresAt, sql`NOW()`) // Only count non-expired
                )
            );

        const reservedQuantity = Number(result[0]?.reserved || 0);
        const availableStock = product.stockQuantity - reservedQuantity;

        return Math.max(0, availableStock);
    }

    /**
     * Release a reservation (on payment failure or user cancels)
     */
    async releaseReservation(reservationId: number): Promise<void> {
        await db
            .update(stockReservations)
            .set({ status: "released" })
            .where(eq(stockReservations.id, reservationId));

        logger.info(`Stock reservation released`, { reservationId });
    }

    /**
     * Release all reservations for a user/session (on checkout cancel)
     */
    async releaseUserReservations(userId?: number, sessionId?: string): Promise<void> {
        const conditions = [
            eq(stockReservations.status, "active")
        ];

        if (userId) {
            conditions.push(eq(stockReservations.userId, userId));
        } else if (sessionId) {
            conditions.push(eq(stockReservations.sessionId, sessionId));
        } else {
            throw new Error("Either userId or sessionId must be provided");
        }

        await db
            .update(stockReservations)
            .set({ status: "released" })
            .where(and(...conditions));

        logger.info(`All reservations released`, { userId, sessionId });
    }

    /**
     * Mark reservation as consumed (on successful order creation)
     */
    async consumeReservation(reservationId: number, orderId: number): Promise<void> {
        await db
            .update(stockReservations)
            .set({
                status: "consumed",
                orderId
            })
            .where(eq(stockReservations.id, reservationId));

        logger.info(`Stock reservation consumed`, { reservationId, orderId });
    }

    /**
     * Release expired reservations (cron job runs this every 5 minutes)
     */
    async releaseExpiredReservations(): Promise<number> {
        try {
            const result = await db
                .update(stockReservations)
                .set({ status: "released" })
                .where(
                    and(
                        eq(stockReservations.status, "active"),
                        lt(stockReservations.expiresAt, sql`NOW()`)
                    )
                )
                .returning();

            const count = result.length;

            if (count > 0) {
                logger.info(`Released ${count} expired stock reservations`);
            }

            return count;
        } catch (error) {
            logger.error("Stock cleanup failed:", error);
            // Don't let the cron job hang the entire connection pool
            throw error;
        }
    }

    /**
     * Get reservation details
     */
    async getReservation(reservationId: number) {
        const [reservation] = await db
            .select()
            .from(stockReservations)
            .where(eq(stockReservations.id, reservationId));

        return reservation;
    }

    /**
     * Check if a reservation is still valid
     */
    async isReservationValid(reservationId: number): Promise<boolean> {
        const reservation = await this.getReservation(reservationId);

        if (!reservation) return false;
        if (reservation.status !== "active") return false;
        if (reservation.expiresAt < new Date()) return false;

        return true;
    }
}

export const stockReservationService = new StockReservationService();
