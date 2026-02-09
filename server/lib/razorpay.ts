import Razorpay from "razorpay";
import { logger } from "../logger";

// Define a safe interface for the Razorpay instance
// This allows us to return a mock or a real instance
export let razorpay: any;

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

if (key_id && key_secret) {
    try {
        razorpay = new Razorpay({
            key_id,
            key_secret,
        });
        logger.info("✅ Razorpay initialized successfully");
    } catch (error: any) {
        logger.error(`Failed to initialize Razorpay: ${error.message}`);
        razorpay = createMockRazorpay();
    }
} else {
    logger.warn("⚠️ Razorpay keys missing. initializing mock instance. Payments will fail.");
    razorpay = createMockRazorpay();
}

/**
 * Create a mock Razorpay instance that logs warnings when methods are called
 */
function createMockRazorpay() {
    const handler = {
        get: function (target: any, prop: string) {
            // Return a function that logs a warning and throws
            return async (...args: any[]) => {
                const msg = `Razorpay method '${prop}' called but keys are missing.`;
                logger.warn(msg);
                throw new Error(msg);
            };
        }
    };

    // We need to support nested properties like razorpay.orders.create
    const mockObj: any = {};

    // Common resources used in the app
    const resources = ["orders", "payments", "refunds", "customers", "subscriptions", "invoices"];

    resources.forEach(resource => {
        mockObj[resource] = new Proxy({}, handler);
    });

    return mockObj;
}
