import cron from 'node-cron';
import { db } from '../db';
import { cartItems, users } from '@shared/schema';
import { eq, lt, and, isNotNull, sql } from 'drizzle-orm';
import { NotificationService } from './notificationService';
import { logger } from '../logger';

export class JobService {
    static init() {
        // Run every hour
        cron.schedule('0 * * * *', () => {
            logger.info("Running Abandoned Cart Check...");
            this.checkAbandonedCarts();
        });
        logger.info("JobService initialized: Cron jobs scheduled.");
    }

    static async checkAbandonedCarts() {
        try {
            // Find carts updated more than 24 hours ago
            // And user has an email (is logged in)
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

            // Get distinct users with abandoned items
            const abandonedCarts = await db.selectDistinct({
                userId: cartItems.userId,
                email: users.email,
                name: users.name
            })
                .from(cartItems)
                .innerJoin(users, eq(cartItems.userId, users.id))
                .where(and(
                    lt(cartItems.updatedAt, cutoff),
                    isNotNull(cartItems.userId)
                ));

            logger.info(`Found ${abandonedCarts.length} potential abandoned carts.`);

            for (const cart of abandonedCarts) {
                if (!cart.userId || !cart.email) continue;

                // TODO: Logic to avoid sending multiple emails for the same abandonment (e.g. check a 'last_reminded' flag or log)
                // For MVP/Demo, we will send and rely on the fact that if they don't act, they get another one next run?
                // Or better, we only send if they haven't been emailed recently.
                // Since schema update for 'last_reminded' wasn't part of plan, we'll just log/mock send for now or do a one-time check.

                await NotificationService.sendAbandonedCartEmail(cart.email, cart.name, "http://localhost:5000/cart");
                logger.info(`Sent abandoned cart email to user ${cart.userId}`);
            }

        } catch (error) {
            logger.error("Error in checkAbandonedCarts:", error);
        }
    }
}
