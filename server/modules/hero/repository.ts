import { db } from "../../db";
import { heroCampaigns, type InsertHeroCampaign, type HeroCampaign } from "@shared/schema";
import { eq, desc, and, or, isNull, lte, gte, inArray } from "drizzle-orm";

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
}

// Singleton instance for dependency injection
export const heroCampaignRepository = new HeroCampaignRepository();

