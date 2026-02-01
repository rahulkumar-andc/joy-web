/**
 * Refund Gateway Service
 * 
 * Handles interactions with Razorpay/Stripe for refunds
 */

import Razorpay from "razorpay";
import { refundRepository } from "../../repositories/refundRepository";
import { RefundStateMachine, RefundState } from "./RefundStateMachine";
import { paymentRepository } from "../../repositories/paymentRepository"; // We need this to get payment ID
import { logger } from "../../logger";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export class RefundGatewayService {

    /**
     * Process a refund with the Gateway
     */
    static async processRefund(refundId: number) {
        const refund = await refundRepository.getRefundById(refundId);
        if (!refund) throw new Error("Refund not found");

        // 1. Find original payment
        const payment = await paymentRepository.findByOrderId(refund.orderId);
        if (!payment || !payment.razorpayPaymentId) {
            throw new Error("Original payment not found or missing gateway reference");
        }

        try {
            // Update state to PROCESSING
            await RefundStateMachine.transition({
                refundId,
                toState: RefundState.PROCESSING,
                triggeredBy: "system"
            });

            // 2. Call Gateway
            let gatewayRefund: any;

            if (payment.gateway === "razorpay") {
                // Razorpay refund
                // Convert amount to paise logic if needed, but 'refund.amount' is usually decimal string "100.00"
                // Razorpay expects paise integer? Or decimal? 
                // Usually Razorpay API for refunds takes amount in "smallest currency unit" (paise)
                const amountInPaise = Math.round(parseFloat(refund.amount) * 100);

                gatewayRefund = await razorpay.payments.refund(payment.razorpayPaymentId, {
                    amount: amountInPaise,
                    speed: "normal", // or optimum
                    notes: {
                        refundId: refundId.toString(),
                        reason: refund.reason
                    },
                    receipt: `ref_${refundId}`
                });
            } else {
                // Stripe
                throw new Error("Stripe refund not implemented yet");
            }

            // 3. Success
            logger.info(`Gateway refund successful: ${gatewayRefund.id}`);

            await RefundStateMachine.transition({
                refundId,
                toState: RefundState.SUCCESS, // Or PENDING if gateway says pending
                triggeredBy: "gateway",
                gatewayRefundId: gatewayRefund.id,
                metadata: gatewayRefund
            });

        } catch (error: any) {
            logger.error(`Gateway refund failed: ${error.message}`);

            await RefundStateMachine.transition({
                refundId,
                toState: RefundState.FAILED,
                triggeredBy: "gateway",
                reason: error.message
            });

            throw error;
        }
    }
}
