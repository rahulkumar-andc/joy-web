
import { db } from "@server/db";
import { heroCampaigns, heroAnalytics, campaignReviews, type InsertHeroCampaign, type HeroCampaign, type InsertCampaignReview, type CampaignReview } from "@shared/schema";
import { eq, desc, and, or, isNull, lte, gte, inArray } from "drizzle-orm";
import { logger } from "@server/logger";

/**
 * Target audience types for campaign targeting
 */
export type TargetAudience = "all" | "guest" | "user";

/**
 * Campaign selection criteria
 */
export interface CampaignSelectionCriteria {
    isLoggedIn: boolean;
    currentTime?: Date;
}

/**
 * HeroCampaignRepository
 * Data access layer for hero campaigns
 * Handles all database operations for campaigns with proper separation of concerns
 */
export class HeroCampaignRepository {
    /**
     * Find the active campaign based on user context and time windows
     * Supports both simple boolean and criteria object patterns
     */
    async findActiveCampaign(criteria: CampaignSelectionCriteria): Promise<HeroCampaign | undefined>;
    async findActiveCampaign(isLoggedIn: boolean, currentTime?: Date): Promise<HeroCampaign | undefined>;
    async findActiveCampaign(
        criteriaOrIsLoggedIn: CampaignSelectionCriteria | boolean,
        currentTime?: Date
    ): Promise<HeroCampaign | undefined> {
        const isLoggedIn = typeof criteriaOrIsLoggedIn === "boolean"
            ? criteriaOrIsLoggedIn
            : criteriaOrIsLoggedIn.isLoggedIn;
        const now = currentTime ?? (typeof criteriaOrIsLoggedIn === "boolean" ? new Date() : criteriaOrIsLoggedIn.currentTime ?? new Date());

        // Audience Filter: If logged in, show 'all' or 'user' campaigns
        // If guest, show 'all' or 'guest' campaigns
        const audienceFilter: TargetAudience[] = isLoggedIn ? ['all', 'user'] : ['all', 'guest'];

        const [activeCampaign] = await db
            .select()
            .from(heroCampaigns)
            .where(
                and(
                    eq(heroCampaigns.isActive, true),
                    inArray(heroCampaigns.targetAudience, audienceFilter),
                    or(
                        // Time window campaigns - current time is within window
                        and(
                            lte(heroCampaigns.startTime, now),
                            gte(heroCampaigns.endTime, now)
                        ),
                        // Default/Indefinite campaigns - no time constraints
                        and(
                            isNull(heroCampaigns.startTime),
                            isNull(heroCampaigns.endTime)
                        )
                    )
                )
            )
            .orderBy(desc(heroCampaigns.priority), desc(heroCampaigns.updatedAt))
            .limit(1);

        return activeCampaign;
    }

    /**
     * Find all active campaigns based on user context and time windows
     * Used for auto-carousel feature
     */
    async findActiveCampaigns(criteria: CampaignSelectionCriteria): Promise<HeroCampaign[]>;
    async findActiveCampaigns(isLoggedIn: boolean, currentTime?: Date): Promise<HeroCampaign[]>;
    async findActiveCampaigns(
        criteriaOrIsLoggedIn: CampaignSelectionCriteria | boolean,
        currentTime?: Date
    ): Promise<HeroCampaign[]> {
        const isLoggedIn = typeof criteriaOrIsLoggedIn === "boolean"
            ? criteriaOrIsLoggedIn
            : criteriaOrIsLoggedIn.isLoggedIn;
        const now = currentTime ?? (typeof criteriaOrIsLoggedIn === "boolean" ? new Date() : criteriaOrIsLoggedIn.currentTime ?? new Date());

        const audienceFilter: TargetAudience[] = isLoggedIn ? ['all', 'user'] : ['all', 'guest'];

        return db
            .select()
            .from(heroCampaigns)
            .where(
                and(
                    eq(heroCampaigns.isActive, true),
                    inArray(heroCampaigns.targetAudience, audienceFilter),
                    or(
                        and(
                            lte(heroCampaigns.startTime, now),
                            gte(heroCampaigns.endTime, now)
                        ),
                        and(
                            isNull(heroCampaigns.startTime),
                            isNull(heroCampaigns.endTime)
                        )
                    )
                )
            )
            .orderBy(desc(heroCampaigns.priority), desc(heroCampaigns.updatedAt));
    }

    /**
     * Get all campaigns ordered by priority (newest first for same priority)
     */
    async findAll(): Promise<HeroCampaign[]> {
        return db
            .select()
            .from(heroCampaigns)
            .orderBy(desc(heroCampaigns.priority), desc(heroCampaigns.updatedAt));
    }

