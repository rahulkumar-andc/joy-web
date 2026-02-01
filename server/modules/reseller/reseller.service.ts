import { db } from "../../db";
import { eq, and, desc, gte, lte, sql, count, sum } from "drizzle-orm";
import {
    resellers,
    resellerLinks,
    resellerCommissions,
    resellerPayouts,
    resellerClicks,
    users,
    products,
    orders,
    RESELLER_TIERS,
    type Reseller,
    type ResellerLink,
    type ResellerCommission,
    type ResellerPayout,
    type ResellerTier,
} from "@shared/schema";
import { nanoid } from "nanoid";

// === RESELLER SERVICE ===

class ResellerService {
    // ==================
    // RESELLER MANAGEMENT
    // ==================

    /**
     * Create a new reseller profile
     */
    async createReseller(userId: number, data: {
        upiId?: string;
        bankAccountNumber?: string;
        bankIfscCode?: string;
        bankAccountName?: string;
        preferredPayoutMethod?: "bank" | "upi";
    }): Promise<Reseller> {
        // Check if user already has reseller profile
        const existing = await db.query.resellers.findFirst({
            where: eq(resellers.userId, userId),
        });

        if (existing) {
            throw new Error("User already has a reseller profile");
        }

        // Generate unique reseller code
        const resellerCode = `RES_${nanoid(8).toUpperCase()}`;

        const [reseller] = await db.insert(resellers).values({
            userId,
            resellerCode,
            ...data,
            status: "pending",
            tier: "bronze",
        }).returning();

        return reseller;
    }

    /**
     * Get reseller by user ID
     */
    async getResellerByUserId(userId: number): Promise<Reseller | null> {
        const reseller = await db.query.resellers.findFirst({
            where: eq(resellers.userId, userId),
        });
        return reseller || null;
    }

    /**
     * Get reseller by ID
     */
    async getResellerById(id: number): Promise<Reseller | null> {
        const reseller = await db.query.resellers.findFirst({
            where: eq(resellers.id, id),
        });
        return reseller || null;
    }

    /**
     * Approve reseller
     */
    async approveReseller(resellerId: number): Promise<Reseller> {
        const [updated] = await db.update(resellers)
            .set({
                status: "active",
                approvedAt: new Date(),
            })
            .where(eq(resellers.id, resellerId))
            .returning();

        return updated;
    }

    /**
     * Suspend reseller
     */
    async suspendReseller(resellerId: number, reason: string): Promise<Reseller> {
        const [updated] = await db.update(resellers)
            .set({
                status: "suspended",
                suspendedAt: new Date(),
                flagReason: reason,
            })
            .where(eq(resellers.id, resellerId))
            .returning();

        return updated;
    }

    /**
     * Update bank/UPI details
     */
    async updatePayoutDetails(resellerId: number, data: {
        bankAccountNumber?: string;
        bankIfscCode?: string;
        bankAccountName?: string;
        upiId?: string;
        preferredPayoutMethod?: "bank" | "upi";
    }): Promise<Reseller> {
        const [updated] = await db.update(resellers)
            .set(data)
            .where(eq(resellers.id, resellerId))
            .returning();

        return updated;
    }

    /**
     * Update reseller tier based on orders count
     */
    async updateTier(resellerId: number): Promise<ResellerTier> {
        const reseller = await this.getResellerById(resellerId);
        if (!reseller) throw new Error("Reseller not found");

        const orderCount = reseller.lifetimeOrders;
        let newTier: ResellerTier = "bronze";

        if (orderCount >= RESELLER_TIERS.platinum.minOrders) {
            newTier = "platinum";
        } else if (orderCount >= RESELLER_TIERS.gold.minOrders) {
            newTier = "gold";
        } else if (orderCount >= RESELLER_TIERS.silver.minOrders) {
            newTier = "silver";
        }

        if (newTier !== reseller.tier) {
            await db.update(resellers)
                .set({ tier: newTier })
                .where(eq(resellers.id, resellerId));
        }

        return newTier;
    }

    // ==================
    // LINK MANAGEMENT
    // ==================

    /**
     * Create a product share link
     */
    async createLink(resellerId: number, data: {
        productId: number;
        customTitle?: string;
        marginType?: "percentage" | "fixed";
        marginValue?: string;
    }): Promise<ResellerLink> {
        // Verify reseller is active
        const reseller = await this.getResellerById(resellerId);
        if (!reseller || reseller.status !== "active") {
            throw new Error("Reseller not found or not active");
        }

        // Check if link already exists for this product
        const existing = await db.query.resellerLinks.findFirst({
            where: and(
                eq(resellerLinks.resellerId, resellerId),
                eq(resellerLinks.productId, data.productId)
            ),
        });

        if (existing) {
            throw new Error("Link already exists for this product");
        }

        // Generate short code
        const shortCode = nanoid(8).toLowerCase();

        const [link] = await db.insert(resellerLinks).values({
            resellerId,
            productId: data.productId,
            shortCode,
            customTitle: data.customTitle,
            marginType: data.marginType || "percentage",
            marginValue: data.marginValue || "0",
        }).returning();

        return link;
    }

