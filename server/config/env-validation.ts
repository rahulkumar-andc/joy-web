/**
 * Environment Variable Validation
 * 
 * This module validates all required environment variables on server startup.
 * It helps catch configuration issues early and provides clear error messages.
 */

import { logger } from "../logger";

// ============================================================================
// REQUIRED ENVIRONMENT VARIABLES
// ============================================================================

interface EnvVarConfig {
    name: string;
    required: boolean;
    description: string;
    defaultValue?: string;
    validator?: (value: string) => boolean;
    validatorMessage?: string;
}

const ENV_VARS: EnvVarConfig[] = [
    // Database
    {
        name: "DATABASE_URL",
        required: true,
        description: "PostgreSQL connection string",
        validator: (v) => v.startsWith("postgres://") || v.startsWith("postgresql://"),
        validatorMessage: "Must be a valid PostgreSQL connection string",
    },

    // Session & Security
    {
        name: "SESSION_SECRET",
        required: true,
        description: "Secret key for session encryption (min 32 chars)",
        validator: (v) => v.length >= 32,
        validatorMessage: "Must be at least 32 characters long",
    },

    // Payment - Razorpay
    {
        name: "RAZORPAY_KEY_ID",
        required: false,
        description: "Razorpay API Key ID",
        validator: (v) => {
            // Ignore placeholders or effectively empty strings
            if (!v || v === "null" || v === "undefined") return true;
            return v.startsWith("rzp_");
        },
        validatorMessage: "Must start with 'rzp_'",
    },
    {
        name: "RAZORPAY_KEY_SECRET",
        required: false,
        description: "Razorpay API Key Secret",
        validator: (v) => {
            if (!v || v === "null" || v === "undefined") return true;
            return v.length >= 10;
        },
        validatorMessage: "Must be a valid secret key",
    },
    {
        name: "RAZORPAY_WEBHOOK_SECRET",
        required: false,
        description: "Razorpay webhook secret for signature verification",
    },

    // Cache - Upstash Redis
    {
        name: "UPSTASH_REDIS_REST_URL",
        required: false,
        description: "Upstash Redis REST API URL",
        validator: (v) => v.startsWith("https://"),
        validatorMessage: "Must be a valid HTTPS URL",
    },
    {
        name: "UPSTASH_REDIS_REST_TOKEN",
        required: false,
        description: "Upstash Redis REST API token",
    },

    // Email
    {
        name: "SMTP_HOST",
        required: false,
        description: "SMTP server hostname",
    },
    {
        name: "SMTP_USER",
        required: false,
        description: "SMTP username",
    },
    {
        name: "SMTP_PASS",
        required: false,
        description: "SMTP password",
    },

    // Optional Services
    {
        name: "SENTRY_DSN",
        required: false,
        description: "Sentry error tracking DSN",
    },
    {
        name: "MEILISEARCH_HOST",
        required: false,
        description: "MeiliSearch server URL",
        defaultValue: "http://localhost:7700",
    },
    {
        name: "QUEUE_REDIS_URL",
        required: false,
        description: "Redis URL for BullMQ queues",
    },

    // Application
    {
        name: "NODE_ENV",
        required: false,
        description: "Node environment (development, production, test)",
        defaultValue: "development",
        validator: (v) => ["development", "production", "test"].includes(v),
        validatorMessage: "Must be 'development', 'production', or 'test'",
    },
    {
        name: "PORT",
        required: false,
        description: "Server port",
        defaultValue: "5000",
        validator: (v) => !isNaN(parseInt(v)) && parseInt(v) > 0 && parseInt(v) < 65536,
        validatorMessage: "Must be a valid port number (1-65535)",
    },
    {
        name: "BASE_URL",
        required: false,
        description: "Application base URL",
        defaultValue: "http://localhost:5000",
    },

    // ImageKit (Cloud Storage)
    {
        name: "IMAGEKIT_PUBLIC_KEY",
        required: false,
        description: "ImageKit public API key",
    },
    {
        name: "IMAGEKIT_PRIVATE_KEY",
        required: false,
        description: "ImageKit private API key",
    },
    {
        name: "IMAGEKIT_URL_ENDPOINT",
        required: false,
        description: "ImageKit URL endpoint",
        validator: (v) => v.startsWith("https://ik.imagekit.io/"),
        validatorMessage: "Must be a valid ImageKit URL endpoint",
    },

    // Database Read Replica (Optional)
    {
        name: "READ_REPLICA_URL",
        required: false,
        description: "PostgreSQL read replica connection string",
        validator: (v) => v.startsWith("postgres://") || v.startsWith("postgresql://"),
        validatorMessage: "Must be a valid PostgreSQL connection string",
    },
];

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    missing: string[];
}

/**
 * Validate all environment variables
 */
export function validateEnv(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missing: string[] = [];

    for (const config of ENV_VARS) {
        const value = process.env[config.name];

        if (!value) {
            if (config.required) {
                errors.push(`Missing required env var: ${config.name} - ${config.description}`);
                missing.push(config.name);
            } else if (!config.defaultValue) {
                warnings.push(`Optional env var not set: ${config.name} - ${config.description}`);
            }
            continue;
        }

        // Run validator if present
        if (config.validator && !config.validator(value)) {
            errors.push(`Invalid ${config.name}: ${config.validatorMessage}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        missing,
    };
}

/**
 * Validate environment and exit if critical variables are missing
 */
export function validateEnvOrExit(): void {
    const result = validateEnv();

    // Log warnings
    if (result.warnings.length > 0 && process.env.NODE_ENV !== "test") {
        logger.warn("⚠️ Environment variable warnings:");
        result.warnings.forEach(w => logger.warn(`  - ${w}`));
    }

    // Exit on errors in production
    if (!result.valid) {
        logger.error("❌ Environment validation failed:");
        result.errors.forEach(e => logger.error(`  - ${e}`));

        if (process.env.NODE_ENV === "production") {
            logger.error("Exiting due to missing/invalid environment variables");
            process.exit(1);
        } else {
            logger.warn("⚠️ Running in development mode with missing variables");
        }
    } else if (process.env.NODE_ENV !== "test") {
        logger.info("✅ Environment validation passed");
    }
}

/**
 * Get a required environment variable or throw
 */
export function getRequiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

/**
 * Get an optional environment variable with default
 */
export function getEnv(name: string, defaultValue: string = ""): string {
    return process.env[name] || defaultValue;
}

/**
 * Get an environment variable as a number
 */
export function getEnvNumber(name: string, defaultValue: number): number {
    const value = process.env[name];
    if (!value) return defaultValue;
    const num = parseInt(value, 10);
    return isNaN(num) ? defaultValue : num;
}

/**
 * Get an environment variable as a boolean
 */
export function getEnvBoolean(name: string, defaultValue: boolean = false): boolean {
    const value = process.env[name];
    if (!value) return defaultValue;
    return value.toLowerCase() === "true" || value === "1";
}
