import { db } from "../../db";
import { campaignVariants, variantAnalytics, type CampaignVariant, type InsertCampaignVariant } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

/**
 * A/B Testing Repository
 * Handles variant selection, tracking, and performance analysis
 */
export class ABTestingRepository {
    /**
     * Get all variants for a campaign
     */
    async getVariants(campaignId: number): Promise<CampaignVariant[]> {
        return db
            .select()
            .from(campaignVariants)
            .where(eq(campaignVariants.campaignId, campaignId))
            .orderBy(desc(campaignVariants.trafficPercentage));
    }

    /**
     * Get active variants for a campaign
     */
    async getActiveVariants(campaignId: number): Promise<CampaignVariant[]> {
        return db
            .select()
            .from(campaignVariants)
            .where(
                sql`${campaignVariants.campaignId} = ${campaignId} AND ${campaignVariants.isActive} = true`
            )
            .orderBy(desc(campaignVariants.trafficPercentage));
    }

    /**
     * Select a random variant based on traffic percentages
     * Uses weighted random selection
     */
    async selectRandomVariant(campaignId: number): Promise<CampaignVariant | null> {
        const variants = await this.getActiveVariants(campaignId);

        if (variants.length === 0) return null;
        if (variants.length === 1) return variants[0];

        // Calculate total weight
        const totalWeight = variants.reduce((sum, v) => sum + v.trafficPercentage, 0);
        let random = Math.random() * totalWeight;

        for (const variant of variants) {
            random -= variant.trafficPercentage;
            if (random <= 0) return variant;
        }

        return variants[0]; // Fallback
    }

    /**
     * Record an analytics event for a variant
     */
    async recordEvent(
        variantId: number,
        campaignId: number,
        eventType: "impression" | "click" | "conversion",
        sessionId?: string
    ): Promise<void> {
        await db.insert(variantAnalytics).values({
            variantId,
            campaignId,
            eventType,
            sessionId,
        });
    }

    /**
     * Get CTR (Click-Through Rate) for a variant
     * CTR = clicks / impressions * 100
     */
    async getVariantCTR(variantId: number): Promise<{ impressions: number; clicks: number; ctr: number }> {
        const [result] = await db
            .select({
                impressions: sql<number>`COUNT(CASE WHEN ${variantAnalytics.eventType} = 'impression' THEN 1 END)`,
                clicks: sql<number>`COUNT(CASE WHEN ${variantAnalytics.eventType} = 'click' THEN 1 END)`,
            })
            .from(variantAnalytics)
            .where(eq(variantAnalytics.variantId, variantId));

        const impressions = Number(result?.impressions || 0);
        const clicks = Number(result?.clicks || 0);
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

        return { impressions, clicks, ctr };
    }

    /**
     * Get the winning variant (highest CTR with minimum impressions)
     */
    async getWinningVariant(campaignId: number, minImpressions: number = 100): Promise<CampaignVariant | null> {
        const variants = await this.getActiveVariants(campaignId);

        let winner: CampaignVariant | null = null;
        let bestCTR = -1;

        for (const variant of variants) {
            const stats = await this.getVariantCTR(variant.id);

            if (stats.impressions >= minImpressions && stats.ctr > bestCTR) {
                bestCTR = stats.ctr;
                winner = variant;
            }
        }

        return winner;
    }

    /**
     * Get detailed stats for all variants of a campaign
     */
    async getCampaignVariantStats(campaignId: number): Promise<Array<CampaignVariant & { stats: { impressions: number; clicks: number; ctr: number } }>> {
        const variants = await this.getVariants(campaignId);

        return Promise.all(
            variants.map(async (variant) => ({
                ...variant,
                stats: await this.getVariantCTR(variant.id),
            }))
        );
    }

    /**
     * Create a new variant
     */
    async createVariant(data: InsertCampaignVariant): Promise<CampaignVariant> {
        const [variant] = await db
            .insert(campaignVariants)
            .values(data)
            .returning();
        return variant;
    }

    /**
     * Update a variant
     */
    async updateVariant(id: number, data: Partial<InsertCampaignVariant>): Promise<CampaignVariant | undefined> {
        const [variant] = await db
            .update(campaignVariants)
            .set(data)
            .where(eq(campaignVariants.id, id))
            .returning();
        return variant;
    }

    /**
     * Delete a variant
     */
    async deleteVariant(id: number): Promise<void> {
        await db.delete(campaignVariants).where(eq(campaignVariants.id, id));
    }

    /**
     * Auto-promote winning variant
     * Deactivates losing variants and sets winner to 100% traffic
     */
    async autoPromoteWinner(campaignId: number, minImpressions: number = 100): Promise<CampaignVariant | null> {
        const winner = await this.getWinningVariant(campaignId, minImpressions);

        if (!winner) return null;

        // Deactivate all other variants
        await db
            .update(campaignVariants)
            .set({ isActive: false })
            .where(
                sql`${campaignVariants.campaignId} = ${campaignId} AND ${campaignVariants.id} != ${winner.id}`
            );

        // Set winner to 100% traffic
        await this.updateVariant(winner.id, { trafficPercentage: 100 });

        return winner;
    }
}

export const abTestingRepository = new ABTestingRepository();
