import { Router } from "express";
import { paymentService } from "../services/paymentService";
import { catchAsync } from "../utils/catchAsync";
import express from "express";

export const paymentRouter = Router();

import { IdempotencyService } from "../services/payment/IdempotencyService";

paymentRouter.post("/api/payments/create-session",
    IdempotencyService.middleware(), // Add idempotency support
    catchAsync(async (req, res) => {
        const { orderId, amount } = req.body;
        const session = await paymentService.createCheckoutSession(orderId, amount);

        // Store response for idempotency
        await IdempotencyService.afterResponse(req, res, { id: session.id, url: session.url });

        res.json({ id: session.id, url: session.url });
    })
);

// Webhook needs raw body for signature verification
// Webhook needs raw body for signature verification
import { webhookLimiter } from "../middleware/rate-limit";
paymentRouter.post("/api/payments/webhook", webhookLimiter, express.raw({ type: 'application/json' }), catchAsync(async (req, res) => {
    const signature = req.headers['x-razorpay-signature'] as string;

    // Use new WebhookHandler
    const { WebhookHandler } = await import("../services/payment/WebhookHandler");
    await WebhookHandler.handleRazorpayWebhook(signature, JSON.parse(req.body.toString()));

    res.json({ received: true });
}));
