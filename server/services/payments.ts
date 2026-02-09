import Razorpay from "razorpay";
import crypto from "crypto";
import { logger } from "../logger";
import { createCircuitBreaker, CIRCUIT_OPTIONS } from "../config/circuit-breakers";
import CircuitBreaker from "opossum";

import { razorpay } from "../lib/razorpay";

export interface CreateOrderParams {
    amount: number; // Amount in rupees (will be converted to paise)
    currency?: string;
    receipt?: string;
    notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    status: string;
    created_at: number;
    _fallback?: boolean; // Indicates fallback was used
}

export interface VerifyPaymentParams {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}

/**
 * Raw Razorpay order creation (without circuit breaker)
 */
async function createRazorpayOrderRaw(
    params: CreateOrderParams
): Promise<RazorpayOrderResponse> {
    const { amount, currency = "INR", receipt, notes } = params;

    // Convert rupees to paise (Razorpay uses smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    if (amountInPaise < 100) {
        throw new Error("Minimum order amount is ₹1");
    }

    const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency,
        receipt: receipt || `order_${Date.now()}`,
        notes: notes || {},
    });

    logger.info(`Razorpay order created: ${razorpayOrder.id} for amount ₹${amount}`);

    return razorpayOrder as RazorpayOrderResponse;
}

/**
 * Circuit breaker wrapped Razorpay order creation
 */
const createOrderBreaker = createCircuitBreaker(
    createRazorpayOrderRaw,
    CIRCUIT_OPTIONS.PAYMENT,
    async (params: CreateOrderParams) => {
        // Fallback: Return pending order (queue for later processing)
        logger.error('Razorpay circuit open - creating fallback order', {
            amount: params.amount,
            receipt: params.receipt,
        });

        // TODO: Queue order for retry via Bull
        // await paymentQueue.add('createOrder', params, { attempts: 3 });

        return {
            id: `fallback_${Date.now()}`,
            entity: 'order',
            amount: Math.round(params.amount * 100),
            amount_paid: 0,
            amount_due: Math.round(params.amount * 100),
            currency: params.currency || 'INR',
            receipt: params.receipt || `fallback_${Date.now()}`,
            status: 'pending',
            created_at: Date.now(),
            _fallback: true,
        };
    }
);

/**
 * Create a Razorpay order for payment (with circuit breaker)
 */
export async function createRazorpayOrder(
    params: CreateOrderParams
): Promise<RazorpayOrderResponse> {
    return await createOrderBreaker.fire(params);
}

/**
 * Verify Razorpay payment signature using HMAC SHA256
 * This is critical for security - prevents payment tampering
 * (No circuit breaker needed - this is a local computation)
 */
export function verifyPaymentSignature(params: VerifyPaymentParams): boolean {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
        logger.error("RAZORPAY_KEY_SECRET not configured");
        throw new Error("Payment verification not configured");
    }

    // Signature verification as per Razorpay docs:
    // generated_signature = hmac_sha256(order_id + "|" + payment_id, key_secret)
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(body)
        .digest("hex");

    const isValid = expectedSignature === razorpaySignature;

    if (!isValid) {
        logger.warn(`Payment signature verification failed for order: ${razorpayOrderId}`);
    } else {
        logger.info(`Payment verified successfully for order: ${razorpayOrderId}`);
    }

    return isValid;
}

/**
 * Verify webhook signature from Razorpay
 * (No circuit breaker needed - this is a local computation)
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
        logger.error("RAZORPAY_WEBHOOK_SECRET not configured");
        return false;
    }

    const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");


    return expectedSignature === signature;
}

/**
 * Get Razorpay public key for frontend
 */
export function getRazorpayKeyId(): string {
    return process.env.RAZORPAY_KEY_ID || "";
}

/**
 * Raw fetch payment (without circuit breaker)
 */
async function fetchPaymentRaw(paymentId: string): Promise<any> {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
}

/**
 * Circuit breaker wrapped fetch payment
 */
const fetchPaymentBreaker = createCircuitBreaker(
    fetchPaymentRaw,
    CIRCUIT_OPTIONS.PAYMENT,
    async (paymentId: string) => {
        logger.error('Razorpay circuit open - cannot fetch payment details', { paymentId });
        throw new Error('Payment service temporarily unavailable');
    }
);

/**
 * Fetch payment details from Razorpay (with circuit breaker)
 */
export async function fetchPayment(paymentId: string): Promise<any> {
    return await fetchPaymentBreaker.fire(paymentId);
}

export const paymentService = {
    createRazorpayOrder,
    verifyPaymentSignature,
    verifyWebhookSignature,
    getRazorpayKeyId,
    fetchPayment,
    // Expose breakers for monitoring
    breakers: {
        createOrder: createOrderBreaker as CircuitBreaker<[CreateOrderParams], RazorpayOrderResponse>,
        fetchPayment: fetchPaymentBreaker as CircuitBreaker<[string], any>,
    },
};
