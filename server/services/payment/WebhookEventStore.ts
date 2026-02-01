/**
 * Webhook Event Store Service
 * 
 * Handles storage, deduplication, and status tracking of webhook events.
 * Acts as the "Source of Truth" for all gateway events.
 */

import { db } from "../../db";
import { webhookEvents } from "@shared/payment-schema";
import { eq, and, or, desc } from "drizzle-orm";
import { logger } from "../../logger";

export type WebhookStatus = "RECEIVED" | "PROCESSING" | "PROCESSED" | "FAILED" | "DUPLICATE";

export class WebhookEventStore {
    /**
     * Check if an event has already been received/processed
     */
    static async findByEventId(eventId: string, gateway: "razorpay" | "stripe") {
        const [event] = await db
            .select()
            .from(webhookEvents)
            .where(and(
                eq(webhookEvents.eventId, eventId),
                eq(webhookEvents.gateway, gateway) // Same ID might exist across gateways (unlikely but safe)
            ));
        return event;
    }

    /**
     * Store a new webhook event
     * Returns true if stored, false if duplicate
     */
    static async storeEvent(params: {
        eventId: string;
        eventType: string;
        gateway: "razorpay" | "stripe";
        payload: any;
        signature: string;
    }): Promise<boolean> {
        const { eventId, eventType, gateway, payload, signature } = params;

        // Check for existing
        const existing = await this.findByEventId(eventId, gateway);

        if (existing) {
            if (existing.status === "PROCESSED" || existing.status === "PROCESSING") {
                logger.info(`Duplicate webhook event ignored: ${eventId} (${gateway})`);
                return false;
            }
            // If FAILED, we might want to allow re-processing depending on logic, 
            // but for now, we assume "storeEvent" means "new ingestion".
            // We will handle retries separately.
            return false;
        }

        await db.insert(webhookEvents).values({
            eventId,
            eventType,
            gateway,
            payload,
            signature,
            status: "RECEIVED",
        });

        logger.debug(`Webhook event stored: ${eventId} (${gateway})`);
        return true;
    }

    /**
     * Update the status of a webhook event
     */
    static async updateStatus(eventId: string, status: WebhookStatus, errorMessage?: string) {
        await db
            .update(webhookEvents)
            .set({
                status,
                errorMessage: errorMessage || null,
                processedAt: status === "PROCESSED" ? new Date() : undefined,
            })
            .where(eq(webhookEvents.eventId, eventId));
    }

    /**
     * Increment retry count
     */
    static async incrementRetryCount(eventId: string) {
        // using raw sql or fetching first is needed for increment usually in drizzle if not using specific helper
        // For simplicity, fetch and update
        const [event] = await db
            .select({ retryCount: webhookEvents.retryCount })
            .from(webhookEvents)
            .where(eq(webhookEvents.eventId, eventId));

        if (event) {
            await db
                .update(webhookEvents)
                .set({ retryCount: event.retryCount + 1 })
                .where(eq(webhookEvents.eventId, eventId));
        }
    }


    /**
     * DLQ: Fetch events that have failed max times or explicitly marked as failed
     */
    static async getDeadLetterEvents(limit: number = 50, offset: number = 0) {
        return await db
            .select()
            .from(webhookEvents)
            .where(or(
                eq(webhookEvents.status, "FAILED"),
                eq(webhookEvents.status, "DUPLICATE") // Optional: inspect duplicates?
            ))
            .orderBy(and(eq(webhookEvents.status, "FAILED"), eq(webhookEvents.retryCount, 5)) as any) // Prioritize max retries
            .limit(limit)
            .offset(offset);
    }

    /**
     * Get single event by ID (internal ID)
     */
    static async getEventById(id: number) {
        const [event] = await db
            .select()
            .from(webhookEvents)
            .where(eq(webhookEvents.id, id));
        return event;
    }

    /**
     * DLQ: Reset an event to allow re-processing
     */
    static async resetEventForReplay(id: number) {
        await db
            .update(webhookEvents)
            .set({
                status: "RECEIVED",
                retryCount: 0,
                errorMessage: null,
                processedAt: null
            })
            .where(eq(webhookEvents.id, id));

        return await this.getEventById(id);
    }
}