    /**
     * Find a single campaign by ID
     */
    async findById(id: number): Promise<HeroCampaign | undefined> {
        const [campaign] = await db
            .select()
            .from(heroCampaigns)
            .where(eq(heroCampaigns.id, id));
        return campaign;
    }

    /**
     * Find a campaign by ID (non-nullable version for internal use)
     */
    async findByIdOrThrow(id: number): Promise<HeroCampaign> {
        const campaign = await this.findById(id);
        if (!campaign) {
            throw new Error(`Campaign with ID ${id} not found`);
        }
        return campaign;
    }

    /**
     * Create a new campaign
     */
    async create(data: InsertHeroCampaign): Promise<HeroCampaign> {
        const [campaign] = await db
            .insert(heroCampaigns)
            .values(data)
            .returning();
        return campaign;
    }

    /**
     * Update an existing campaign
     */
    async update(id: number, data: Partial<InsertHeroCampaign>): Promise<HeroCampaign | undefined> {
        const [campaign] = await db
            .update(heroCampaigns)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(heroCampaigns.id, id))
            .returning();
        return campaign;
    }

    /**
     * Delete a campaign by ID
     */
    async delete(id: number): Promise<HeroCampaign | undefined> {
        const [campaign] = await db
            .delete(heroCampaigns)
            .where(eq(heroCampaigns.id, id))
            .returning();
        return campaign;
    }

    /**
     * Toggle the active status of a campaign
     */
    async toggleActive(id: number, isActive: boolean): Promise<HeroCampaign | undefined> {
        const [campaign] = await db
            .update(heroCampaigns)
            .set({ isActive, updatedAt: new Date() })
            .where(eq(heroCampaigns.id, id))
            .returning();
        return campaign;
    }

    /**
     * Check if a default campaign exists
     */
    async hasDefaultCampaign(): Promise<boolean> {
        const campaigns = await db
            .select()
            .from(heroCampaigns)
            .where(eq(heroCampaigns.type, 'default'));
        return campaigns.length > 0;
    }

    /**
     * Get default campaign if it exists
     */
    async getDefaultCampaign(): Promise<HeroCampaign | undefined> {
        const [campaign] = await db
            .select()
            .from(heroCampaigns)
            .where(eq(heroCampaigns.type, 'default'));
        return campaign;
    }

    /**
     * Check if any campaign is active at the given time
     */
    async hasActiveCampaign(targetAudience?: TargetAudience, currentTime?: Date): Promise<boolean> {
        const now = currentTime ?? new Date();
        const audienceFilter: TargetAudience[] = targetAudience
            ? [targetAudience, 'all']
            : ['all', 'guest', 'user'];

        const campaigns = await db
            .select()
            .from(heroCampaigns)
            .where(
                and(
                    eq(heroCampaigns.isActive, true),
                    inArray(heroCampaigns.targetAudience, audienceFilter)
                )
            )
            .limit(1);

        return campaigns.length > 0;
    }
    /**
     * Get analytics statistics for all campaigns
     */
    async getCampaignAnalytics(): Promise<Record<number, { impressions: number; clicks: number }>> {
        const analytics = await db
            .select()
            .from(heroAnalytics);

        const stats: Record<number, { impressions: number; clicks: number }> = {};

        for (const entry of analytics) {
            // Skip entries with null campaignId
            if (entry.campaignId === null) continue;

            if (!stats[entry.campaignId]) {
                stats[entry.campaignId] = { impressions: 0, clicks: 0 };
            }
            if (entry.eventType === 'impression') {
                stats[entry.campaignId].impressions++;
            } else if (entry.eventType === 'click') {
                stats[entry.campaignId].clicks++;
            }
        }

        return stats;
    }

    /**
     * Get latest review for each campaign
     */
    async getLatestReviews(): Promise<Record<number, CampaignReview>> {
        // We want the latest review for each campaign
        // DISTINCT ON (campaign_id) ORDER BY campaign_id, created_at DESC
        // Drizzle doesn't support DISTINCT ON easily, so we might fetch all and reduce in memory
        // or use raw SQL. For now, fetch all reviews is okay if volume is low.
        // Better: Select distinct on query builder if possible.

        const allReviews = await db
            .select()
            .from(campaignReviews)
            .orderBy(desc(campaignReviews.createdAt));

        const latest: Record<number, CampaignReview> = {};

        for (const review of allReviews) {
            // Since we ordered by createdAt DESC, the first one we see is the latest
            if (!latest[review.campaignId]) {
                latest[review.campaignId] = review;
            }
        }

        return latest;
    }

    /**
     * Create a new campaign review
     */
    async createReview(data: InsertCampaignReview): Promise<CampaignReview> {
        const [review] = await db
            .insert(campaignReviews)
            .values(data)
            .returning();
        return review;
    }
}

// Singleton instance for dependency injection
export const heroCampaignRepository = new HeroCampaignRepository();
