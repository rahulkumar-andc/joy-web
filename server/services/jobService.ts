import cron from 'node-cron';
import { db } from '../db';
import { cartItems, users } from '@shared/schema';
import { eq, lt, and, isNotNull, gte, sql } from 'drizzle-orm';
import { NotificationService } from './notificationService';
import { logger } from '../logger';
import { stockReservationService } from './stockReservationService';
import { queueAbandonedCartEmail } from '../queue/email.queue';
import { getEnv, getEnvNumber } from '../config/env-validation';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Hours after which a cart is considered abandoned
const ABANDONED_CART_THRESHOLD_HOURS = getEnvNumber('ABANDONED_CART_HOURS', 24);

// Minimum hours between reminder emails
const REMINDER_COOLDOWN_HOURS = getEnvNumber('ABANDONED_CART_COOLDOWN_HOURS', 48);

// Track sent reminders in memory for now (in production, use Redis or DB)
const sentReminders = new Map<number, Date>();

// ============================================================================
// JOB SERVICE
// ============================================================================

export class JobService {
    static init() {
        // Run abandoned cart check every hour
        cron.schedule('0 * * * *', () => {
            logger.info("Running Abandoned Cart Check...");
            this.checkAbandonedCarts();
        });

        // Run stock reservation cleanup every 5 minutes
        cron.schedule('*/5 * * * *', async () => {
            await stockReservationService.releaseExpiredReservations();
        });

        // Clean up old reminder tracking (every 24 hours)
        cron.schedule('0 0 * * *', () => {
            this.cleanupReminderTracking();
        });

        logger.info("JobService initialized: Cron jobs scheduled (abandoned carts, stock reservations).");
    }

    /**
     * Check for abandoned carts and send reminder emails
     */
    static async checkAbandonedCarts() {
        try {
            // Find carts updated more than threshold hours ago
            const cutoff = new Date(Date.now() - ABANDONED_CART_THRESHOLD_HOURS * 60 * 60 * 1000);
            const cooldownCutoff = new Date(Date.now() - REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000);

            // Get distinct users with abandoned items
            const abandonedCarts = await db.selectDistinct({
                userId: cartItems.userId,
                email: users.email,
                name: users.name,
                itemCount: sql<number>`count(${cartItems.id})`.as('item_count')
            })
                .from(cartItems)
                .innerJoin(users, eq(cartItems.userId, users.id))
                .where(and(
                    lt(cartItems.updatedAt, cutoff),
                    isNotNull(cartItems.userId)
                ))
                .groupBy(cartItems.userId, users.email, users.name);

            logger.info(`Found ${abandonedCarts.length} potential abandoned carts.`);

            let sentCount = 0;
            let skippedCount = 0;

            for (const cart of abandonedCarts) {
                if (!cart.userId || !cart.email) continue;

                // Check cooldown - don't send if we've sent recently
                const lastSent = sentReminders.get(cart.userId);
                if (lastSent && lastSent > cooldownCutoff) {
                    skippedCount++;
                    continue;
                }

                // Check if user is verified (don't spam unverified accounts)
                const [user] = await db
                    .select({ isVerified: users.isVerified })
                    .from(users)
                    .where(eq(users.id, cart.userId))
                    .limit(1);

                if (!user?.isVerified) {
                    skippedCount++;
                    continue;
                }

                // Send reminder via queue
                const baseUrl = getEnv('BASE_URL', 'http://localhost:5000');

                try {
                    // Use queue for scalability
                    queueAbandonedCartEmail(
                        cart.email,
                        cart.name,
                        `${baseUrl}/cart`
                    );

                    // Track that we sent this
                    sentReminders.set(cart.userId, new Date());
                    sentCount++;

                    logger.info(`Queued abandoned cart email for user ${cart.userId} (${cart.itemCount} items)`);
                } catch (error) {
                    logger.error(`Failed to queue abandoned cart email for user ${cart.userId}:`, error);
                }
            }

            logger.info(`Abandoned cart check complete: ${sentCount} queued, ${skippedCount} skipped (cooldown/unverified)`);

        } catch (error) {
            logger.error("Error in checkAbandonedCarts:", error);
        }
    }

    /**
     * Clean up old reminder tracking entries
     */
    static cleanupReminderTracking() {
        const expiryCutoff = new Date(Date.now() - REMINDER_COOLDOWN_HOURS * 2 * 60 * 60 * 1000);

        let cleaned = 0;
        const entries = Array.from(sentReminders.entries());
        for (const entry of entries) {
            const userId = entry[0];
            const sentAt = entry[1];
            if (sentAt < expiryCutoff) {
                sentReminders.delete(userId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.info(`Cleaned up ${cleaned} old reminder tracking entries`);
        }
    }

    /**
     * Get abandoned cart statistics
     */
    static async getAbandonedCartStats() {
        const cutoff = new Date(Date.now() - ABANDONED_CART_THRESHOLD_HOURS * 60 * 60 * 1000);

        const stats = await db
            .select({
                totalCarts: sql<number>`count(distinct ${cartItems.userId})`,
                totalItems: sql<number>`count(${cartItems.id})`,
            })
            .from(cartItems)
            .where(and(
                lt(cartItems.updatedAt, cutoff),
                isNotNull(cartItems.userId)
            ));

        return {
            abandonedCarts: stats[0]?.totalCarts || 0,
            abandonedItems: stats[0]?.totalItems || 0,
            thresholdHours: ABANDONED_CART_THRESHOLD_HOURS,
            remindersSentRecently: sentReminders.size
        };
    }
}

