import Stripe from 'stripe';
import { orderRepository } from "../repositories/orderRepository";
import { AppError } from "../utils/AppError";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key', {
    apiVersion: '2026-01-28.clover' as any, // Cast to any if needed, or matches strict type
});

export class PaymentService {
    /**
     * Generic retry wrapper with exponential backoff
     */
    private async retryOperation<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
        let lastError: any;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error: any) {
                lastError = error;
                // Retry only on network errors or 5xx server errors
                // Stripe errors usually have 'type' or 'statusCode'
                const isRetryable =
                    error.type === 'StripeConnectionError' ||
                    error.type === 'StripeAPIError' ||
                    (error.statusCode && error.statusCode >= 500);

                if (!isRetryable && i < maxRetries - 1) {
                    // For non-specific errors, we might still retry if it's a network blip, 
                    // but be careful not to retry user errors (400s).
                    // If it's explicitly 4xx, do not retry.
                    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
                        throw error;
                    }
                }

                if (i === maxRetries - 1) break;

                const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
                console.warn(`Payment operation failed, retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw lastError;
    }

    async createCheckoutSession(orderId: number, amount: string, currency: string = 'inr') {
        const order = await orderRepository.getById(orderId);
        if (!order) throw new AppError("Order not found", 404);

        // Convert string amount to smallest currency unit (e.g., cents/paise)
        // Assuming amount is string like "100.00"
        const unitAmount = Math.round(parseFloat(amount) * 100);

        // Create line item (simplified for now as one total, but could list all items)
        return await this.retryOperation(async () => {
            return await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: currency,
                        product_data: {
                            name: `Order #${orderId}`,
                            description: `Payment for Order #${orderId}`,
                        },
                        unit_amount: unitAmount,
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                success_url: `${process.env.BASE_URL || 'http://localhost:5000'}/order/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
                cancel_url: `${process.env.BASE_URL || 'http://localhost:5000'}/order/failure?order_id=${orderId}`,
                metadata: {
                    orderId: orderId.toString()
                }
            });
        });
    }

    async handleWebhook(signature: string, payload: Buffer) {
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            console.warn("STRIPE_WEBHOOK_SECRET not set, skipping signature verification");
            // In dev, you might proceed, but in prod this is critical.
            // For now, Mock environment might trigger this manually.
        }

        let event;
        try {
            event = stripe.webhooks.constructEvent(
                payload,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test'
            );
        } catch (err: any) {
            throw new AppError(`Webhook Error: ${err.message}`, 400);
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            const orderId = session.metadata?.orderId;
            if (orderId) {
                await orderRepository.updateOrderStatus(parseInt(orderId), 'paid');
                console.log(`Payment successful for Order #${orderId}`);
            }
        }

        return { received: true };
    }

    async refundPayment(paymentId: string, amount: number, gateway: "stripe" | "razorpay" = "stripe") {
        if (gateway === "stripe") {
            // Amount in cents
            const unitAmount = Math.round(amount * 100);
            return await this.retryOperation(async () => {
                return await stripe.refunds.create({
                    payment_intent: paymentId,
                    amount: unitAmount,
                });
            });
        }
        // Placeholder for Razorpay
        console.warn("Razorpay refund not implemented yet");
        return { status: "mock_refunded", id: "mock_refund_id" };
    }
}

export const paymentService = new PaymentService();
