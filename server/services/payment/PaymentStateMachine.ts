/**
 * Payment State Machine Service
 * 
 * Manages payment state transitions with:
 * - Strict state validation
 * - Optimistic locking
 * - Audit trail
 * - Idempotent transitions
 */

import { db } from "../../db";
import { payments } from "@shared/schema";
import { paymentStateTransitions } from "@shared/payment-schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../../logger";

// Payment state definitions
export enum PaymentState {
    CREATED = "CREATED",          // Payment record created
    INITIATED = "INITIATED",      // Payment initiated with gateway
    ATTEMPTED = "ATTEMPTED",      // User attempted payment
    CAPTURED = "CAPTURED",        // Gateway captured payment
    SUCCESS = "SUCCESS",          // Payment confirmed successful
    FAILED = "FAILED",            // Payment failed
    REFUNDED = "REFUNDED",        // Payment refunded
    CANCELLED = "CANCELLED",      // Payment cancelled
}

// Valid state transitions
const VALID_TRANSITIONS: Record<PaymentState, PaymentState[]> = {
    [PaymentState.CREATED]: [PaymentState.INITIATED, PaymentState.CANCELLED],
    [PaymentState.INITIATED]: [PaymentState.ATTEMPTED, PaymentState.FAILED, PaymentState.CANCELLED],
    [PaymentState.ATTEMPTED]: [PaymentState.CAPTURED, PaymentState.FAILED],
    [PaymentState.CAPTURED]: [PaymentState.SUCCESS, PaymentState.FAILED],
    [PaymentState.SUCCESS]: [PaymentState.REFUNDED],
    [PaymentState.FAILED]: [], // Terminal state
    [PaymentState.REFUNDED]: [], // Terminal state
    [PaymentState.CANCELLED]: [], // Terminal state
};

// Terminal states (no further transitions allowed)
const TERMINAL_STATES = [
    PaymentState.FAILED,
    PaymentState.REFUNDED,
    PaymentState.CANCELLED,
];

export interface PaymentStateTransitionParams {
    paymentId: number;
    toState: PaymentState;
    triggeredBy: "webhook" | "manual" | "api" | "cron";
    metadata?: Record<string, any>;
    expectedVersion?: number; // For optimistic locking
}

export class PaymentStateMachine {
    /**
     * Validate if a state transition is allowed
     */
    static isValidTransition(fromState: PaymentState, toState: PaymentState): boolean {
        const allowedStates = VALID_TRANSITIONS[fromState] || [];
        return allowedStates.includes(toState);
    }

    /**
     * Check if a state is terminal
     */
    static isTerminalState(state: PaymentState): boolean {
        return TERMINAL_STATES.includes(state);
    }

    /**
     * Transition payment to a new state with optimistic locking
     * 
     * @throws Error if transition is invalid or version mismatch (concurrent update)
     */
    static async transition(params: PaymentStateTransitionParams): Promise<void> {
        const { paymentId, toState, triggeredBy, metadata, expectedVersion } = params;

        await db.transaction(async (tx) => {
            // 1. Fetch current payment with lock
            const [currentPayment] = await tx
                .select()
                .from(payments)
                .where(eq(payments.id, paymentId))
                .for("update"); // Row-level lock

            if (!currentPayment) {
                throw new Error(`Payment ${paymentId} not found`);
            }

            const fromState = currentPayment.paymentState as PaymentState;

            // 2. Optimistic locking check
            if (expectedVersion !== undefined && currentPayment.stateVersion !== expectedVersion) {
                throw new Error(
                    `Payment ${paymentId} version mismatch. Expected ${expectedVersion}, got ${currentPayment.stateVersion}. Concurrent update detected.`
                );
            }

            // 3. Validate transition
            if (!this.isValidTransition(fromState, toState)) {
                throw new Error(
                    `Invalid state transition for payment ${paymentId}: ${fromState} → ${toState}`
                );
            }

            // 4. Check if already in target state (idempotent)
            if (fromState === toState) {
                logger.info(`Payment ${paymentId} already in state ${toState}`);
                return;
            }

            // 5. Update payment state
            const now = new Date();
            const stateHistory = Array.isArray(currentPayment.stateHistory)
                ? currentPayment.stateHistory
                : [];

            const newHistory = [
                ...stateHistory,
                {
                    from: fromState,
                    to: toState,
                    triggeredBy,
                    metadata,
                    timestamp: now.toISOString(),
                },
            ];

            await tx
                .update(payments)
                .set({
                    paymentState: toState,
                    stateVersion: currentPayment.stateVersion + 1,
                    stateHistory: newHistory,
                    updatedAt: now,
                })
                .where(eq(payments.id, paymentId));

            // 6. Record state transition
            await tx.insert(paymentStateTransitions).values({
                paymentId,
                fromState,
                toState,
                triggeredBy,
                metadata,
            });

            logger.info(
                `Payment ${paymentId} transitioned: ${fromState} → ${toState} (version ${currentPayment.stateVersion + 1}) by ${triggeredBy}`
            );
        });
    }

    /**
     * Get current state of a payment
     */
    static async getCurrentState(paymentId: number): Promise<{
        state: PaymentState;
        version: number;
    } | null> {
        const [payment] = await db
            .select({
                state: payments.paymentState,
                version: payments.stateVersion,
            })
            .from(payments)
            .where(eq(payments.id, paymentId));

        if (!payment) return null;

        return {
            state: payment.state as PaymentState,
            version: payment.version,
        };
    }

    /**
     * Get state history for a payment
     */
    static async getStateHistory(paymentId: number): Promise<any[]> {
        const [payment] = await db
            .select({ history: payments.stateHistory })
            .from(payments)
            .where(eq(payments.id, paymentId));

        return Array.isArray(payment?.history) ? payment.history : [];
    }

    /**
     * Batch transition multiple payments to the same state
     * Used for reconciliation jobs
     */
    static async batchTransition(
        paymentIds: number[],
        toState: PaymentState,
        triggeredBy: "cron" | "manual",
        metadata?: Record<string, any>
    ): Promise<{ succeeded: number[]; failed: Array<{ id: number; error: string }> }> {
        const succeeded: number[] = [];
        const failed: Array<{ id: number; error: string }> = [];

        for (const paymentId of paymentIds) {
            try {
                await this.transition({
                    paymentId,
                    toState,
                    triggeredBy,
                    metadata,
                });
                succeeded.push(paymentId);
            } catch (error: any) {
                failed.push({
                    id: paymentId,
                    error: error.message,
                });
            }
        }

        return { succeeded, failed };
    }
}
