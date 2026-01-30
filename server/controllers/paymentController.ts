import { Request, Response } from "express";
import { paymentRepository } from "../repositories/paymentRepository";
import { orderRepository } from "../repositories/orderRepository";
import { logger } from "../logger";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";

export class PaymentController {

    static createOrder = catchAsync(async (req: Request, res: Response) => {
        const { orderId } = req.body;

        if (!orderId) throw new AppError("Order ID is required", 400);

        const order = await orderRepository.getById(orderId);
        if (!order) throw new AppError("Order not found", 404);

        // Security Check 1: IDOR Protection
        // Ensure the logged-in user owns the order
        if (order.userId !== (req.user as any).id) {
            // Log this security event
            logger.warn(`IDOR Warning: User ${(req.user as any).id} tried to pay for Order ${order.id} owned by User ${order.userId}`);
            throw new AppError("You do not have permission to pay for this order", 403);
        }

        // Security Check 2: Logic/State Validation
        if (order.paymentStatus === 'paid') {
            return res.json({ message: "Order is already paid" });
        }

        // Logic Check 3: Idempotency / Double Spending
        // Check if a payment for this order already exists and is in 'created' state
        const existingPayment = await paymentRepository.findByOrderId(order.id);

        if (existingPayment) {
            if (existingPayment.status === 'paid') {
                return res.json({ message: "Order is already paid" });
            }
            if (existingPayment.status === 'created') {
                // Reuse existing Razorpay order if pending
                return res.status(200).json({
                    orderId: order.id,
                    razorpayOrderId: existingPayment.razorpayOrderId,
                    amount: Number(existingPayment.amount) * 100, // already stored in db, usually in rupees, convert to paise for frontend
                    currency: existingPayment.currency,
                    key: await import("../services/payments").then(m => m.paymentService.getRazorpayKeyId())
                });
            }
        }

        // Create new Razorpay order if no valid pending one found
        try {
            const razorpayOrder = await import("../services/payments").then(m =>
                m.paymentService.createRazorpayOrder({
                    amount: Number(order.totalAmount),
                    receipt: `order_${order.id}`,
                    notes: { orderId: order.id.toString(), userId: order.userId.toString() }
                })
            );

            // Save payment record
            await paymentRepository.create({
                orderId: order.id,
                razorpayOrderId: razorpayOrder.id,
                amount: order.totalAmount, // Store as string matching schema
                currency: razorpayOrder.currency,
                status: "created"
            });

            res.status(201).json({
                orderId: order.id,
                razorpayOrderId: razorpayOrder.id,
                amount: razorpayOrder.amount, // amount in paise
                currency: razorpayOrder.currency,
                key: await import("../services/payments").then(m => m.paymentService.getRazorpayKeyId())
            });
        } catch (err: any) {
            logger.error("Payment order creation failed: " + err.message);
            throw new AppError("Failed to create payment order", 500);
        }
    });

    static verifyPayment = catchAsync(async (req: Request, res: Response) => {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            throw new AppError("Missing payment details", 400);
        }

        // Replay Attack Protection & Idempotency
        // Check if this payment is already processed
        const existingPayment = await paymentRepository.findByRazorpayOrderId(razorpayOrderId);
        if (existingPayment && existingPayment.status === 'paid') {
            return res.json({ message: "Payment already processed" });
        }

        const isValid = await import("../services/payments").then(m =>
            m.paymentService.verifyPaymentSignature({
                razorpayOrderId,
                razorpayPaymentId,
                razorpaySignature
            })
        );

        if (!isValid) {
            await paymentRepository.updateStatus(razorpayOrderId, "failed", razorpayPaymentId, razorpaySignature);
            throw new AppError("Invalid payment signature", 400);
        }

        // Enhanced Security: Fetch payment details from Razorpay to verify amount and status
        // This prevents amount tampering where a user might pay a lesser amount
        try {
            // We need to know the expected amount. We can get it from the pending payment record.
            // If existingPayment is null (unlikely if flow is followed, but possible), we should double check.
            // If we didn't fetch it above, we fetch it now.
            let paymentRecord = existingPayment;
            if (!paymentRecord) {
                paymentRecord = await paymentRepository.findByRazorpayOrderId(razorpayOrderId);
            }

            if (!paymentRecord) {
                throw new AppError("Payment initialization record not found", 404);
            }

            const razorpayPayment = await import("../services/payments").then(m =>
                m.paymentService.fetchPayment(razorpayPaymentId)
            );

            // Verify Amount (Razorpay amount is in paise)
            const expectedAmountInPaise = Math.round(Number(paymentRecord.amount) * 100);
            if (razorpayPayment.amount !== expectedAmountInPaise) {
                logger.error(`Payment amount mismatch. Expected: ${expectedAmountInPaise}, Got: ${razorpayPayment.amount}`);
                await paymentRepository.updateStatus(razorpayOrderId, "failed", razorpayPaymentId, razorpaySignature, razorpayPayment.method);
                throw new AppError("Payment amount mismatch", 400);
            }

            // Verify Status
            if (razorpayPayment.status !== "captured" && razorpayPayment.status !== "authorized") {
                logger.error(`Invalid payment status: ${razorpayPayment.status}`);
                await paymentRepository.updateStatus(razorpayOrderId, "failed", razorpayPaymentId, razorpaySignature, razorpayPayment.method);
                throw new AppError("Payment not captured", 400);
            }

            // Check currency
            if (razorpayPayment.currency !== (paymentRecord.currency || "INR")) {
                throw new AppError("Invalid currency", 400);
            }

        } catch (err: any) {
            if (err instanceof AppError) throw err;
            logger.error("Payment verification failed during fetch: " + err.message);
            throw new AppError("Payment verification failed", 500);
        }

        // Update payment status
        const payment = await paymentRepository.updateStatus(
            razorpayOrderId,
            "paid",
            razorpayPaymentId,
            razorpaySignature,
            "razorpay"
        );

        if (payment) {
            await orderRepository.updateOrderStatus(payment.orderId, "paid");
        }

        res.json({ message: "Payment verified successfully" });
    });

    static handleWebhook = catchAsync(async (req: Request, res: Response) => {
        const signature = req.headers["x-razorpay-signature"] as string;

        // Validate signature
        const isValid = await import("../services/payments").then(m =>
            m.paymentService.verifyWebhookSignature(JSON.stringify(req.body), signature)
        );

        if (!isValid) {
            throw new AppError("Invalid webhook signature", 400);
        }

        const event = req.body;

        try {
            if (event.event === "payment.captured") {
                const { order_id, id: payment_id } = event.payload.payment.entity;

                // Find and update payment
                // We trust the webhook data because signature is verified
                const payment = await paymentRepository.updateStatus(
                    order_id,
                    "paid",
                    payment_id,
                    undefined, // Signature not needed for webhook update
                    "webhook"
                );

                if (payment) {
                    await orderRepository.updateOrderStatus(payment.orderId, "paid");
                }
            }
            res.json({ status: "ok" });
        } catch (err) {
            logger.error("Webhook processing failed");
            throw new AppError("Webhook processing failed", 500);
        }
    });
}