    /**
     * Get link by short code
     */
    async getLinkByShortCode(shortCode: string): Promise<ResellerLink | null> {
        const [link] = await db
            .select()
            .from(resellerLinks)
            .where(eq(resellerLinks.shortCode, shortCode));
        return link || null;
    }

    /**
     * Get link by ID
     */
    async getLinkById(linkId: number): Promise<ResellerLink | null> {
        const [link] = await db
            .select()
            .from(resellerLinks)
            .where(eq(resellerLinks.id, linkId));
        return link || null;
    }

    /**
     * Get all links for a reseller
     */
    async getResellerLinks(resellerId: number): Promise<ResellerLink[]> {
        return await db.query.resellerLinks.findMany({
            where: eq(resellerLinks.resellerId, resellerId),
            orderBy: desc(resellerLinks.createdAt),
        });
    }

    /**
     * Record a click on a link
     */
    async recordClick(linkId: number, data: {
        ipAddress?: string;
        userAgent?: string;
        deviceFingerprint?: string;
        referrer?: string;
    }): Promise<void> {
        // Insert click record
        await db.insert(resellerClicks).values({
            linkId,
            ...data,
        });

        // Update link click count
        await db.update(resellerLinks)
            .set({
                clicks: sql`${resellerLinks.clicks} + 1`,
                lastClickAt: new Date(),
            })
            .where(eq(resellerLinks.id, linkId));
    }

    /**
     * Convert click to order (Legacy/Alternative method)
     */
    async convertClick(linkId: number, orderId: number): Promise<void> {
        // Update link conversion count
        await db.update(resellerLinks)
            .set({
                conversions: sql`${resellerLinks.conversions} + 1`,
            })
            .where(eq(resellerLinks.id, linkId));
    }

