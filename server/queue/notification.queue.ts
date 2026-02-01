import { Worker, Job } from "bullmq";
import { getNotificationQueue, getSharedConnection, QUEUE_NAMES } from "./queue-config";
import { logger } from "../logger";

// ============================================================================
// NOTIFICATION JOB TYPES
// ============================================================================

export enum NotificationJobType {
    ORDER_PLACED = "order_placed",
    ORDER_SHIPPED = "order_shipped",
    ORDER_DELIVERED = "order_delivered",
    PAYMENT_RECEIVED = "payment_received",
    REFUND_PROCESSED = "refund_processed",
    LOW_STOCK_ALERT = "low_stock_alert",
    REVIEW_RECEIVED = "review_received",
}

// Job payload types
export interface OrderNotificationPayload {
    type: NotificationJobType.ORDER_PLACED | NotificationJobType.ORDER_SHIPPED | NotificationJobType.ORDER_DELIVERED;
    orderId: number;
    userId: number;
    userEmail: string;
    userName?: string;
    metadata?: Record<string, any>;
}

export interface PaymentNotificationPayload {
    type: NotificationJobType.PAYMENT_RECEIVED;
    orderId: number;
    userId: number;
    amount: string;
    paymentMethod?: string;
}

export interface RefundNotificationPayload {
    type: NotificationJobType.REFUND_PROCESSED;
    orderId: number;
    userId: number;
    amount: string;
    refundId: number;
}

export interface LowStockAlertPayload {
    type: NotificationJobType.LOW_STOCK_ALERT;
    productId: number;
    productName: string;
    currentStock: number;
    threshold: number;
}

export interface ReviewNotificationPayload {
    type: NotificationJobType.REVIEW_RECEIVED;
    productId: number;
    reviewId: number;
    rating: number;
    userId: number;
}

export type NotificationJobPayload =
    | OrderNotificationPayload
    | PaymentNotificationPayload
    | RefundNotificationPayload
    | LowStockAlertPayload
    | ReviewNotificationPayload;

// ============================================================================
// NOTIFICATION QUEUE API
// ============================================================================

/**
 * Add a notification job to the queue
 */
export async function queueNotification(payload: NotificationJobPayload): Promise<string> {
    const queue = getNotificationQueue();

    const job = await queue.add(payload.type, payload, {
        priority: getNotificationPriority(payload.type),
    });

    logger.info(`🔔 Notification queued: ${payload.type}`, { jobId: job.id });

    return job.id || "";
}

/**
 * Get priority for notification type
 */
function getNotificationPriority(type: NotificationJobType): number {
    switch (type) {
        case NotificationJobType.PAYMENT_RECEIVED:
        case NotificationJobType.ORDER_PLACED:
            return 1; // High priority
        case NotificationJobType.REFUND_PROCESSED:
        case NotificationJobType.ORDER_SHIPPED:
            return 2;
        case NotificationJobType.ORDER_DELIVERED:
            return 3;
        case NotificationJobType.LOW_STOCK_ALERT:
            return 5;
        case NotificationJobType.REVIEW_RECEIVED:
            return 10; // Low priority
        default:
            return 5;
    }
}

// ============================================================================
// NOTIFICATION WORKER
// ============================================================================

let notificationWorker: Worker | null = null;

/**
 * Start the notification worker
 */
export function startNotificationWorker(): void {
    if (notificationWorker) {
        logger.warn("Notification worker already running");
        return;
    }

    notificationWorker = new Worker(
        QUEUE_NAMES.NOTIFICATION,
        async (job: Job<NotificationJobPayload>) => {
            return processNotificationJob(job);
        },
        {
            connection: getSharedConnection(),
            concurrency: 10, // Higher concurrency for notifications
        }
    );

    notificationWorker.on("completed", (job: Job<NotificationJobPayload>) => {
        logger.debug(`\ud83d\udd14 Notification processed: ${job.name}`, { jobId: job.id });
    });

    notificationWorker.on("failed", (job: Job<NotificationJobPayload> | undefined, error: Error) => {
        logger.error(`\ud83d\udd14 Notification failed: ${job?.name}`, {
            jobId: job?.id,
            error: error.message
        });
    });

    logger.info("🔔 Notification worker started");
}

