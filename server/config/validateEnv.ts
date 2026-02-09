import { logger } from "../logger";

/**
 * Environment Variable Validation
 * Checks all required environment variables on startup
 * Fails fast with clear error messages if critical vars are missing
 */

interface EnvVariable {
    key: string;
    required: boolean;
    description: string;
    validate?: (value: string) => boolean;
}

const ENV_VARIABLES: EnvVariable[] = [
    // Database
    {
        key: "DATABASE_URL",
        required: true,
        description: "PostgreSQL connection string",
        validate: (val) => val.startsWith("postgres://") || val.startsWith("postgresql://"),
    },

    // Redis (Upstash)
    {
        key: "UPSTASH_REDIS_REST_URL",
        required: true,
        description: "Upstash Redis REST URL",
        validate: (val) => val.startsWith("https://"),
    },
    {
        key: "UPSTASH_REDIS_REST_TOKEN",
        required: true,
        description: "Upstash Redis REST token",
    },

    // Payment Gateway
    {
        key: "RAZORPAY_KEY_ID",
        required: false,
        description: "Razorpay API Key ID",
    },
    {
        key: "RAZORPAY_KEY_SECRET",
        required: false,
        description: "Razorpay API Key Secret",
    },

    // Search
    {
        key: "MEILISEARCH_HOST",
        required: false,
        description: "MeiliSearch host URL (defaults to http://localhost:7700)",
    },
    {
        key: "MEILISEARCH_API_KEY",
        required: false,
        description: "MeiliSearch API key (optional for dev)",
    },

    // Email
    {
        key: "RESEND_API_KEY",
        required: true,
        description: "Resend API key for transactional emails",
    },

    // Storage (ImageKit)
    {
        key: "IMAGEKIT_PUBLIC_KEY",
        required: true,
        description: "ImageKit public key",
    },
    {
        key: "IMAGEKIT_PRIVATE_KEY",
        required: true,
        description: "ImageKit private key",
    },
    {
        key: "IMAGEKIT_URL_ENDPOINT",
        required: true,
        description: "ImageKit URL endpoint",
        validate: (val) => val.startsWith("https://"),
    },

    // Session
    {
        key: "SESSION_SECRET",
        required: true,
        description: "Session encryption secret (should be random and secure)",
        validate: (val) => val.length >= 32,
    },

    // URLs
    {
        key: "FRONTEND_URL",
        required: false,
        description: "Frontend application URL (defaults to http://localhost:5173)",
    },
    {
        key: "BACKEND_URL",
        required: false,
        description: "Backend API URL (defaults to http://localhost:5001)",
    },

    // SMS (Optional)
    {
        key: "TWILIO_ACCOUNT_SID",
        required: false,
        description: "Twilio Account SID for SMS notifications",
    },
    {
        key: "TWILIO_AUTH_TOKEN",
        required: false,
        description: "Twilio Auth Token",
    },
    {
        key: "TWILIO_PHONE_NUMBER",
        required: false,
        description: "Twilio phone number",
    },

    // Web Push
    {
        key: "VAPID_PUBLIC_KEY",
        required: false,
        description: "VAPID public key for web push notifications",
    },
    {
        key: "VAPID_PRIVATE_KEY",
        required: false,
        description: "VAPID private key for web push notifications",
    },
];

export function validateEnvironment(): void {
    logger.info("🔍 Validating environment variables...");

    const errors: string[] = [];
    const warnings: string[] = [];

    for (const envVar of ENV_VARIABLES) {
        const value = process.env[envVar.key];

        // Check if required variable is missing
        if (envVar.required && !value) {
            errors.push(
                `❌ Missing required environment variable: ${envVar.key}\n   Description: ${envVar.description}`
            );
            continue;
        }

        // Warn if optional variable is missing
        if (!envVar.required && !value) {
            warnings.push(
                `⚠️  Optional environment variable not set: ${envVar.key}\n   Description: ${envVar.description}`
            );
            continue;
        }

        // Validate value format if validator exists
        if (value && envVar.validate && !envVar.validate(value)) {
            errors.push(
                `❌ Invalid format for environment variable: ${envVar.key}\n   Description: ${envVar.description}\n   Current value: ${value.substring(0, 20)}...`
            );
        }
    }

    // Print warnings
    if (warnings.length > 0) {
        logger.warn("\n⚠️  Environment Warnings:");
        warnings.forEach((warning) => logger.warn(warning));
    }

    // If any errors, fail fast
    if (errors.length > 0) {
        logger.error("\n❌ Environment Validation Failed:");
        errors.forEach((error) => logger.error(error));
        logger.error("\n💡 Please check your .env file and ensure all required variables are set.");
        logger.error("💡 See .env.example for reference.\n");
        process.exit(1);
    }

    logger.info(`✅ Environment validation passed (${ENV_VARIABLES.filter(v => v.required).length} required, ${warnings.length} warnings)`);
}

/**
 * Get environment variable with default value
 */
export function getEnv(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (!value && !defaultValue) {
        throw new Error(`Environment variable ${key} is not set and no default provided`);
    }
    return value || defaultValue!;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
    return process.env.NODE_ENV === "production";
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
    return process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
}
