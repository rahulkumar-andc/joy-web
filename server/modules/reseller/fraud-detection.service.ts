import { db } from "../../db";
import { eq, and, desc, gte, sql, count } from "drizzle-orm";
import {
    resellers,
    resellerLinks,
    resellerClicks,
    users,
    orders,
    type Reseller,
} from "@shared/schema";

// === FRAUD DETECTION SERVICE ===

interface FraudCheckResult {
    isRisky: boolean;
    riskScore: number;
    flags: string[];
    shouldBlock: boolean;
}

class FraudDetectionService {
    // Risk thresholds
    private readonly RISK_THRESHOLD = 70;
    private readonly BLOCK_THRESHOLD = 90;

    /**
     * Check if an order is potentially fraudulent
     */
    async checkOrderFraud(
        resellerId: number,
        orderId: number,
        buyerEmail: string,
        buyerPhone: string | null,
        buyerIp: string
    ): Promise<FraudCheckResult> {
        const flags: string[] = [];
        let riskScore = 0;

        // Get reseller details
        const reseller = await db.query.resellers.findFirst({
            where: eq(resellers.id, resellerId),
            with: { user: true },
        });

        if (!reseller) {
            return { isRisky: false, riskScore: 0, flags: [], shouldBlock: false };
        }

        // === FRAUD CHECK 1: Self-Order Detection ===
        // Check if buyer email matches reseller email
        if (reseller.user && buyerEmail.toLowerCase() === reseller.user.email.toLowerCase()) {
            flags.push("SELF_ORDER_EMAIL");
            riskScore += 50;
        }

        // Check if buyer phone matches reseller phone
        if (reseller.user && buyerPhone && reseller.user.phone === buyerPhone) {
            flags.push("SELF_ORDER_PHONE");
            riskScore += 40;
        }

        // === FRAUD CHECK 2: IP Matching ===
        // Check if same IP was used by reseller recently
        const recentResellerClicks = await db.query.resellerClicks.findFirst({
            where: and(
                eq(resellerClicks.ipAddress, buyerIp),
                eq(resellerClicks.linkId, (await db.query.resellerLinks.findFirst({
                    where: eq(resellerLinks.resellerId, resellerId),
                }))?.id || -1)
            ),
        });

        if (recentResellerClicks) {
            flags.push("SAME_IP_AS_RESELLER");
            riskScore += 30;
        }

        // === FRAUD CHECK 3: Velocity Check ===
        // Check number of orders today from this reseller
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [todayOrderCount] = await db
            .select({ count: count() })
            .from(orders)
            .innerJoin(resellerLinks, sql`true`) // Join through commission tracking
            .where(and(
                eq(resellerLinks.resellerId, resellerId),
                gte(orders.createdAt, today)
            ));

        const dailyOrders = todayOrderCount?.count || 0;

        // Get tier-based daily limit
        const tierLimits: Record<string, number> = {
            bronze: 5,
            silver: 15,
            gold: 30,
            platinum: 50,
        };
        const dailyLimit = tierLimits[reseller.tier] || 5;

        if (dailyOrders >= dailyLimit) {
            flags.push("VELOCITY_LIMIT_EXCEEDED");
            riskScore += 25;
        } else if (dailyOrders >= dailyLimit * 0.8) {
            flags.push("VELOCITY_WARNING");
            riskScore += 10;
        }

        // === FRAUD CHECK 4: New Reseller High Activity ===
        // If reseller is less than 7 days old with high activity
        const resellerAge = reseller.createdAt ?
            (Date.now() - new Date(reseller.createdAt).getTime()) / (1000 * 60 * 60 * 24) : 0;

        if (resellerAge < 7 && dailyOrders > 3) {
            flags.push("NEW_RESELLER_HIGH_ACTIVITY");
            riskScore += 20;
        }

        // === FRAUD CHECK 5: Multiple Orders Same Device Fingerprint ===
        // This would require device fingerprint from the order, simplified here

        // Calculate final result
        const isRisky = riskScore >= this.RISK_THRESHOLD;
        const shouldBlock = riskScore >= this.BLOCK_THRESHOLD;

        // Update reseller risk score if risky
        if (isRisky && reseller.riskScore < riskScore) {
            await db.update(resellers)
                .set({
                    riskScore,
                    isFlagged: shouldBlock,
                    flagReason: shouldBlock ? flags.join(", ") : null,
                })
                .where(eq(resellers.id, resellerId));
        }

        return {
            isRisky,
            riskScore,
            flags,
            shouldBlock,
        };
    }

    /**
     * Check if payout is potentially fraudulent
     */
    async checkPayoutFraud(resellerId: number, amount: number): Promise<FraudCheckResult> {
        const flags: string[] = [];
        let riskScore = 0;

        const reseller = await db.query.resellers.findFirst({
            where: eq(resellers.id, resellerId),
        });

        if (!reseller) {
            return { isRisky: true, riskScore: 100, flags: ["RESELLER_NOT_FOUND"], shouldBlock: true };
        }

        // === CHECK 1: High payout relative to lifetime ===
        const lifetimeEarnings = parseFloat(reseller.totalEarnings) + parseFloat(reseller.pendingPayout);
        if (amount > lifetimeEarnings * 0.5) {
            flags.push("HIGH_PAYOUT_RATIO");
            riskScore += 20;
        }

        // === CHECK 2: Rapid payout requests ===
        const recentPayouts = await db.query.resellerPayouts.findMany({
            where: and(
                eq(resellers.id, resellerId),
                gte(resellers.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
            ),
            limit: 5,
        });

        if (recentPayouts.length >= 3) {
            flags.push("RAPID_PAYOUT_REQUESTS");
            riskScore += 25;
        }

        // === CHECK 3: Reseller already flagged ===
        if (reseller.isFlagged) {
            flags.push("RESELLER_FLAGGED");
            riskScore += 40;
        }

        // === CHECK 4: High risk score history ===
        if (reseller.riskScore >= 50) {
            flags.push("HIGH_HISTORICAL_RISK");
            riskScore += 20;
        }

        // === CHECK 5: New reseller requesting payout ===
        const resellerAge = reseller.createdAt ?
            (Date.now() - new Date(reseller.createdAt).getTime()) / (1000 * 60 * 60 * 24) : 0;

        if (resellerAge < 14) {
            flags.push("NEW_RESELLER_PAYOUT");
            riskScore += 15;
        }

        return {
            isRisky: riskScore >= this.RISK_THRESHOLD,
            riskScore,
            flags,
            shouldBlock: riskScore >= this.BLOCK_THRESHOLD,
        };
    }

    /**
     * Review and clear flagged reseller
     */
    async clearFlag(resellerId: number): Promise<Reseller> {
        const [updated] = await db.update(resellers)
            .set({
                isFlagged: false,
                flagReason: null,
                riskScore: 0,
            })
            .where(eq(resellers.id, resellerId))
            .returning();

        return updated;
    }

    /**
     * Get flagged resellers for admin review
     */
    async getFlaggedResellers(): Promise<Reseller[]> {
        return await db.query.resellers.findMany({
            where: eq(resellers.isFlagged, true),
            orderBy: desc(resellers.riskScore),
        });
    }

    /**
     * Get high-risk resellers (score > 50 but not flagged)
     */
    async getHighRiskResellers(): Promise<Reseller[]> {
        return await db.query.resellers.findMany({
            where: and(
                eq(resellers.isFlagged, false),
                gte(resellers.riskScore, 50)
            ),
            orderBy: desc(resellers.riskScore),
        });
    }
}

export const fraudDetectionService = new FraudDetectionService();
