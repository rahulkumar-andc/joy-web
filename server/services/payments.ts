import Razorpay from "razorpay";
import crypto from "crypto";
import { logger } from "../logger";

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

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
}

export interface VerifyPaymentParams {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}

/**
 * Create a Razorpay order for payment
 * @param params Order parameters
 * @returns Razorpay order object
 */
export async function createRazorpayOrder(
    params: CreateOrderParams
): Promise<RazorpayOrderResponse> {
    const { amount, currency = "INR", receipt, notes } = params;

    // Convert rupees to paise (Razorpay uses smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    if (amountInPaise < 100) {
        throw new Error("Minimum order amount is ₹1");
    }

    try {
        const razorpayOrder = await razorpay.orders.create({
            amount: amountInPaise,
            currency,
            receipt: receipt || `order_${Date.now()}`,
            notes: notes || {},
        });

        logger.info(`Razorpay order created: ${razorpayOrder.id} for amount ₹${amount}`);

        // We defer DB creation to the controller usually, or typically service returns the object 
        // and Controller saves it.
        // But to ensure 'INITIATED' state is tracked, we should ideally handle it where DB record is created.
        // Current flow: Controller calls createRazorpayOrder -> gets ID -> Controller saves DB record.
        // So we just return the object here. The Controller needs to use the StateMachine.

        return razorpayOrder as RazorpayOrderResponse;
    } catch (error: any) {
        logger.error(`Failed to create Razorpay order: ${error.message}`);
        throw new Error("Failed to create payment order");
    }
}

/**
 * Verify Razorpay payment signature using HMAC SHA256
 * This is critical for security - prevents payment tampering
 * @param params Payment verification parameters
 * @returns boolean indicating if signature is valid
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
 * @param body Raw request body as string
 * @param signature X-Razorpay-Signature header value
 * @returns boolean indicating if webhook is authentic
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
 * Fetch payment details from Razorpay
 * @param paymentId Razorpay payment ID
 * @returns Payment details
 */
export async function fetchPayment(paymentId: string): Promise<any> {
    try {
        const payment = await razorpay.payments.fetch(paymentId);
        return payment;
    } catch (error: any) {
        logger.error(`Failed to fetch payment details: ${error.message}`);
        throw new Error("Failed to verify payment details");
    }
}

export const paymentService = {
    createRazorpayOrder,
    verifyPaymentSignature,
    verifyWebhookSignature,
    getRazorpayKeyId,
    fetchPayment,
};
