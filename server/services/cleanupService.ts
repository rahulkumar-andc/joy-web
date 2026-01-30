import { db } from "../db";
import { users, verificationTokens, cartItems, wishlistItems, addresses, reviews, walletTransactions, refunds, orders } from "@shared/schema";
import { eq, lt, and, inArray } from "drizzle-orm";
import { logger } from "../logger";

// Interval in milliseconds (e.g., 1 hour)
const CLEANUP_INTERVAL = 60 * 60 * 1000;

// User expiration (24 hours)
const USER_EXPIRY_MS = 24 * 60 * 60 * 1000;

export class UserCleanupService {
    private timer: NodeJS.Timeout | null = null;

    start() {
        if (this.timer) return;

        logger.info("🧹 UserCleanupService started");

        // Run immediately on startup
        this.cleanup();

        this.timer = setInterval(() => {
            this.cleanup();
        }, CLEANUP_INTERVAL);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    async cleanup() {
        try {
            const cutoff = new Date(Date.now() - USER_EXPIRY_MS);

            // 1. Identify CANDIDATE users to delete (unverified & expired)
            const candidateUsers = await db.select({ id: users.id })
                .from(users)
                .where(and(
                    eq(users.isVerified, false),
                    lt(users.createdAt, cutoff)
                ));

            if (candidateUsers.length > 0) {
                const candidateIds = candidateUsers.map(u => u.id);

                // 2. SAFETY CHECK: Filter out users who have EVER placed an order
                // We must NEVER delete a user with an order to preserve financial history.
                const protectedUsers = await db.select({ userId: orders.userId })
                    .from(orders)
                    .where(inArray(orders.userId, candidateIds))
                    .groupBy(orders.userId);

                const protectedIds = new Set(protectedUsers.map(p => p.userId));

                // 3. Determine Safe-to-Delete Users
                const safeToDeleteIds = candidateIds.filter(id => !protectedIds.has(id));

                if (safeToDeleteIds.length > 0) {
                    logger.info(`🧹 Found ${candidateIds.length} candidates. Protected ${protectedIds.size}. Safe to delete: ${safeToDeleteIds.length}`);

                    // 4. Clean up dependent records for SAFE users only
                    await db.delete(cartItems).where(inArray(cartItems.userId, safeToDeleteIds));
                    await db.delete(wishlistItems).where(inArray(wishlistItems.userId, safeToDeleteIds));
                    await db.delete(addresses).where(inArray(addresses.userId, safeToDeleteIds));
                    await db.delete(reviews).where(inArray(reviews.userId, safeToDeleteIds));
                    await db.delete(walletTransactions).where(inArray(walletTransactions.userId, safeToDeleteIds));
                    await db.delete(refunds).where(inArray(refunds.userId, safeToDeleteIds));

                    // 5. Delete the users
                    const result = await db.delete(users)
                        .where(inArray(users.id, safeToDeleteIds))
                        .returning({ id: users.id });

                    logger.info(`🧹 Cleaned up ${result.length} unverified users and their data.`);
                } else {
                    logger.info(`🧹 Found ${candidateIds.length} candidates, but ALL were protected by existing orders.`);
                }
            }

            // Also cleanup expired verification tokens?
            // DB cleanup for stale tokens
            await db.delete(verificationTokens)
                .where(lt(verificationTokens.expiresAt, new Date()));

        } catch (error) {
            logger.error("❌ UserCleanupService error:", error);
        }
    }
}

export const userCleanupService = new UserCleanupService();
