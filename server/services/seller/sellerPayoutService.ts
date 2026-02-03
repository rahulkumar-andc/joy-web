import { db } from "../../db";
import { sellerPayouts, sellerProfiles, sellerWallets, sellerTransactions } from "@shared/seller-schema";
import { users } from "@shared/schema";
import { eq, desc, and, ilike, sql } from "drizzle-orm";

type PayoutFilter = {
    status?: string;
    search?: string;
};

export const sellerPayoutService = {
    async getPayouts(filters: PayoutFilter = {}, page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        let conditions = undefined;
        const conditionsList = [];

        if (filters.status && filters.status !== 'all') {
            conditionsList.push(eq(sellerPayouts.status, filters.status));
        }

        if (filters.search) {
            conditionsList.push(
                sql`(${sellerProfiles.shopName} ILIKE ${`%${filters.search}%`} OR ${sellerPayouts.payoutNumber} ILIKE ${`%${filters.search}%`})`
            );
        }

        if (conditionsList.length > 0) {
            conditions = and(...conditionsList);
        }

        const results = await db.select({
            payout: sellerPayouts,
            shopName: sellerProfiles.shopName,
            sellerName: users.name
        })
            .from(sellerPayouts)
            .innerJoin(sellerProfiles, eq(sellerPayouts.sellerId, sellerProfiles.id))
            .innerJoin(users, eq(sellerProfiles.userId, users.id))
            .where(conditions)
            .orderBy(desc(sellerPayouts.createdAt))
            .limit(limit)
            .offset(offset);

        // Get total count for pagination
        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(sellerPayouts)
            .innerJoin(sellerProfiles, eq(sellerPayouts.sellerId, sellerProfiles.id))
            .where(conditions);

        return {
            payouts: results.map(r => ({
                ...r.payout,
                shopName: r.shopName,
                sellerName: r.sellerName
            })),
            total: Number(count),
            page,
            limit
        };
    },

    async managePayout(payoutId: number, adminId: number, action: 'approve' | 'reject' | 'process', note?: string) {
        const [payout] = await db.select().from(sellerPayouts).where(eq(sellerPayouts.id, payoutId));

        if (!payout) {
            throw new Error("Payout not found");
        }

        if (action === 'approve') {
            if (payout.status !== 'requested') throw new Error("Only requested payouts can be approved");

            await db.update(sellerPayouts)
                .set({
                    status: 'pending_approval', // Or directly to processing? Let's use standard flow
                    // Actually, let's map 'approve' to 'approved' or 'processing' if manual
                    status: 'approved',
                    approvedBy: adminId,
                    approvedAt: new Date(),
                    approvalNote: note
                })
                .where(eq(sellerPayouts.id, payoutId));

            return { success: true, message: "Payout approved" };
        }

        if (action === 'reject') {
            if (['completed', 'failed', 'cancelled'].includes(payout.status)) {
                throw new Error("Cannot reject a finalized payout");
            }

            // Refund logic: Credit the amount back to seller wallet
            await db.transaction(async (tx) => {
                await tx.update(sellerPayouts)
                    .set({
                        status: 'cancelled', // rejected
                        failureReason: note || 'Rejected by admin',
                        approvedBy: adminId,
                        approvedAt: new Date(), // Rejected is a form of approval outcome
                    })
                    .where(eq(sellerPayouts.id, payoutId));

                // Get wallet
                const [wallet] = await tx.select().from(sellerWallets).where(eq(sellerWallets.sellerId, payout.sellerId));

                if (wallet) {
                    await tx.update(sellerWallets)
                        .set({
                            // Move from wherever it was deducted? 
                            // Usually payout request deducts from available balance. So we add it back.
                            availableBalance: sql`${sellerWallets.availableBalance} + ${payout.amount}`,
                            totalWithdrawn: sql`${sellerWallets.totalWithdrawn} - ${payout.amount}` // Revert withdrawal metric
                        })
                        .where(eq(sellerWallets.id, wallet.id));

                    // Log transaction
                    await tx.insert(sellerTransactions).values({
                        sellerId: payout.sellerId,
                        walletId: wallet.id,
                        transactionNumber: `TXN-REF-${Date.now()}`,
                        type: 'payout_reversal',
                        amount: payout.amount,
                        referenceType: 'payout',
                        referenceId: payoutId,
                        description: `Payout #${payout.payoutNumber} rejected: ${note}`,
                        pendingBalanceAfter: wallet.pendingBalance, // unchanged
                        availableBalanceAfter: String(Number(wallet.availableBalance) + Number(payout.amount)),
                        holdBalanceAfter: wallet.holdBalance
                    });
                }
            });

            return { success: true, message: "Payout rejected and refunded" };
        }

        if (action === 'process') {
            if (payout.status !== 'approved') throw new Error("Only approved payouts can be processed");

            await db.update(sellerPayouts)
                .set({
                    status: 'completed',
                    processedBy: adminId,
                    processedAt: new Date(),
                    transactionId: `MANUAL-${Date.now()}` // Mock transaction ID
                })
                .where(eq(sellerPayouts.id, payoutId));

            return { success: true, message: "Payout marked as completed" };
        }

        return { success: false, error: "Invalid action" };
    }
};
