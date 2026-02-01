import { Worker, Job } from "bullmq";
import { getEmailQueue, getSharedConnection, QUEUE_NAMES } from "./queue-config";
import { logger } from "../logger";

// ============================================================================
// EMAIL JOB TYPES
// ============================================================================

export enum EmailJobType {
    WELCOME = "welcome",
    ORDER_CONFIRMATION = "order_confirmation",
    PASSWORD_RESET = "password_reset",
    VERIFICATION = "verification",
    ABANDONED_CART = "abandoned_cart",
    SHIPPING_UPDATE = "shipping_update",
    REFUND_NOTIFICATION = "refund_notification",
}

// Job payload types
export interface WelcomeEmailPayload {
    type: EmailJobType.WELCOME;
    email: string;
    name?: string;
}

export interface OrderConfirmationPayload {
    type: EmailJobType.ORDER_CONFIRMATION;
    email: string;
    name?: string;
    orderId: number;
    totalAmount: string;
    items: any[];
}

export interface PasswordResetPayload {
    type: EmailJobType.PASSWORD_RESET;
    email: string;
    token: string;
}

export interface VerificationPayload {
    type: EmailJobType.VERIFICATION;
    email: string;
    otp: string;
}

export interface AbandonedCartPayload {
    type: EmailJobType.ABANDONED_CART;
    email: string;
    name?: string;
    cartUrl: string;
}

export interface ShippingUpdatePayload {
    type: EmailJobType.SHIPPING_UPDATE;
    email: string;
    orderId: number;
    trackingNumber?: string;
    status: string;
}

export interface RefundNotificationPayload {
    type: EmailJobType.REFUND_NOTIFICATION;
    email: string;
    orderId: number;
    amount: string;
    status: string;
}

export type EmailJobPayload =
    | WelcomeEmailPayload
    | OrderConfirmationPayload
    | PasswordResetPayload
    | VerificationPayload
    | AbandonedCartPayload
    | ShippingUpdatePayload
    | RefundNotificationPayload;

// ============================================================================
// EMAIL QUEUE API
// ============================================================================

/**
 * Add an email job to the queue
 */
export async function queueEmail(payload: EmailJobPayload): Promise<string> {
    const queue = getEmailQueue();

    const job = await queue.add(payload.type, payload, {
        priority: getEmailPriority(payload.type),
    });

    logger.info(`📧 Email job queued: ${payload.type}`, {
        jobId: job.id,
        email: payload.email
    });

    return job.id || "";
}

/**
 * Get priority for email type (lower = higher priority)
 */
function getEmailPriority(type: EmailJobType): number {
    switch (type) {
        case EmailJobType.VERIFICATION:
        case EmailJobType.PASSWORD_RESET:
            return 1; // Highest priority - time-sensitive
        case EmailJobType.ORDER_CONFIRMATION:
            return 2;
        case EmailJobType.REFUND_NOTIFICATION:
        case EmailJobType.SHIPPING_UPDATE:
            return 3;
        case EmailJobType.WELCOME:
            return 5;
        case EmailJobType.ABANDONED_CART:
            return 10; // Lowest priority - marketing
        default:
            return 5;
    }
}

// ============================================================================
// EMAIL WORKER (PROCESSOR)
// ============================================================================

let emailWorker: Worker | null = null;

/**
 * Start the email worker to process queued jobs
 */
export function startEmailWorker(): void {
    if (emailWorker) {
        logger.warn("Email worker already running");
        return;
    }

    emailWorker = new Worker(
        QUEUE_NAMES.EMAIL,
        async (job: Job<EmailJobPayload>) => {
            return processEmailJob(job);
        },
        {
            connection: getSharedConnection(),
            concurrency: 5, // Process up to 5 emails concurrently
            limiter: {
                max: 100, // Max 100 jobs
                duration: 60000, // Per minute (rate limiting)
            },
        }
    );

    // Event handlers
    emailWorker.on("completed", (job: Job<EmailJobPayload>) => {
        logger.info(`📧 Email sent successfully: ${job.name}`, { jobId: job.id });
    });

    emailWorker.on("failed", (job: Job<EmailJobPayload> | undefined, error: Error) => {
        logger.error(`📧 Email job failed: ${job?.name}`, {
            jobId: job?.id,
            error: error.message,
            attempts: job?.attemptsMade,
        });
    });

    emailWorker.on("error", (error: Error) => {
        logger.error("Email worker error:", error);
    });

    logger.info("📧 Email worker started");
}

/**
 * Stop the email worker gracefully
 */
export async function stopEmailWorker(): Promise<void> {
    if (emailWorker) {
        await emailWorker.close();
        emailWorker = null;
        logger.info("Email worker stopped");
    }
}

/**
 * Process an email job
 */
async function processEmailJob(job: Job<EmailJobPayload>): Promise<void> {
    const { emailService } = await import("../services/email");
    const payload = job.data;

    logger.debug(`Processing email job: ${payload.type}`, {
        jobId: job.id,
        attempt: job.attemptsMade + 1
    });

    switch (payload.type) {
        case EmailJobType.WELCOME:
            await emailService.sendWelcomeEmail({
                email: payload.email,
                name: payload.name,
            });
            break;

        case EmailJobType.ORDER_CONFIRMATION:
            await emailService.sendOrderConfirmation(
                { email: payload.email, name: payload.name },
                {
                    id: payload.orderId,
                    totalAmount: payload.totalAmount,
                    items: payload.items
                }
            );
            break;

        case EmailJobType.PASSWORD_RESET:
            await emailService.sendPasswordReset(
                { email: payload.email },
                payload.token
            );
            break;

        case EmailJobType.VERIFICATION:
            await emailService.sendVerificationEmail(
                payload.email,
                payload.otp
            );
            break;

        case EmailJobType.ABANDONED_CART:
            // Use notification service for abandoned cart
            const { NotificationService } = await import("../services/notificationService");
            await NotificationService.sendAbandonedCartEmail(
                payload.email,
                payload.name || "Customer",
                payload.cartUrl
            );
            break;

        default:
            logger.warn(`Unknown email job type: ${(payload as any).type}`);
    }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Queue a welcome email
 */
export function queueWelcomeEmail(email: string, name?: string): Promise<string> {
    return queueEmail({
        type: EmailJobType.WELCOME,
        email,
        name,
    });
}

/**
 * Queue an order confirmation email
 */
export function queueOrderConfirmation(
    email: string,
    orderId: number,
    totalAmount: string,
    items: any[],
    name?: string
): Promise<string> {
    return queueEmail({
        type: EmailJobType.ORDER_CONFIRMATION,
        email,
        name,
        orderId,
        totalAmount,
        items,
    });
}

/**
 * Queue a password reset email
 */
export function queuePasswordReset(email: string, token: string): Promise<string> {
    return queueEmail({
        type: EmailJobType.PASSWORD_RESET,
        email,
        token,
    });
}

/**
 * Queue a verification email
 */
export function queueVerificationEmail(email: string, otp: string): Promise<string> {
    return queueEmail({
        type: EmailJobType.VERIFICATION,
        email,
        otp,
    });
}

/**
 * Queue an abandoned cart email
 */
export function queueAbandonedCartEmail(
    email: string,
    name: string,
    cartUrl: string
): Promise<string> {
    return queueEmail({
        type: EmailJobType.ABANDONED_CART,
        email,
        name,
        cartUrl,
    });
}
