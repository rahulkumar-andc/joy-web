import Stripe from 'stripe';
import { orderRepository } from "../repositories/orderRepository";
import { AppError } from "../utils/AppError";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key', {
    apiVersion: '2026-01-28.clover' as any, // Cast to any if needed, or matches strict type
});

export class PaymentService {
    async createCheckoutSession(orderId: number, amount: string, currency: string = 'inr') {
        const order = await orderRepository.getById(orderId);
        if (!order) throw new AppError("Order not found", 404);

        // Convert string amount to smallest currency unit (e.g., cents/paise)
        // Assuming amount is string like "100.00"
        const unitAmount = Math.round(parseFloat(amount) * 100);

        // Create line item (simplified for now as one total, but could list all items)
        const session = await stripe.checkout.sessions.create({
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

        return session;
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
}

export const paymentService = new PaymentService();
