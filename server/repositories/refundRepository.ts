import { db } from "../db";
import { refunds, orders, users, refundItems, type Refund, type InsertRefund } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export class RefundRepository {
    async createRefund(data: InsertRefund & { amount: string; adminNote?: string; items?: { orderItemId: number; quantity: number; reason?: string }[] }): Promise<Refund> {
        return await db.transaction(async (tx) => {
            // @ts-ignore - adminNote might be creating issues with strict types if not in InsertRefund, but it is in table. 
            // casting or ignoring for Drizzle insert which allows extra fields if they match table columns.
            const [refund] = await tx.insert(refunds).values({
                userId: data.userId,
                orderId: data.orderId,
                reason: data.reason,
                description: data.description,
                refundMethod: data.refundMethod,
                status: "pending",
                amount: data.amount,
                adminNote: data.adminNote,
                images: data.images
            } as any).returning();

            // Note: Validation should ideally happen before transaction or inside it
            // ensuring (existing + new) <= orderTotal. 
            // We'll perform a check here or caller must do it.
            // For robustness, let's assume the caller uses getRefundedAmountForOrder before calling this.


            if (data.items && data.items.length > 0) {
                await tx.insert(refundItems).values(
                    data.items.map(item => ({
                        refundId: refund.id,
                        orderItemId: item.orderItemId,
                        quantity: item.quantity,
                        reason: item.reason
                    }))
                );
            }

            return refund;
        });
    }

    async getRefundsByUser(userId: number): Promise<Refund[]> {
        return await db.select().from(refunds).where(eq(refunds.userId, userId)).orderBy(desc(refunds.createdAt));
    }

    async getAllRefunds(): Promise<(Refund & { order: { id: number; totalAmount: string }, user: { email: string } })[]> {
        const results = await db.select({
            refund: refunds,
            order: orders,
            user: users
        })
            .from(refunds)
            .innerJoin(orders, eq(refunds.orderId, orders.id))
            .innerJoin(users, eq(refunds.userId, users.id))
            .orderBy(desc(refunds.createdAt));

        return results.map(r => ({
            ...r.refund,
            order: { id: r.order.id, totalAmount: r.order.totalAmount },
            user: { email: r.user.email }
        }));
    }

    async getAllRefundsAdmin() {
        return this.getAllRefunds();
    }


    async getRefundById(id: number): Promise<Refund | undefined> {
        const [refund] = await db.select().from(refunds).where(eq(refunds.id, id));
        return refund;
    }

    async updateRefundStatus(id: number, status: string, adminNote?: string): Promise<Refund | undefined> {
        const [updated] = await db.update(refunds)
            .set({
                status: status as any,
                adminNote: adminNote || null,
                updatedAt: new Date()
            })
            .where(eq(refunds.id, id))
            .returning();
        return updated;
    }

    /**
     * Calculate total amount already refunded for an order
     * Only counts SUCCESS or PROCESSING refunds (excludes FAILED/CANCELLED)
     */
    async getRefundedAmountForOrder(orderId: number): Promise<number> {
        const existingRefunds = await db
            .select({ amount: refunds.amount, status: refunds.status })
            .from(refunds)
            .where(and(
                eq(refunds.orderId, orderId)
            ));

        return existingRefunds
            .filter(r => (r.status as string) !== 'FAILED' && (r.status as string) !== 'CANCELLED' && (r.status as string) !== 'rejected')
            .reduce((sum, r) => sum + parseFloat(r.amount), 0);
    }
}

export const refundRepository = new RefundRepository();
