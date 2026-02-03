import { db } from "@server/db";
import { campaignPersonalization, type CampaignPersonalization } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * User context for personalization
 */
export interface UserContext {
    isLoggedIn: boolean;
    userId?: number;
    country?: string; // ISO country code
    device: "mobile" | "desktop" | "tablet";
    cartValue?: number;
    userSegment?: "new" | "returning" | "vip";
    previousPurchases?: number;
}

/**
 * Detect device type from user agent
 */
export function detectDeviceType(userAgent: string): "mobile" | "desktop" | "tablet" {
    const ua = userAgent.toLowerCase();

    if (/tablet|ipad|playbook|silk/i.test(ua)) {
        return "tablet";
    }
    if (/mobile|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
        return "mobile";
    }
    return "desktop";
}

/**
 * Personalization Repository
 */
export class PersonalizationRepository {
    /**
     * Get personalization rules for a campaign
     */
    async getPersonalization(campaignId: number): Promise<CampaignPersonalization | undefined> {
        const [result] = await db
            .select()
            .from(campaignPersonalization)
            .where(eq(campaignPersonalization.campaignId, campaignId));
        return result;
    }

    /**
     * Create personalization rules
     */
    async createPersonalization(data: Omit<CampaignPersonalization, "id" | "createdAt">): Promise<CampaignPersonalization> {
        const [result] = await db
            .insert(campaignPersonalization)
            .values(data)
            .returning();
        return result;
    }

    /**
     * Update personalization rules
     */
    async updatePersonalization(campaignId: number, data: Partial<CampaignPersonalization>): Promise<CampaignPersonalization | undefined> {
        const [result] = await db
            .update(campaignPersonalization)
            .set(data)
            .where(eq(campaignPersonalization.campaignId, campaignId))
            .returning();
        return result;
    }

    /**
     * Check if a campaign matches user context
     */
    async matchesCampaign(campaignId: number, userContext: UserContext): Promise<boolean> {
        const rules = await this.getPersonalization(campaignId);

        // No rules = matches everyone
        if (!rules) return true;

        // Check geo targeting
        if (rules.geoTargets && rules.geoTargets.length > 0) {
            if (!userContext.country || !rules.geoTargets.includes(userContext.country)) {
                return false;
            }
        }

        // Check device targeting
        if (rules.deviceTargets && rules.deviceTargets.length > 0) {
            if (!rules.deviceTargets.includes(userContext.device)) {
                return false;
            }
        }

        // Check cart value
        if (rules.minCartValue && userContext.cartValue !== undefined) {
            if (userContext.cartValue < parseFloat(rules.minCartValue)) {
                return false;
            }
        }
        if (rules.maxCartValue && userContext.cartValue !== undefined) {
            if (userContext.cartValue > parseFloat(rules.maxCartValue)) {
                return false;
            }
        }

        // Check user segment
        if (rules.userSegments && rules.userSegments.length > 0) {
            if (!userContext.userSegment || !rules.userSegments.includes(userContext.userSegment)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Filter campaigns by user context
     */
    async filterCampaignsByContext(campaignIds: number[], userContext: UserContext): Promise<number[]> {
        const matches: number[] = [];

        for (const campaignId of campaignIds) {
            if (await this.matchesCampaign(campaignId, userContext)) {
                matches.push(campaignId);
            }
        }

        return matches;
    }
}

export const personalizationRepository = new PersonalizationRepository();
