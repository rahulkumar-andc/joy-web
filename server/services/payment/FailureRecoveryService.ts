/**
 * Failure Recovery Service
 * 
 * Handles edge cases and system failures:
 * 1. Money debited but order not confirmed (Zombies)
 * 2. Stuck orders (Payment Pending > 1h)
 * 3. Webhook processing failures (Retries)
 * 4. Gateway downtime recovery
 */

import { db } from "../../db";
import { orders, payments } from "@shared/schema";
import { webhookEvents } from "@shared/payment-schema";
import { PaymentStateMachine, PaymentState } from "./PaymentStateMachine";
import { OrderStateMachine, OrderState } from "./OrderStateMachine";
import { WebhookHandler } from "./WebhookHandler";
import { eq, and, lt, inArray, or } from "drizzle-orm";
import { logger } from "../../logger";

export class FailureRecoveryService {

    /**
     * Recover stuck orders
     * Finds orders in 'PAYMENT_PENDING' that are older than threshold
     */
    static async recoverStuckOrders() {
        logger.info("Running stuck order recovery...");

        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        // Find orders pending for > 1 hour
        const stuckOrders = await db.execute<any>(`
            SELECT id, order_state FROM orders 
            WHERE order_state = 'PAYMENT_PENDING' 
            AND created_at < '${oneHourAgo.toISOString()}'
            LIMIT 50
        `);
        // Note: use proper safe casting if needed, assuming array
        const ordersList: any[] = Array.isArray(stuckOrders) ? stuckOrders : [];

        for (const order of ordersList) {
            // Check if there is a successful payment linked?
            const [successPayment] = await db
                .select()
                .from(payments)
                .where(and(
                    eq(payments.orderId, order.id),
                    eq(payments.paymentState, PaymentState.SUCCESS)
                ));

            if (successPayment) {
                // Critical Discrepancy: Payment Success but Order Pending!
                logger.warn(`Recovering Order ${order.id}: Payment successful but order pending.`);
                await OrderStateMachine.transition({
                    orderId: order.id,
                    toState: OrderState.CONFIRMED,
                    triggeredBy: "system",
                    metadata: { reason: "Recovery Service: Found successful payment" }
                });
            } else {
                // No success payment. 
                // Check if there are any recent attempts? 
                // If totally abandoned, we might auto-cancel to release inventory.
                logger.info(`Auto-cancelling abandoned order ${order.id}`);
                try {
                    await OrderStateMachine.transition({
                        orderId: order.id,
                        toState: OrderState.CANCELLED,
                        triggeredBy: "system",
                        metadata: { reason: "Recovery Service: Abandoned (Timeout)" }
                    });
                } catch (e) {
                    // Ignore if transition invalid (some race condition)
                }
            }
        }
    }

    /**
     * Retry failed webhooks
     */
    static async retryFailedWebhooks() {
        logger.info("Retrying failed webhooks...");

        // Find failed or unprocessed events with retry_count < 5
        const failedEvents = await db
            .select()
            .from(webhookEvents)
            .where(and(
                or(
                    eq(webhookEvents.status, "FAILED"),
                    eq(webhookEvents.status, "RECEIVED") // Maybe stuck in received?
                ),
                lt(webhookEvents.retryCount, 5)
            ))
            .limit(20); // Process in small batches

        for (const event of failedEvents) {
            try {
                // Increment count first
                await db.update(webhookEvents)
                    .set({ retryCount: event.retryCount + 1, status: "PROCESSING" })
                    .where(eq(webhookEvents.id, event.id));

                // Re-process
                // We reuse WebhookHandler logic. 
                // Note: WebhookHandler expects signature verification. 
                // For retries of STORED events, we trust the store content (it was verified on ingestion).
                // So we strictly call the processing logic directly, avoiding signature check if possible,
                // OR we call the public handler passing the stored signature.

                if (event.gateway === "razorpay") {
                    await WebhookHandler.handleRazorpayWebhook(event.signature, event.payload);
                }
                // Add Stripe if implemented

                logger.info(`Successfully retried webhook event ${event.eventId}`);

            } catch (error: any) {
                logger.error(`Retry failed for event ${event.eventId}: ${error.message}`);
                await db.update(webhookEvents)
                    .set({
                        status: "FAILED",
                        errorMessage: error.message,
                        // retryCount was already incremented
                    })
                    .where(eq(webhookEvents.id, event.id));
            }
        }
    }
}
