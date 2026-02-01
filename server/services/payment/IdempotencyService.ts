/**
 * Idempotency Service
 * 
 * Prevents duplicate requests by:
 * - Storing request fingerprints
 * - Caching responses for 24 hours
 * - Returning cached response for duplicates
 */

import { db } from "../../db";
import { idempotencyKeys } from "@shared/payment-schema";
import { eq, lt } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../../logger";

const IDEMPOTENCY_TTL_HOURS = 24;

export interface IdempotencyRequest {
    key: string;
    userId?: number;
    endpoint: string;
    requestBody: any;
}

export interface IdempotencyResponse {
    isNew: boolean; // false if this is a duplicate request
    cachedResponse?: any;
    cachedStatusCode?: number;
}

export class IdempotencyService {
    /**
     * Generate a hash of the request body
     */
    private static hashRequest(requestBody: any): string {
        const normalized = JSON.stringify(requestBody, Object.keys(requestBody).sort());
        return crypto.createHash("sha256").update(normalized).digest("hex");
    }

    /**
     * Check if a request is duplicate, and return cached response if it is
     * 
     * @returns isNew=true if this is a new request, false if duplicate
     */
    static async checkRequest(request: IdempotencyRequest): Promise<IdempotencyResponse> {
        const { key, userId, endpoint, requestBody } = request;
        const requestHash = this.hashRequest(requestBody);

        // Check if this idempotency key exists
        const [existing] = await db
            .select()
            .from(idempotencyKeys)
            .where(eq(idempotencyKeys.key, key));

        if (!existing) {
            // New request - store the idempotency key
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + IDEMPOTENCY_TTL_HOURS);

            await db.insert(idempotencyKeys).values({
                key,
                userId: userId || null,
                endpoint,
                requestHash,
                expiresAt,
                response: null,
                statusCode: null,
            });

            logger.debug(`New idempotency key created: ${key}`);
            return { isNew: true };
        }

        // Check if the existing key has expired
        if (existing.expiresAt && new Date(existing.expiresAt) < new Date()) {
            // Expired - treat as new request, update the record
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + IDEMPOTENCY_TTL_HOURS);

            await db
                .update(idempotencyKeys)
                .set({
                    userId: userId || null,
                    endpoint,
                    requestHash,
                    expiresAt,
                    response: null,
                    statusCode: null,
                })
                .where(eq(idempotencyKeys.key, key));

            logger.debug(`Expired idempotency key reset: ${key}`);
            return { isNew: true };
        }

        // Check if request body matches (prevent key reuse with different data)
        if (existing.requestHash !== requestHash) {
            throw new Error(
                `Idempotency key ${key} was already used with different request data. Key reuse is not allowed.`
            );
        }

        // Duplicate request
        if (existing.response && existing.statusCode) {
            logger.info(`Duplicate request detected, returning cached response for key: ${key}`);
            return {
                isNew: false,
                cachedResponse: existing.response,
                cachedStatusCode: existing.statusCode,
            };
        }

        // Request is being processed (no response yet)
        logger.warn(`Idempotency key ${key} is being processed, but no cached response found yet`);
        return {
            isNew: false, // Not new, but also no cached response
        };
    }

    /**
     * Store the response for an idempotency key
     */
    static async storeResponse(key: string, response: any, statusCode: number): Promise<void> {
        await db
            .update(idempotencyKeys)
            .set({
                response,
                statusCode,
            })
            .where(eq(idempotencyKeys.key, key));

        logger.debug(`Stored response for idempotency key: ${key}`);
    }

    /**
     * Clean up expired idempotency keys (run as cron job)
     */
    static async cleanupExpired(): Promise<number> {
        const now = new Date();
        const result = await db
            .delete(idempotencyKeys)
            .where(lt(idempotencyKeys.expiresAt, now));

        const deletedCount = result.rowCount || 0;
        logger.info(`Cleaned up ${deletedCount} expired idempotency keys`);
        return deletedCount;
    }

    /**
     * Generate a new idempotency key
     * Format: <prefix>_<timestamp>_<random>
     */
    static generateKey(prefix: string = "idem"): string {
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString("hex");
        return `${prefix}_${timestamp}_${random}`;
    }

    /**
     * Middleware factory for Express routes
     * 
     * Usage:
     * router.post('/api/payments/create', IdempotencyService.middleware(), handler);
     */
    static middleware() {
        return async (req: any, res: any, next: any) => {
            const idempotencyKey = req.headers["idempotency-key"] as string;

            if (!idempotencyKey) {
                // No idempotency key provided, proceed normally
                return next();
            }

            try {
                const result = await this.checkRequest({
                    key: idempotencyKey,
                    userId: req.user?.id,
                    endpoint: req.path,
                    requestBody: req.body,
                });

                if (!result.isNew && result.cachedResponse) {
                    // Return cached response
                    logger.info(`[Idempotency] Returning cached response for key: ${idempotencyKey}`);
                    return res.status(result.cachedStatusCode || 200).json(result.cachedResponse);
                }

                // Store the idempotency key in the request for later use
                req.idempotencyKey = idempotencyKey;
                req.isIdempotentRequest = !result.isNew;

                next();
            } catch (error: any) {
                logger.error(`[Idempotency] Error: ${error.message}`);
                return res.status(422).json({ error: error.message });
            }
        };
    }

    /**
     * Response interceptor - stores the response for idempotent requests
     * 
     * Usage: Should be called after sending the response
     */
    static async afterResponse(req: any, res: any, responseBody: any): Promise<void> {
        if (req.idempotencyKey && !req.isIdempotentRequest) {
            try {
                await this.storeResponse(req.idempotencyKey, responseBody, res.statusCode);
            } catch (error: any) {
                logger.error(`[Idempotency] Failed to store response: ${error.message}`);
            }
        }
    }
}
