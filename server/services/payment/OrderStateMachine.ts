/**
 * Order State Machine Service
 * 
 * Manages order state transitions with:
 * - Strict state validation
 * - Optimistic locking
 * - Audit trail
 * - Integration with payment state
 */

import { db } from "../../db";
import { orders } from "@shared/schema";
import { orderStateTransitions } from "@shared/payment-schema";
import { eq } from "drizzle-orm";
import { logger } from "../../logger";

// Order state definitions
export enum OrderState {
    CREATED = "CREATED",                // Order created, awaiting payment
    PAYMENT_PENDING = "PAYMENT_PENDING", // Payment initiated
    CONFIRMED = "CONFIRMED",            // Payment successful, order confirmed
    PROCESSING = "PROCESSING",          // Order being processed
    SHIPPED = "SHIPPED",                // Order shipped
    DELIVERED = "DELIVERED",            // Order delivered
    CANCELLED = "CANCELLED",            // Order cancelled
    REFUND_PENDING = "REFUND_PENDING",  // Refund requested/in progress
}

// Valid state transitions
const VALID_TRANSITIONS: Record<OrderState, OrderState[]> = {
    [OrderState.CREATED]: [OrderState.PAYMENT_PENDING, OrderState.CANCELLED],
    [OrderState.PAYMENT_PENDING]: [OrderState.CONFIRMED, OrderState.CANCELLED],
    [OrderState.CONFIRMED]: [OrderState.PROCESSING, OrderState.REFUND_PENDING, OrderState.CANCELLED],
    [OrderState.PROCESSING]: [OrderState.SHIPPED, OrderState.REFUND_PENDING, OrderState.CANCELLED],
    [OrderState.SHIPPED]: [OrderState.DELIVERED, OrderState.REFUND_PENDING],
    [OrderState.DELIVERED]: [OrderState.REFUND_PENDING],
    [OrderState.CANCELLED]: [], // Terminal state
    [OrderState.REFUND_PENDING]: [OrderState.CANCELLED], // Can be cancelled after refund
};

const TERMINAL_STATES = [OrderState.CANCELLED];

export interface OrderStateTransitionParams {
    orderId: number;
    toState: OrderState;
    triggeredBy: "user" | "admin" | "webhook" | "system";
    userId?: number; // Who triggered the transition
    metadata?: Record<string, any>;
    expectedVersion?: number; // For optimistic locking
}

export class OrderStateMachine {
    /**
     * Validate if a state transition is allowed
     */
    static isValidTransition(fromState: OrderState, toState: OrderState): boolean {
        const allowedStates = VALID_TRANSITIONS[fromState] || [];
        return allowedStates.includes(toState);
    }

    /**
     * Check if a state is terminal
     */
    static isTerminalState(state: OrderState): boolean {
        return TERMINAL_STATES.includes(state);
    }

    /**
   * Transition order to a new state with optimistic locking
     */
    static async transition(params: OrderStateTransitionParams): Promise<void> {
        const { orderId, toState, triggeredBy, userId, metadata, expectedVersion } = params;

        await db.transaction(async (tx) => {
            // 1. Fetch current order with lock
            const [currentOrder] = await tx
                .select()
                .from(orders)
                .where(eq(orders.id, orderId))
                .for("update"); // Row-level lock

            if (!currentOrder) {
                throw new Error(`Order ${orderId} not found`);
            }

            const fromState = currentOrder.orderState as OrderState;

            // 2. Optimistic locking check
            if (expectedVersion !== undefined && currentOrder.stateVersion !== expectedVersion) {
                throw new Error(
                    `Order ${orderId} version mismatch. Expected ${expectedVersion}, got ${currentOrder.stateVersion}. Concurrent update detected.`
                );
            }

            // 3. Validate transition
            if (!this.isValidTransition(fromState, toState)) {
                throw new Error(
                    `Invalid state transition for order ${orderId}: ${fromState} → ${toState}`
                );
            }

            // 4. Check if already in target state (idempotent)
            if (fromState === toState) {
                logger.info(`Order ${orderId} already in state ${toState}`);
                return;
            }

            // 5. Update order state
            const now = new Date();
            const stateHistory = Array.isArray(currentOrder.stateHistory)
                ? currentOrder.stateHistory
                : [];

            const newHistory = [
                ...stateHistory,
                {
                    from: fromState,
                    to: toState,
                    triggeredBy,
                    userId,
                    metadata,
                    timestamp: now.toISOString(),
                },
            ];

            await tx
                .update(orders)
                .set({
                    orderState: toState,
                    stateVersion: currentOrder.stateVersion + 1,
                    stateHistory: newHistory,
                })
                .where(eq(orders.id, orderId));

            // 6. Update legacy status field for backward compatibility
            let legacyStatus = currentOrder.status;
            if (toState === OrderState.CONFIRMED) legacyStatus = "paid";
            else if (toState === OrderState.CANCELLED) legacyStatus = "cancelled";
            else if (toState === OrderState.SHIPPED) legacyStatus = "shipped";
            else if (toState === OrderState.DELIVERED) legacyStatus = "delivered";

            if (legacyStatus !== currentOrder.status) {
                await tx
                    .update(orders)
                    .set({ status: legacyStatus as any })
                    .where(eq(orders.id, orderId));
            }

            // 7. Record state transition
            await tx.insert(orderStateTransitions).values({
                orderId,
                fromState,
                toState,
                triggeredBy,
                userId: userId || null,
                metadata,
            });

            logger.info(
                `Order ${orderId} transitioned: ${fromState} → ${toState} (version ${currentOrder.stateVersion + 1}) by ${triggeredBy}${userId ? ` (user ${userId})` : ""}`
            );
        });
    }

    /**
     * Get current state of an order
     */
    static async getCurrentState(orderId: number): Promise<{
        state: OrderState;
        version: number;
    } | null> {
        const [order] = await db
            .select({
                state: orders.orderState,
                version: orders.stateVersion,
            })
            .from(orders)
            .where(eq(orders.id, orderId));

        if (!order) return null;

        return {
            state: order.state as OrderState,
            version: order.version,
        };
    }

    /**
     * Get state history for an order
     */
    static async getStateHistory(orderId: number): Promise<any[]> {
        const [order] = await db
            .select({ history: orders.stateHistory })
            .from(orders)
            .where(eq(orders.id, orderId));

        return Array.isArray(order?.history) ? order.history : [];
    }

    /**
     * Can the order be cancelled in its current state?
     */
    static async canCancel(orderId: number): Promise<boolean> {
        const currentState = await this.getCurrentState(orderId);
        if (!currentState) return false;

        return this.isValidTransition(currentState.state, OrderState.CANCELLED);
    }

    /**
     * Can a refund be requested in the current state?
     */
    static async canRequestRefund(orderId: number): Promise<boolean> {
        const currentState = await this.getCurrentState(orderId);
        if (!currentState) return false;

        return this.isValidTransition(currentState.state, OrderState.REFUND_PENDING);
    }
}
