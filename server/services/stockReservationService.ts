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

        // Check if enough stock is available for all items
        for (const item of cartItems) {
            const availableStock = await this.getAvailableStock(item.productId);
            if (availableStock < item.quantity) {
                throw new Error(`Insufficient stock for product ${item.productId}. Available: ${availableStock}, Requested: ${item.quantity}`);
            }
        }

        // Create reservations for all items
        const reservations = [];
        for (const item of cartItems) {
            const [reservation] = await db.insert(stockReservations).values({
                productId: item.productId,
                userId,
                sessionId,
                quantity: item.quantity,
                expiresAt,
                status: "active"
            }).returning();

            reservations.push(reservation);

            logger.info(`Stock reserved`, {
                reservationId: reservation.id,
                productId: item.productId,
                quantity: item.quantity,
                expiresAt
            });
        }

        // Return ID of first reservation (we can use this to link all)
        return reservations[0].id;
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
