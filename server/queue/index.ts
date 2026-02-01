/**
 * Queue System - Main Entry Point
 * 
 * Phase 3: Scale Preparation - Background Jobs with BullMQ
 */

// Re-export queue config
export {
    getEmailQueue,
    getNotificationQueue,
    getSearchSyncQueue,
    getQueueStats,
    isQueueHealthy,
    shutdownQueues,
    QUEUE_NAMES,
    type QueueStats
} from "./queue-config";

// Re-export email queue (avoid duplicate RefundNotificationPayload)
export {
    EmailJobType,
    queueEmail,
    queueWelcomeEmail,
    queueOrderConfirmation,
    queuePasswordReset,
    queueVerificationEmail,
    queueAbandonedCartEmail,
    startEmailWorker,
    stopEmailWorker,
    type WelcomeEmailPayload,
    type OrderConfirmationPayload,
    type PasswordResetPayload,
    type VerificationPayload,
    type AbandonedCartPayload,
    type ShippingUpdatePayload,
    type EmailJobPayload,
} from "./email.queue";

// Re-export notification queue with renamed type to avoid conflict
export {
    NotificationJobType,
    queueNotification,
    queueOrderPlacedNotification,
    queueLowStockAlert,
    startNotificationWorker,
    stopNotificationWorker,
    type OrderNotificationPayload,
    type PaymentNotificationPayload,
    type LowStockAlertPayload,
    type ReviewNotificationPayload,
    type NotificationJobPayload,
    type RefundNotificationPayload as RefundNotificationJobPayload, // Renamed to avoid conflict
} from "./notification.queue";

import { logger } from "../logger";
import { startEmailWorker, stopEmailWorker } from "./email.queue";
import { startNotificationWorker, stopNotificationWorker } from "./notification.queue";
import { shutdownQueues, isQueueHealthy, getQueueStats } from "./queue-config";

/**
 * Initialize all queue workers
 * Call this during server startup
 */
export async function initQueues(): Promise<void> {
    const healthy = await isQueueHealthy();

    if (!healthy) {
        logger.warn("⚠️ Queue system is not healthy - running in degraded mode (no background jobs)");
        logger.warn("   Configure QUEUE_REDIS_URL or REDIS_URL for full functionality");
        return;
    }

    logger.info("📬 Initializing queue workers...");

    try {
        startEmailWorker();
        startNotificationWorker();

        logger.info("📬 Queue system initialized successfully");
    } catch (error) {
        logger.error("Failed to initialize queue workers:", error);
    }
}

/**
 * Graceful shutdown of all queue workers
 * Call this during server shutdown
 */
export async function shutdownQueueSystem(): Promise<void> {
    logger.info("📬 Shutting down queue system...");

    await Promise.all([
        stopEmailWorker(),
        stopNotificationWorker(),
    ]);

    await shutdownQueues();

    logger.info("📬 Queue system shutdown complete");
}

/**
 * Check if queue system is available
 */
export async function checkQueueHealth(): Promise<{
    healthy: boolean;
    stats: Awaited<ReturnType<typeof getQueueStats>>;
}> {
    const healthy = await isQueueHealthy();
    const stats = healthy ? await getQueueStats() : [];

    return { healthy, stats };
}
