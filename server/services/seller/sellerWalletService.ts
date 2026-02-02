import { db } from "../../db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import {
    sellerWallets,
    sellerTransactions,
    sellerPayouts,
    sellerOrders,
    sellerNotifications,
    SellerWallet,
    SellerTransaction,
    SellerPayout,
    PAYOUT_HOLD_DAYS,
    MIN_PAYOUT_AMOUNT,
} from "@shared/seller-schema";

// ============================================================================
// SELLER WALLET SERVICE
// Handles wallet management, transactions, and payouts
// ============================================================================

class SellerWalletService {
    /**
     * Generate unique transaction number
     */
    private async generateTransactionNumber(): Promise<string> {
        const count = await db
            .select({ count: sql<number>`count(*)` })
            .from(sellerTransactions);
        return `TXN-${String(Number(count[0].count) + 1).padStart(6, "0")}`;
    }

    /**
     * Generate unique payout number
     */
    private async generatePayoutNumber(): Promise<string> {
        const count = await db
            .select({ count: sql<number>`count(*)` })
            .from(sellerPayouts);
        return `PO-${String(Number(count[0].count) + 1).padStart(6, "0")}`;
    }

    /**
     * Get seller wallet
     */
    async getWallet(sellerId: number): Promise<SellerWallet | null> {
        const wallet = await db.query.sellerWallets.findFirst({
            where: eq(sellerWallets.sellerId, sellerId),
        });
        return wallet || null;
    }

    /**
     * Create wallet for new seller (called on approval)
     */
    async createWallet(sellerId: number): Promise<SellerWallet> {
        const [wallet] = await db
            .insert(sellerWallets)
            .values({ sellerId })
            .returning();
        return wallet;
    }

    /**
     * Add earnings to pending balance (called when order is placed)
     */
    async addPendingBalance(
        sellerId: number,
        amount: number,
        sellerOrderId: number,
        description: string
    ): Promise<{ success: boolean; transaction?: SellerTransaction; error?: string }> {
        try {
            const wallet = await this.getWallet(sellerId);
            if (!wallet) {
                return { success: false, error: "Wallet not found" };
            }

            const newPendingBalance = Number(wallet.pendingBalance) + amount;
            const transactionNumber = await this.generateTransactionNumber();

            // Update wallet
            await db
                .update(sellerWallets)
                .set({
                    pendingBalance: String(newPendingBalance),
                    totalEarned: String(Number(wallet.totalEarned) + amount),
                    updatedAt: new Date(),
                })
                .where(eq(sellerWallets.id, wallet.id));

            // Create transaction record
            const [transaction] = await db
                .insert(sellerTransactions)
                .values({
                    sellerId,
                    walletId: wallet.id,
                    transactionNumber,
                    type: "order_credit",
                    amount: String(amount),
                    referenceType: "seller_order",
                    referenceId: sellerOrderId,
                    pendingBalanceAfter: String(newPendingBalance),
                    availableBalanceAfter: wallet.availableBalance,
                    holdBalanceAfter: wallet.holdBalance,
                    description,
                })
                .returning();

            return { success: true, transaction };
        } catch (error) {
            console.error("[SellerWallet] Add pending balance error:", error);
            return { success: false, error: "Failed to add pending balance" };
        }
    }

