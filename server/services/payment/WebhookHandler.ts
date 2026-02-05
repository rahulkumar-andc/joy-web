/**
 * Webhook Handler Service
 * 
 * Centralized handler for all payment webhooks.
 * Orchestrates:
 * 1. Signature Verification
 * 2. Event Deduplication (via Store)
 * 3. Idempotent Processing
 * 4. State Transitions
 */

import { WebhookEventStore } from "./WebhookEventStore";
import { PaymentStateMachine, PaymentState } from "./PaymentStateMachine";
import { OrderStateMachine, OrderState } from "./OrderStateMachine";
import { paymentRepository } from "../../repositories/paymentRepository";
import { orderRepository } from "../../repositories/orderRepository";
import { logger } from "../../logger";
import crypto from "crypto";
import { AppError } from "../../utils/AppError";

export class WebhookHandler {

    /**
     * Handle Razorpay Webhooks
     */
    static async handleRazorpayWebhook(signature: string, rawBodyBuffer: Buffer) {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
            // For development/mocking, we might skip this if not set
            logger.warn("RAZORPAY_WEBHOOK_SECRET not configured, skipping signature verification");
        } else {
            // 1. Verify Signature using RAW BUFFER
            const expectedSignature = crypto
                .createHmac("sha256", secret)
                .update(rawBodyBuffer)
                .digest("hex");

            if (expectedSignature !== signature) {
                throw new AppError("Invalid Razorpay webhook signature", 400);
            }
        }

        // Parse JSON only AFTER verification
        let rawBody;
        try {
            rawBody = JSON.parse(rawBodyBuffer.toString());
        } catch (e) {
            throw new AppError("Invalid JSON payload", 400);
        }

        const { event, payload } = rawBody;
        // Razorpay paylod structure: { event: "...", payload: { payment: { entity: { id: "pay_...", order_id: "order_..." } } } }

        const paymentEntity = payload.payment?.entity;
        if (!paymentEntity) {
            logger.warn(`Ignored non-payment event: ${event}`);
            return;
        }

        // Unique Event ID for deduplication
        // Razorpay sends "x-razorpay-event-id" header usually. 
        // If not passed here, we construct one.
        const uniqueEventId = `rp_${paymentEntity.id}_${event}_${Date.now()}`;

        // 2. Store & Deduplicate
        const isNew = await WebhookEventStore.storeEvent({
            eventId: uniqueEventId,
            eventType: event,
            gateway: "razorpay",
            payload: rawBody,
            signature
        });

        if (!isNew) {
            return { status: "duplicate" };
        }

        // 3. Process Event
        try {
            await WebhookEventStore.updateStatus(uniqueEventId, "PROCESSING");

            if (event === "payment.captured" || event === "payment.authorized") {
                await this.processPaymentSuccess(
                    paymentEntity.order_id,
                    paymentEntity.id,
                    "razorpay",
                    paymentEntity
                );
            } else if (event === "payment.failed") {
                await this.processPaymentFailure(
                    paymentEntity.order_id,
                    paymentEntity.id,
                    "razorpay",
                    paymentEntity.error_description || "Payment failed"
                );
            }

            await WebhookEventStore.updateStatus(uniqueEventId, "PROCESSED");
        } catch (error: any) {
            logger.error(`Webhook processing failed: ${error.message}`);
            await WebhookEventStore.updateStatus(uniqueEventId, "FAILED", error.message);
            throw error;
        }
    }

    // === CORE PROCESSORS ===

    private static async processPaymentSuccess(
        gatewayOrderId: string,
        gatewayPaymentId: string,
        gateway: "razorpay" | "stripe",
        metadata: any
    ) {
        logger.info(`Processing payment success: ${gatewayOrderId} (${gateway})`);

        // 1. Find Payment Record
        const payment = await paymentRepository.findByRazorpayOrderId(gatewayOrderId);
        if (!payment) {
            logger.error(`Payment record not found for gateway order: ${gatewayOrderId}`);
            return;
        }

        // 2. Transition Payment State
        await PaymentStateMachine.transition({
            paymentId: payment.id,
            toState: PaymentState.SUCCESS,
            triggeredBy: "webhook",
            metadata: { gatewayPaymentId, ...metadata }
        });

        // 3. Update Payment Details (Legacy)
        await paymentRepository.updateStatus(
            gatewayOrderId,
            "paid",
            gatewayPaymentId,
            undefined,
            gateway
        );

        // 4. Transition Order State
        await OrderStateMachine.transition({
            orderId: payment.orderId,
            toState: OrderState.CONFIRMED,
            triggeredBy: "webhook",
            metadata: { paymentId: payment.id }
        });

        // Legacy update for Order status
        await orderRepository.updateOrderStatus(payment.orderId, "paid");
    }

    private static async processPaymentFailure(
        gatewayOrderId: string,
        gatewayPaymentId: string,
        gateway: "razorpay" | "stripe",
        reason: string
    ) {
        logger.info(`Processing payment failure: ${gatewayOrderId}`);

        const payment = await paymentRepository.findByRazorpayOrderId(gatewayOrderId);
        if (!payment) return;

        await PaymentStateMachine.transition({
            paymentId: payment.id,
            toState: PaymentState.FAILED,
            triggeredBy: "webhook",
            metadata: { reason, gatewayPaymentId }
        });

        await paymentRepository.updateStatus(
            gatewayOrderId,
            "failed",
            gatewayPaymentId,
            undefined,
            gateway
        );
    }
}
