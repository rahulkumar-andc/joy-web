/**
 * Refund State Machine Service
 * 
 * Manages refund lifecycle with:
 * - Strict state transitions
 * - Gateway integration tracking
 * - Audit logging
 */

import { db } from "../../db";
import { refunds } from "@shared/schema";
import { refundTracking } from "@shared/payment-schema";
import { eq } from "drizzle-orm";
import { logger } from "../../logger";

export enum RefundState {
    INITIATED = "INITIATED",      // Request created in DB
    PENDING = "PENDING",          // Sent to Gateway, awaiting processing
    PROCESSING = "PROCESSING",    // Gateway is processing (rare for simple refunds, but possible)
    SUCCESS = "SUCCESS",          // Refund confirmed by Gateway
    FAILED = "FAILED",            // Refund failed at Gateway
    CANCELLED = "CANCELLED"       // Request cancelled before processing
}

const VALID_TRANSITIONS: Record<RefundState, RefundState[]> = {
    [RefundState.INITIATED]: [RefundState.PENDING, RefundState.CANCELLED, RefundState.FAILED],
    [RefundState.PENDING]: [RefundState.SUCCESS, RefundState.FAILED, RefundState.PROCESSING],
    [RefundState.PROCESSING]: [RefundState.SUCCESS, RefundState.FAILED],
    [RefundState.SUCCESS]: [], // Terminal
    [RefundState.FAILED]: [RefundState.PENDING], // Can retry
    [RefundState.CANCELLED]: [] // Terminal
};

export interface RefundTransitionParams {
    refundId: number;
    toState: RefundState;
    triggeredBy: string;
    gatewayRefundId?: string;
    metadata?: any;
    reason?: string;
}

export class RefundStateMachine {

    static isValidTransition(from: RefundState, to: RefundState): boolean {
        return VALID_TRANSITIONS[from]?.includes(to) ?? false;
    }

    static async transition(params: RefundTransitionParams) {
        const { refundId, toState, triggeredBy, gatewayRefundId, metadata, reason } = params;

        await db.transaction(async (tx) => {
            // 1. Fetch current refund
            // Note: 'refunds' table in shared/schema might not have 'refundState' column yet 
            // if we didn't add it in previous migration? 
            // Let's check schema.ts. 
            // The `refundTracking` table DEFINITELY has `refund_state`.
            // The main `refunds` table has `status` (text).
            // We should sync them.

            const [refund] = await tx
                .select()
                .from(refunds)
                .where(eq(refunds.id, refundId));

            if (!refund) throw new Error(`Refund ${refundId} not found`);

            // We use the `refundTracking` table as the source of truth for the *detailed* state,
            // while `refunds.status` is the high-level status for UI.

            // Let's check or create tracking record
            let [tracking] = await tx
                .select()
                .from(refundTracking)
                .where(eq(refundTracking.refundId, refundId));

            const currentState = (tracking?.refundState as RefundState) || RefundState.INITIATED;

            // Validate
            // If no tracking record exists, we assume we are starting from INITIATED
            if (tracking && !this.isValidTransition(currentState, toState)) {
                // Allow self-transition for idempotency/updates
                if (currentState !== toState) {
                    throw new Error(`Invalid refund transition: ${currentState} -> ${toState}`);
                }
            }

            // Update or Insert Tracking
            if (tracking) {
                await tx.update(refundTracking).set({
                    refundState: toState,
                    gatewayRefundId: gatewayRefundId || tracking.gatewayRefundId,
                    updatedAt: new Date(),
                    errorMessage: reason || null
                }).where(eq(refundTracking.refundId, refundId));
            } else {
                await tx.insert(refundTracking).values({
                    refundId,
                    refundState: toState,
                    gatewayRefundId,
                    gateway: "razorpay", // default or pass in params
                    updatedAt: new Date()
                });
            }

            // Sync to main refunds table status
            let mainStatus = "pending";
            if (toState === RefundState.SUCCESS) mainStatus = "completed";
            else if (toState === RefundState.FAILED) mainStatus = "failed";
            else if (toState === RefundState.CANCELLED) mainStatus = "rejected"; // Map to existing enum if needed

            // Update main table
            if (refund.status !== mainStatus) {
                await tx.update(refunds).set({ status: mainStatus as any }).where(eq(refunds.id, refundId));
            }

            logger.info(`Refund ${refundId} transitioned to ${toState} by ${triggeredBy}`);
        });
    }
}