    /**
     * Mark click as converted (for order attribution system)
     */
    async markClickAsConverted(linkId: number, orderId: number): Promise<void> {
        // Update link conversion count
        await db.update(resellerLinks)
            .set({
                conversions: sql`${resellerLinks.conversions} + 1`,
            })
            .where(eq(resellerLinks.id, linkId));

        // Find and update the most recent click for this link (within last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentClick = await db.query.resellerClicks.findFirst({
            where: and(
                eq(resellerClicks.linkId, linkId),
                gte(resellerClicks.clickedAt, sevenDaysAgo),
                eq(resellerClicks.convertedToOrder, false)
            ),
            orderBy: desc(resellerClicks.clickedAt),
        });

        if (recentClick) {
            await db.update(resellerClicks)
                .set({
                    convertedToOrder: true,
                    orderId
                })
                .where(eq(resellerClicks.id, recentClick.id));
        }
    }

    // ==================
    // COMMISSION MANAGEMENT
    // ==================

    /**
     * Calculate commission for an order
     */
    calculateCommission(
        orderAmount: number,
        tier: ResellerTier,
        marginValue: number,
        marginType: "percentage" | "fixed"
    ): { baseRate: number; baseAmount: number; marginEarnings: number; total: number } {
        const tierConfig = RESELLER_TIERS[tier];
        const baseRate = tierConfig.baseRate + tierConfig.bonus;
        const baseAmount = orderAmount * baseRate;

        let marginEarnings = 0;
        if (marginType === "fixed") {
            marginEarnings = marginValue;
        } else if (marginType === "percentage") {
            marginEarnings = orderAmount * (marginValue / 100);
        }

        return {
            baseRate,
            baseAmount,
            marginEarnings,
            total: baseAmount + marginEarnings,
        };
    }

    /**
     * Create commission record for an order
     */
    async createCommission(
        resellerId: number,
        orderId: number,
        orderAmount: number,
        linkId?: number
    ): Promise<ResellerCommission> {
        const reseller = await this.getResellerById(resellerId);
        if (!reseller) throw new Error("Reseller not found");

        // Get link for margin calculation
        let marginValue = 0;
        let marginType: "percentage" | "fixed" = "percentage";

        if (linkId) {
            const link = await db.query.resellerLinks.findFirst({
                where: eq(resellerLinks.id, linkId),
            });
            if (link) {
                marginValue = parseFloat(link.marginValue);
                marginType = link.marginType as "percentage" | "fixed";
            }
        }

        const commission = this.calculateCommission(
            orderAmount,
            reseller.tier as ResellerTier,
            marginValue,
            marginType
        );

        const [record] = await db.insert(resellerCommissions).values({
            resellerId,
            orderId,
            linkId,
            orderAmount: orderAmount.toString(),
            baseCommissionRate: commission.baseRate.toString(),
            baseCommissionAmount: commission.baseAmount.toString(),
            marginEarnings: commission.marginEarnings.toString(),
            totalAmount: commission.total.toString(),
            status: "pending",
        }).returning();

        return record;
    }

    /**
     * Confirm commission (after delivery/return period)
     */
    async confirmCommission(commissionId: number): Promise<ResellerCommission> {
        const commission = await db.query.resellerCommissions.findFirst({
            where: eq(resellerCommissions.id, commissionId),
        });

        if (!commission) throw new Error("Commission not found");
        if (commission.status !== "pending") {
            throw new Error("Commission is not pending");
        }

        const [updated] = await db.update(resellerCommissions)
            .set({
                status: "confirmed",
                confirmedAt: new Date(),
            })
            .where(eq(resellerCommissions.id, commissionId))
            .returning();

        // Update reseller pending payout
        await db.update(resellers)
            .set({
                pendingPayout: sql`${resellers.pendingPayout} + ${commission.totalAmount}`,
                lifetimeOrders: sql`${resellers.lifetimeOrders} + 1`,
                lifetimeSales: sql`${resellers.lifetimeSales} + ${commission.orderAmount}`,
            })
            .where(eq(resellers.id, commission.resellerId));

        // Check for tier upgrade
        await this.updateTier(commission.resellerId);

        return updated;
    }

    /**
     * Cancel commission (order cancelled/refunded)
     */
    async cancelCommission(commissionId: number, reason: string): Promise<ResellerCommission> {
        const commission = await db.query.resellerCommissions.findFirst({
            where: eq(resellerCommissions.id, commissionId),
        });

        if (!commission) throw new Error("Commission not found");

        // If already confirmed, need to deduct from pending payout
        if (commission.status === "confirmed") {
            await db.update(resellers)
                .set({
                    pendingPayout: sql`${resellers.pendingPayout} - ${commission.totalAmount}`,
                })
                .where(eq(resellers.id, commission.resellerId));
        }

        const [updated] = await db.update(resellerCommissions)
            .set({
                status: "cancelled",
                cancellationReason: reason,
            })
            .where(eq(resellerCommissions.id, commissionId))
            .returning();

        return updated;
    }

    /**
     * Get reseller's commissions
     */
    async getResellerCommissions(
        resellerId: number,
        status?: string,
        limit = 50
    ): Promise<ResellerCommission[]> {
        const conditions = [eq(resellerCommissions.resellerId, resellerId)];
        if (status) {
            conditions.push(eq(resellerCommissions.status, status as any));
        }

        return await db.query.resellerCommissions.findMany({
            where: and(...conditions),
            orderBy: desc(resellerCommissions.createdAt),
            limit,
        });
    }

    // ==================
    // PAYOUT MANAGEMENT
    // ==================

    /**
     * Request a payout
     */
    async requestPayout(resellerId: number, amount: number, method: "bank" | "upi"): Promise<ResellerPayout> {
        const reseller = await this.getResellerById(resellerId);
        if (!reseller) throw new Error("Reseller not found");
        if (reseller.status !== "active") throw new Error("Reseller is not active");

        const pendingPayout = parseFloat(reseller.pendingPayout);
        if (amount > pendingPayout) {
            throw new Error(`Insufficient balance. Available: ₹${pendingPayout}`);
        }

        if (amount < 100) {
            throw new Error("Minimum payout amount is ₹100");
        }

        // Verify payout method details exist
        if (method === "bank") {
            if (!reseller.bankAccountNumber || !reseller.bankIfscCode) {
                throw new Error("Bank account details not configured");
            }
        } else if (method === "upi") {
            if (!reseller.upiId) {
                throw new Error("UPI ID not configured");
            }
        }

        // Create payout request
        const [payout] = await db.insert(resellerPayouts).values({
            resellerId,
            amount: amount.toString(),
            payoutMethod: method,
            bankAccountNumber: reseller.bankAccountNumber,
            bankIfscCode: reseller.bankIfscCode,
            upiId: reseller.upiId,
            status: "pending",
        }).returning();

        // Deduct from pending payout (hold)
        await db.update(resellers)
            .set({
                pendingPayout: sql`${resellers.pendingPayout} - ${amount}`,
            })
            .where(eq(resellers.id, resellerId));

        return payout;
    }

    /**
     * Complete payout
     */
    async completePayout(payoutId: number, transactionId: string): Promise<ResellerPayout> {
        const payout = await db.query.resellerPayouts.findFirst({
            where: eq(resellerPayouts.id, payoutId),
        });

        if (!payout) throw new Error("Payout not found");

        const [updated] = await db.update(resellerPayouts)
            .set({
                status: "completed",
                transactionId,
                completedAt: new Date(),
            })
            .where(eq(resellerPayouts.id, payoutId))
            .returning();

        // Add to total earnings
        await db.update(resellers)
            .set({
                totalEarnings: sql`${resellers.totalEarnings} + ${payout.amount}`,
            })
            .where(eq(resellers.id, payout.resellerId));

        // Mark all confirmed commissions as paid
        await db.update(resellerCommissions)
            .set({
                status: "paid",
                paidAt: new Date(),
            })
            .where(and(
                eq(resellerCommissions.resellerId, payout.resellerId),
                eq(resellerCommissions.status, "confirmed")
            ));

        return updated;
    }

    /**
     * Fail payout
     */
    async failPayout(payoutId: number, reason: string): Promise<ResellerPayout> {
        const payout = await db.query.resellerPayouts.findFirst({
            where: eq(resellerPayouts.id, payoutId),
        });

        if (!payout) throw new Error("Payout not found");

        const [updated] = await db.update(resellerPayouts)
            .set({
                status: "failed",
                failureReason: reason,
            })
            .where(eq(resellerPayouts.id, payoutId))
            .returning();

        // Refund to pending payout
        await db.update(resellers)
            .set({
                pendingPayout: sql`${resellers.pendingPayout} + ${payout.amount}`,
            })
            .where(eq(resellers.id, payout.resellerId));

        return updated;
    }

    /**
     * Get reseller's payouts
     */
    async getResellerPayouts(resellerId: number, limit = 50): Promise<ResellerPayout[]> {
        return await db.query.resellerPayouts.findMany({
            where: eq(resellerPayouts.resellerId, resellerId),
            orderBy: desc(resellerPayouts.createdAt),
            limit,
        });
    }

    /**
     * Get all payouts (admin)
     */
    async getAllPayouts(limit = 100): Promise<ResellerPayout[]> {
        return await db.query.resellerPayouts.findMany({
            orderBy: desc(resellerPayouts.createdAt),
            limit,
        });
    }

    // ==================
    // DASHBOARD STATS
    // ==================

    async getResellerDashboard(resellerId: number) {
        const reseller = await this.getResellerById(resellerId);
        if (!reseller) throw new Error("Reseller not found");

        // Get today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [todayStats] = await db
            .select({
                clicks: sql<number>`COALESCE(SUM(${resellerLinks.clicks}), 0)`,
                orders: sql<number>`COALESCE(COUNT(${resellerCommissions.id}), 0)`,
                earnings: sql<string>`COALESCE(SUM(${resellerCommissions.totalAmount}), '0')`,
            })
            .from(resellerLinks)
            .leftJoin(resellerCommissions, eq(resellerLinks.id, resellerCommissions.linkId))
            .where(and(
                eq(resellerLinks.resellerId, resellerId),
                gte(resellerCommissions.createdAt, today)
            ));

        // Get this month's stats
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const [monthStats] = await db
            .select({
                orders: sql<number>`COALESCE(COUNT(*), 0)`,
                earnings: sql<string>`COALESCE(SUM(${resellerCommissions.totalAmount}), '0')`,
            })
            .from(resellerCommissions)
            .where(and(
                eq(resellerCommissions.resellerId, resellerId),
                gte(resellerCommissions.createdAt, monthStart)
            ));

        // Get top performing links
        const topLinks = await db.query.resellerLinks.findMany({
            where: eq(resellerLinks.resellerId, resellerId),
            orderBy: desc(resellerLinks.conversions),
            limit: 5,
            with: {
                product: true,
            },
        });

        return {
            reseller,
            tier: reseller.tier,
            tierConfig: RESELLER_TIERS[reseller.tier as ResellerTier],
            balance: {
                pending: parseFloat(reseller.pendingPayout),
                total: parseFloat(reseller.totalEarnings),
            },
            today: {
                clicks: todayStats?.clicks || 0,
                orders: todayStats?.orders || 0,
                earnings: parseFloat(todayStats?.earnings || "0"),
            },
            thisMonth: {
                orders: monthStats?.orders || 0,
                earnings: parseFloat(monthStats?.earnings || "0"),
            },
            lifetime: {
                orders: reseller.lifetimeOrders,
                sales: parseFloat(reseller.lifetimeSales.toString()),
            },
            topLinks,
        };
    }
}

export const resellerService = new ResellerService();