/**
 * Stop the notification worker
 */
export async function stopNotificationWorker(): Promise<void> {
    if (notificationWorker) {
        await notificationWorker.close();
        notificationWorker = null;
        logger.info("Notification worker stopped");
    }
}

/**
 * Process a notification job
 */
async function processNotificationJob(job: Job<NotificationJobPayload>): Promise<void> {
    const payload = job.data;

    logger.debug(`Processing notification: ${payload.type}`, { jobId: job.id });

    switch (payload.type) {
        case NotificationJobType.ORDER_PLACED:
            await handleOrderPlaced(payload);
            break;

        case NotificationJobType.ORDER_SHIPPED:
            await handleOrderShipped(payload);
            break;

        case NotificationJobType.ORDER_DELIVERED:
            await handleOrderDelivered(payload);
            break;

        case NotificationJobType.PAYMENT_RECEIVED:
            await handlePaymentReceived(payload);
            break;

        case NotificationJobType.REFUND_PROCESSED:
            await handleRefundProcessed(payload);
            break;

        case NotificationJobType.LOW_STOCK_ALERT:
            await handleLowStockAlert(payload);
            break;

        case NotificationJobType.REVIEW_RECEIVED:
            await handleReviewReceived(payload);
            break;

        default:
            logger.warn(`Unknown notification type: ${(payload as any).type}`);
    }
}

// ============================================================================
// NOTIFICATION HANDLERS
// ============================================================================

async function handleOrderPlaced(payload: OrderNotificationPayload): Promise<void> {
    logger.info(`📦 Order placed notification`, {
        orderId: payload.orderId,
        userId: payload.userId
    });

    // TODO: Send push notification, SMS, etc.
    // For now, just log - email is handled separately
}

async function handleOrderShipped(payload: OrderNotificationPayload): Promise<void> {
    logger.info(`🚚 Order shipped notification`, {
        orderId: payload.orderId,
        trackingInfo: payload.metadata?.trackingNumber
    });
}

async function handleOrderDelivered(payload: OrderNotificationPayload): Promise<void> {
    logger.info(`✅ Order delivered notification`, {
        orderId: payload.orderId
    });
}

async function handlePaymentReceived(payload: PaymentNotificationPayload): Promise<void> {
    logger.info(`💰 Payment received notification`, {
        orderId: payload.orderId,
        amount: payload.amount
    });
}

async function handleRefundProcessed(payload: RefundNotificationPayload): Promise<void> {
    logger.info(`💸 Refund processed notification`, {
        orderId: payload.orderId,
        refundId: payload.refundId,
        amount: payload.amount
    });
}

async function handleLowStockAlert(payload: LowStockAlertPayload): Promise<void> {
    logger.warn(`⚠️ Low stock alert`, {
        productId: payload.productId,
        productName: payload.productName,
        currentStock: payload.currentStock,
        threshold: payload.threshold
    });

    // TODO: Send admin notification email/Slack
}

async function handleReviewReceived(payload: ReviewNotificationPayload): Promise<void> {
    logger.info(`⭐ New review received`, {
        productId: payload.productId,
        rating: payload.rating
    });
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Queue order placed notification
 */
export function queueOrderPlacedNotification(
    orderId: number,
    userId: number,
    userEmail: string,
    userName?: string
): Promise<string> {
    return queueNotification({
        type: NotificationJobType.ORDER_PLACED,
        orderId,
        userId,
        userEmail,
        userName,
    });
}

/**
 * Queue low stock alert
 */
export function queueLowStockAlert(
    productId: number,
    productName: string,
    currentStock: number,
    threshold: number = 10
): Promise<string> {
    return queueNotification({
        type: NotificationJobType.LOW_STOCK_ALERT,
        productId,
        productName,
        currentStock,
        threshold,
    });
}