    /**
     * Move funds from pending to available (called after delivery + hold period)
     */
    async movePendingToAvailable(
        sellerId: number,
        sellerOrderId: number,
        amount: number
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const wallet = await this.getWallet(sellerId);
            if (!wallet) {
                return { success: false, error: "Wallet not found" };
            }

            const newPendingBalance = Number(wallet.pendingBalance) - amount;
            const newAvailableBalance = Number(wallet.availableBalance) + amount;
            const transactionNumber = await this.generateTransactionNumber();

            // Update wallet
            await db
                .update(sellerWallets)
                .set({
                    pendingBalance: String(newPendingBalance),
                    availableBalance: String(newAvailableBalance),
                    updatedAt: new Date(),
                })
                .where(eq(sellerWallets.id, wallet.id));

            // Create transaction record
            await db.insert(sellerTransactions).values({
                sellerId,
                walletId: wallet.id,
                transactionNumber,
                type: "release",
                amount: String(amount),
                referenceType: "seller_order",
                referenceId: sellerOrderId,
                pendingBalanceAfter: String(newPendingBalance),
                availableBalanceAfter: String(newAvailableBalance),
                holdBalanceAfter: wallet.holdBalance,
                description: `Order payment released to available balance`,
            });

            // Update seller order payout status
            await db
                .update(sellerOrders)
                .set({ payoutStatus: "eligible" })
                .where(eq(sellerOrders.id, sellerOrderId));

            return { success: true };
        } catch (error) {
            console.error("[SellerWallet] Move to available error:", error);
            return { success: false, error: "Failed to move funds to available" };
        }
    }

    /**
     * Deduct from wallet for refund
     */
    async deductForRefund(
        sellerId: number,
        amount: number,
        returnRequestId: number,
        fromPending: boolean = false
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const wallet = await this.getWallet(sellerId);
            if (!wallet) {
                return { success: false, error: "Wallet not found" };
            }

            const balanceToDeduct = fromPending ? "pendingBalance" : "availableBalance";
            const currentBalance = Number(wallet[balanceToDeduct]);

            if (currentBalance < amount) {
                return { success: false, error: "Insufficient balance" };
            }

            const newBalance = currentBalance - amount;
            const transactionNumber = await this.generateTransactionNumber();

            // Update wallet
            await db
                .update(sellerWallets)
                .set({
                    [balanceToDeduct]: String(newBalance),
                    totalEarned: String(Number(wallet.totalEarned) - amount),
                    updatedAt: new Date(),
                })
                .where(eq(sellerWallets.id, wallet.id));

            // Create transaction record
            await db.insert(sellerTransactions).values({
                sellerId,
                walletId: wallet.id,
                transactionNumber,
                type: "refund_debit",
                amount: String(-amount), // Negative for debit
                referenceType: "return_request",
                referenceId: returnRequestId,
                pendingBalanceAfter: fromPending ? String(newBalance) : wallet.pendingBalance,
                availableBalanceAfter: fromPending ? wallet.availableBalance : String(newBalance),
                holdBalanceAfter: wallet.holdBalance,
                description: `Refund deduction for return`,
            });

            return { success: true };
        } catch (error) {
            console.error("[SellerWallet] Deduct for refund error:", error);
            return { success: false, error: "Failed to deduct for refund" };
        }
    }

    /**
     * Hold funds for dispute
     */
    async holdFunds(
        sellerId: number,
        amount: number,
        reason: string,
        referenceType: string,
        referenceId: number
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const wallet = await this.getWallet(sellerId);
            if (!wallet) {
                return { success: false, error: "Wallet not found" };
            }

            const availableBalance = Number(wallet.availableBalance);
            if (availableBalance < amount) {
                return { success: false, error: "Insufficient available balance" };
            }

            const newAvailableBalance = availableBalance - amount;
            const newHoldBalance = Number(wallet.holdBalance) + amount;
            const transactionNumber = await this.generateTransactionNumber();

            // Update wallet
            await db
                .update(sellerWallets)
                .set({
                    availableBalance: String(newAvailableBalance),
                    holdBalance: String(newHoldBalance),
                    updatedAt: new Date(),
                })
                .where(eq(sellerWallets.id, wallet.id));

            // Create transaction record
            await db.insert(sellerTransactions).values({
                sellerId,
                walletId: wallet.id,
                transactionNumber,
                type: "hold",
                amount: String(-amount),
                referenceType,
                referenceId,
                pendingBalanceAfter: wallet.pendingBalance,
                availableBalanceAfter: String(newAvailableBalance),
                holdBalanceAfter: String(newHoldBalance),
                description: reason,
            });

            return { success: true };
        } catch (error) {
            console.error("[SellerWallet] Hold funds error:", error);
            return { success: false, error: "Failed to hold funds" };
        }
    }

    /**
     * Release held funds
     */
    async releaseHeldFunds(
        sellerId: number,
        amount: number,
        reason: string,
        referenceType: string,
        referenceId: number
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const wallet = await this.getWallet(sellerId);
            if (!wallet) {
                return { success: false, error: "Wallet not found" };
            }

            const holdBalance = Number(wallet.holdBalance);
            if (holdBalance < amount) {
                return { success: false, error: "Insufficient hold balance" };
            }

            const newHoldBalance = holdBalance - amount;
            const newAvailableBalance = Number(wallet.availableBalance) + amount;
            const transactionNumber = await this.generateTransactionNumber();

            // Update wallet
            await db
                .update(sellerWallets)
                .set({
                    availableBalance: String(newAvailableBalance),
                    holdBalance: String(newHoldBalance),
                    updatedAt: new Date(),
                })
                .where(eq(sellerWallets.id, wallet.id));

            // Create transaction record
            await db.insert(sellerTransactions).values({
                sellerId,
                walletId: wallet.id,
                transactionNumber,
                type: "release",
                amount: String(amount),
                referenceType,
                referenceId,
                pendingBalanceAfter: wallet.pendingBalance,
                availableBalanceAfter: String(newAvailableBalance),
                holdBalanceAfter: String(newHoldBalance),
                description: reason,
            });

            return { success: true };
        } catch (error) {
            console.error("[SellerWallet] Release held funds error:", error);
            return { success: false, error: "Failed to release held funds" };
        }
    }

    /**
     * Request payout
     */
    async requestPayout(
        sellerId: number,
        amount: number,
        requestedBy: number
    ): Promise<{ success: boolean; payout?: SellerPayout; error?: string }> {
        try {
            const wallet = await this.getWallet(sellerId);
            if (!wallet) {
                return { success: false, error: "Wallet not found" };
            }

            // Validate amount
            if (amount < MIN_PAYOUT_AMOUNT) {
                return { success: false, error: `Minimum payout amount is ₹${MIN_PAYOUT_AMOUNT}` };
            }

            const availableBalance = Number(wallet.availableBalance);
            if (availableBalance < amount) {
                return { success: false, error: "Insufficient available balance" };
            }

            // Get seller bank details
            const seller = await db.query.sellerProfiles.findFirst({
                where: eq(sellerWallets.sellerId, sellerId),
            });

            if (!seller) {
                return { success: false, error: "Seller profile not found" };
            }

            const payoutNumber = await this.generatePayoutNumber();

            // Create payout request
            const [payout] = await db
                .insert(sellerPayouts)
                .values({
                    sellerId,
                    payoutNumber,
                    amount: String(amount),
                    status: "requested",
                    bankAccountNumber: seller.bankAccountNumber,
                    bankIfscCode: seller.bankIfscCode,
                    bankAccountName: seller.bankAccountName,
                    requestedBy,
                })
                .returning();

            // Deduct from available balance (pre-hold)
            const newAvailableBalance = availableBalance - amount;
            const transactionNumber = await this.generateTransactionNumber();

            await db
                .update(sellerWallets)
                .set({
                    availableBalance: String(newAvailableBalance),
                    updatedAt: new Date(),
                })
                .where(eq(sellerWallets.id, wallet.id));

            // Create transaction record
            await db.insert(sellerTransactions).values({
                sellerId,
                walletId: wallet.id,
                transactionNumber,
                type: "payout",
                amount: String(-amount),
                referenceType: "payout",
                referenceId: payout.id,
                pendingBalanceAfter: wallet.pendingBalance,
                availableBalanceAfter: String(newAvailableBalance),
                holdBalanceAfter: wallet.holdBalance,
                description: `Payout request ${payoutNumber}`,
            });

            return { success: true, payout };
        } catch (error) {
            console.error("[SellerWallet] Request payout error:", error);
            return { success: false, error: "Failed to request payout" };
        }
    }

    /**
     * Process payout (admin)
     */
    async processPayout(
        payoutId: number,
        adminId: number,
        action: "approve" | "process" | "complete" | "fail" | "cancel",
        details?: { transactionId?: string; utrNumber?: string; failureReason?: string; note?: string }
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const payout = await db.query.sellerPayouts.findFirst({
                where: eq(sellerPayouts.id, payoutId),
            });

            if (!payout) {
                return { success: false, error: "Payout not found" };
            }

            const updates: Partial<SellerPayout> = {};

            switch (action) {
                case "approve":
                    if (payout.status !== "requested" && payout.status !== "pending_approval") {
                        return { success: false, error: `Cannot approve payout with status: ${payout.status}` };
                    }
                    updates.status = "approved";
                    updates.approvedBy = adminId;
                    updates.approvedAt = new Date();
                    updates.approvalNote = details?.note;
                    break;

                case "process":
                    if (payout.status !== "approved") {
                        return { success: false, error: `Cannot process payout with status: ${payout.status}` };
                    }
                    updates.status = "processing";
                    updates.processedBy = adminId;
                    updates.processedAt = new Date();
                    break;

                case "complete":
                    if (payout.status !== "processing") {
                        return { success: false, error: `Cannot complete payout with status: ${payout.status}` };
                    }
                    updates.status = "completed";
                    updates.transactionId = details?.transactionId;
                    updates.utrNumber = details?.utrNumber;
                    updates.completedAt = new Date();

                    // Update wallet
                    const wallet = await this.getWallet(payout.sellerId);
                    if (wallet) {
                        await db
                            .update(sellerWallets)
                            .set({
                                totalWithdrawn: String(Number(wallet.totalWithdrawn) + Number(payout.amount)),
                                updatedAt: new Date(),
                            })
                            .where(eq(sellerWallets.id, wallet.id));
                    }

                    // Send notification
                    await this.sendNotification(payout.sellerId, {
                        type: "payout_completed",
                        title: "Payout completed",
                        message: `₹${payout.amount} has been transferred to your bank account.`,
                        data: { payoutId: payout.id, amount: payout.amount },
                    });
                    break;

                case "fail":
                    if (payout.status !== "processing") {
                        return { success: false, error: `Cannot fail payout with status: ${payout.status}` };
                    }
                    updates.status = "failed";
                    updates.failureReason = details?.failureReason;
                    updates.retryCount = (payout.retryCount || 0) + 1;

                    // Refund to available balance
                    await this.reversePayout(payout.sellerId, Number(payout.amount), payout.id);

                    // Send notification
                    await this.sendNotification(payout.sellerId, {
                        type: "payout_failed",
                        title: "Payout failed",
                        message: `Payout of ₹${payout.amount} failed. Reason: ${details?.failureReason}. Amount has been credited back to your wallet.`,
                        data: { payoutId: payout.id },
                    });
                    break;

                case "cancel":
                    if (!["requested", "pending_approval", "approved"].includes(payout.status)) {
                        return { success: false, error: `Cannot cancel payout with status: ${payout.status}` };
                    }
                    updates.status = "cancelled";

                    // Refund to available balance
                    await this.reversePayout(payout.sellerId, Number(payout.amount), payout.id);
                    break;
            }

            await db
                .update(sellerPayouts)
                .set(updates)
                .where(eq(sellerPayouts.id, payoutId));

            return { success: true };
        } catch (error) {
            console.error("[SellerWallet] Process payout error:", error);
            return { success: false, error: "Failed to process payout" };
        }
    }

    /**
     * Reverse payout (add back to available balance)
     */
    private async reversePayout(
        sellerId: number,
        amount: number,
        payoutId: number
    ): Promise<void> {
        const wallet = await this.getWallet(sellerId);
        if (!wallet) return;

        const newAvailableBalance = Number(wallet.availableBalance) + amount;
        const transactionNumber = await this.generateTransactionNumber();

        await db
            .update(sellerWallets)
            .set({
                availableBalance: String(newAvailableBalance),
                updatedAt: new Date(),
            })
            .where(eq(sellerWallets.id, wallet.id));

        await db.insert(sellerTransactions).values({
            sellerId,
            walletId: wallet.id,
            transactionNumber,
            type: "payout_reversal",
            amount: String(amount),
            referenceType: "payout",
            referenceId: payoutId,
            pendingBalanceAfter: wallet.pendingBalance,
            availableBalanceAfter: String(newAvailableBalance),
            holdBalanceAfter: wallet.holdBalance,
            description: "Payout reversed/cancelled",
        });
    }

    /**
     * Get transaction history
     */
    async getTransactionHistory(
        sellerId: number,
        filters?: {
            type?: SellerTransaction["type"];
            startDate?: Date;
            endDate?: Date;
        },
        page: number = 1,
        limit: number = 20
    ): Promise<{ transactions: SellerTransaction[]; total: number }> {
        const offset = (page - 1) * limit;

        let whereConditions = [eq(sellerTransactions.sellerId, sellerId)];

        if (filters?.type) {
            whereConditions.push(eq(sellerTransactions.type, filters.type));
        }
        if (filters?.startDate) {
            whereConditions.push(gte(sellerTransactions.createdAt, filters.startDate));
        }
        if (filters?.endDate) {
            whereConditions.push(lte(sellerTransactions.createdAt, filters.endDate));
        }

        const transactions = await db.query.sellerTransactions.findMany({
            where: and(...whereConditions),
            orderBy: [desc(sellerTransactions.createdAt)],
            limit,
            offset,
        });

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(sellerTransactions)
            .where(and(...whereConditions));

        return { transactions, total: Number(count) };
    }

    /**
     * Get payout history
     */
    async getPayoutHistory(
        sellerId: number,
        status?: SellerPayout["status"],
        page: number = 1,
        limit: number = 20
    ): Promise<{ payouts: SellerPayout[]; total: number }> {
        const offset = (page - 1) * limit;

        let whereCondition = eq(sellerPayouts.sellerId, sellerId);
        if (status) {
            whereCondition = and(whereCondition, eq(sellerPayouts.status, status)) as any;
        }

        const payouts = await db.query.sellerPayouts.findMany({
            where: whereCondition,
            orderBy: [desc(sellerPayouts.createdAt)],
            limit,
            offset,
        });

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(sellerPayouts)
            .where(whereCondition);

        return { payouts, total: Number(count) };
    }

    /**
     * Get all payouts for admin with status filtering
     */
    async getAllPayouts(
        statusFilter: string = "all",
        page: number = 1,
        limit: number = 20
    ): Promise<{ payouts: any[]; total: number }> {
        const offset = (page - 1) * limit;

        let whereCondition: any = undefined;
        if (statusFilter !== "all") {
            whereCondition = eq(sellerPayouts.status, statusFilter as any);
        }

        const payouts = await db.query.sellerPayouts.findMany({
            where: whereCondition,
            orderBy: [desc(sellerPayouts.createdAt)],
            limit,
            offset,
            with: {
                seller: {
                    with: {
                        wallet: true,
                    },
                },
            },
        });

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(sellerPayouts)
            .where(whereCondition);

        return { payouts, total: Number(count) };
    }

    /**
     * Process eligible payouts (cron job)
     * Moves pending balance to available after hold period
     */
    async processEligiblePayouts(): Promise<{ processed: number; errors: number }> {
        let processed = 0;
        let errors = 0;

        const holdDate = new Date();
        holdDate.setDate(holdDate.getDate() - PAYOUT_HOLD_DAYS);

        // Find orders eligible for payout
        const eligibleOrders = await db.query.sellerOrders.findMany({
            where: and(
                eq(sellerOrders.status, "delivered"),
                eq(sellerOrders.payoutStatus, "pending"),
                lte(sellerOrders.deliveredAt, holdDate)
            ),
        });

        for (const order of eligibleOrders) {
            try {
                await this.movePendingToAvailable(
                    order.sellerId,
                    order.id,
                    Number(order.sellerEarnings)
                );
                processed++;
            } catch (error) {
                console.error(`[SellerWallet] Failed to process order ${order.id}:`, error);
                errors++;
            }
        }

        return { processed, errors };
    }

    /**
     * Send notification helper
     */
    private async sendNotification(
        sellerId: number,
        notification: {
            type: "payout_completed" | "payout_failed";
            title: string;
            message: string;
            data?: Record<string, any>;
        }
    ): Promise<void> {
        try {
            await db.insert(sellerNotifications).values({
                sellerId,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data,
            });
        } catch (error) {
            console.error("[SellerWallet] Send notification error:", error);
        }
    }
}

export const sellerWalletService = new SellerWalletService();
