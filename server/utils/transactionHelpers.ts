/**
 * Transaction Helper Utilities
 * 
 * Provides helper functions for managing PostgreSQL transactions
 * with Drizzle ORM, including retry logic for deadlocks.
 */

import { db, pool } from "../db";
import { logger } from "../logger";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

export type TransactionCallback<T> = (tx: NodePgDatabase<typeof schema>) => Promise<T>;

/**
 * Execute a function within a database transaction
 * Automatically handles commit/rollback
 * 
 * @param callback - Function to execute within transaction
 * @param maxRetries - Max retries for deadlock errors (default: 3)
 * @returns Result from callback
 */
export async function withTransaction<T>(
    callback: TransactionCallback<T>,
    maxRetries: number = 3
): Promise<T> {
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            // Use Drizzle's transaction API
            const result = await db.transaction(async (tx) => {
                return await callback(tx);
            });

            logger.debug(`Transaction completed successfully`);
            return result;

        } catch (error: any) {
            attempt++;

            // Check if it's a serialization/deadlock error (PostgreSQL error code 40001 or 40P01)
            const isDeadlock = error.code === "40001" || error.code === "40P01";

            if (isDeadlock && attempt < maxRetries) {
                logger.warn(`Deadlock detected, retrying transaction (attempt ${attempt}/${maxRetries})`);
                // Exponential backoff: wait 100ms * 2^attempt
                await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
                continue;
            }

            // Not a deadlock or max retries exhausted - rethrow
            logger.error(`Transaction failed after ${attempt} attempts:`, error);
            throw error;
        }
    }

    throw new Error("Transaction failed: Max retries exhausted");
}

/**
 * Error types for better error handling
 */
export class TransactionError extends Error {
    constructor(
        message: string,
        public readonly cause?: unknown,
        public readonly isRetryable: boolean = false
    ) {
        super(message);
        this.name = "TransactionError";
    }
}

/**
 * Check if an error is retryable (deadlock/serialization)
 */
export function isRetryableError(error: any): boolean {
    return error.code === "40001" || error.code === "40P01";
}

/**
 * Categorize database errors
 */
export function categorizeError(error: any): {
    type: "deadlock" | "constraint" | "connection" | "unknown";
    message: string;
    isRetryable: boolean;
} {
    // Deadlock/Serialization errors
    if (error.code === "40001" || error.code === "40P01") {
        return {
            type: "deadlock",
            message: "Transaction deadlock - will retry",
            isRetryable: true
        };
    }

    // Constraint violations (unique, foreign key, etc.)
    if (error.code?.startsWith("23")) {
        return {
            type: "constraint",
            message: error.message || "Database constraint violation",
            isRetryable: false
        };
    }

    // Connection errors
    if (error.code === "08000" || error.code === "08003" || error.code === "08006") {
        return {
            type: "connection",
            message: "Database connection error",
            isRetryable: true
        };
    }

    return {
        type: "unknown",
        message: error.message || "Unknown database error",
        isRetryable: false
    };
}
