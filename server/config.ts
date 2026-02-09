import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

// Base schema with environment-specific validation
const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.string().default("5000"),

    // Database - Required in all environments
    DATABASE_URL: z.string({
        required_error: "DATABASE_URL is required. Please set it in your .env file."
    }),

    // Session Secret - Required in production, has default in dev
    SESSION_SECRET: isProduction
        ? z.string().min(32, "SESSION_SECRET must be at least 32 characters in production. Generate with: openssl rand -base64 32")
        : z.string().default("dev-secret-change-in-production"),

    // Razorpay - Optional
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

    // Stripe - Optional
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),

    // Base URL for callbacks
    BASE_URL: z.string().default("http://localhost:5173"),

    // Redis (Upstash)
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

// Parse and validate
let config: z.infer<typeof envSchema>;

try {
    config = envSchema.parse(process.env);
} catch (error) {
    if (error instanceof z.ZodError) {
        console.error("\n❌ Environment variable validation failed:\n");
        error.errors.forEach(err => {
            console.error(`  • ${err.path.join(".")}: ${err.message}`);
        });
        console.error("\nPlease check your .env file and ensure all required variables are set.");
        console.error("See .env.example for reference.\n");
        process.exit(1);
    }
    throw error;
}

// Warning: Check for test keys in production (non-blocking)
if (isProduction && config.RAZORPAY_KEY_ID?.startsWith("rzp_test_")) {
    console.warn("\n⚠️ WARNING: Using Razorpay TEST keys in PRODUCTION environment!");
    console.warn("   This will prevent real payments from being processed.");
    console.warn("   Please update RAZORPAY_KEY_ID to use 'rzp_live_' keys when ready.");
    console.warn("   Get production keys from: https://dashboard.razorpay.com/app/keys\n");
    // NOTE: Server will continue to start with test keys (non-blocking)
}

export { config };
