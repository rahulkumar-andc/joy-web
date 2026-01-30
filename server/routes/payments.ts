import { Router } from "express";
import { paymentService } from "../services/paymentService";
import { catchAsync } from "../utils/catchAsync";
import express from "express";

export const paymentRouter = Router();

paymentRouter.post("/api/payments/create-session", catchAsync(async (req, res) => {
    const { orderId, amount } = req.body;
    const session = await paymentService.createCheckoutSession(orderId, amount);
    res.json({ id: session.id, url: session.url });
}));

// Webhook needs raw body for signature verification
paymentRouter.post("/api/payments/webhook", express.raw({ type: 'application/json' }), catchAsync(async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    await paymentService.handleWebhook(sig, req.body);
    res.json({ received: true });
}));
