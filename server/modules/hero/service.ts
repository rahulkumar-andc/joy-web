import { heroCampaignRepository, type CampaignSelectionCriteria } from "./repository";
import type { HeroCampaign, InsertHeroCampaign } from "@shared/schema";
import { logger } from "../../logger";

/**
 * Campaign data transfer object for API responses
 * Separates internal DB fields from public API contract
 */
export interface CampaignDTO {
    id: number;
    name: string;
    type: string;
    media: {
        type: 'image' | 'video';
        url: string;
    };
    content: {
        title: string;
        subtitle: string | null;
        cta: {
            label: string | null;
            href: string | null;
        };
        endTime: Date | string | null;
    };
    ui: {
        alignment: 'left' | 'center' | 'right';
        overlayOpacity: number;
        textColor: string;
    };
}

/**
 * Transform database model to API DTO
 */
function toCampaignDTO(campaign: HeroCampaign): CampaignDTO {
    return {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        media: {
            type: campaign.mediaType as 'image' | 'video',
            url: campaign.mediaUrl,
        },
        content: {
            title: campaign.title,
            subtitle: campaign.subtitle,
            cta: {
                label: campaign.ctaLabel,
                href: campaign.ctaUrl,
            },
            endTime: campaign.endTime,
        },
        ui: {
            alignment: campaign.contentAlignment as 'left' | 'center' | 'right',
            overlayOpacity: Number(campaign.overlayOpacity),
            textColor: campaign.textColor,
        },
    };
}

/**
 * HeroService
 * Business logic layer for hero campaigns
 * Transforms data between database and API formats
 */
export class HeroService {
    /**
     * Get active campaign for the given user context
     */
    async getActiveCampaign(criteria: CampaignSelectionCriteria): Promise<CampaignDTO | null>;
    async getActiveCampaign(isLoggedIn: boolean, currentTime?: Date): Promise<CampaignDTO | null>;
    async getActiveCampaign(
        criteriaOrIsLoggedIn: CampaignSelectionCriteria | boolean,
        currentTime?: Date
    ): Promise<CampaignDTO | null> {
        // Normalize arguments to the repository's expected format
        const isLoggedIn = typeof criteriaOrIsLoggedIn === "boolean"
            ? criteriaOrIsLoggedIn
            : criteriaOrIsLoggedIn.isLoggedIn;
        
        const effectiveCurrentTime = typeof criteriaOrIsLoggedIn === "boolean"
            ? currentTime
            : criteriaOrIsLoggedIn.currentTime;

        const campaign = await heroCampaignRepository.findActiveCampaign(isLoggedIn, effectiveCurrentTime);
    
        if (!campaign) {
            logger.debug({
                message: "No active campaign found",
                isLoggedIn,
            });
            return null;
        }
    
        return toCampaignDTO(campaign);
    }

    /**
     * Get all campaigns for admin
     */
    async getAllCampaigns(): Promise<HeroCampaign[]> {
        return heroCampaignRepository.findAll();
    }

    /**
     * Get single campaign by ID
     */
    async getCampaignById(id: number): Promise<HeroCampaign | undefined> {
        return heroCampaignRepository.findById(id);
    }

    /**
     * Create a new campaign
     */
    async createCampaign(data: InsertHeroCampaign): Promise<HeroCampaign> {
        logger.info({
            message: "Creating new campaign",
            name: data.name,
            type: data.type,
        });
        return heroCampaignRepository.create(data);
    }

    /**
     * Update an existing campaign
     */
    async updateCampaign(id: number, data: Partial<InsertHeroCampaign>): Promise<HeroCampaign | undefined> {
        logger.info({
            message: "Updating campaign",
            id,
            updates: Object.keys(data),
        });
        return heroCampaignRepository.update(id, data);
    }

    /**
     * Delete a campaign
     * Returns false if attempting to delete default campaign
     */
    async deleteCampaign(id: number): Promise<{ success: boolean; error?: string }> {
        const campaign = await heroCampaignRepository.findById(id);
        
        if (!campaign) {
            return { success: false, error: "Campaign not found" };
        }

        if (campaign.type === 'default') {
            return { success: false, error: "Cannot delete a Default campaign. Deactivate it instead." };
        }

        await heroCampaignRepository.delete(id);
        return { success: true };
    }

    /**
     * Toggle campaign active status
     */
    async toggleCampaignStatus(id: number, isActive: boolean): Promise<HeroCampaign | undefined> {
        return heroCampaignRepository.toggleActive(id, isActive);
    }
}

// Singleton instance
export const heroService = new HeroService();

/**
 * Default campaign configuration
 * Used when no campaigns are active or for fallback
 */
export const DEFAULT_CAMPAIGN_CONFIG: InsertHeroCampaign = {
    name: "Default Campaign",
    type: "default",
    priority: 0,
    isActive: true,
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=3870&auto=format&fit=crop",
    title: "Elevate Your Style",
    subtitle: "Discover the new collection defined by elegance and comfort.",
    ctaLabel: "Shop Collection",
    ctaUrl: "/shop",
    contentAlignment: "left",
    textColor: "#ffffff",
    overlayOpacity: "0.4",
    targetAudience: "all",
};

/**
 * Initialize hero system with default campaign if none exists
 */
export async function initializeHeroSystem(): Promise<void> {
    try {
        const hasDefault = await heroCampaignRepository.hasDefaultCampaign();
        
        if (!hasDefault) {
            logger.info("Hero System: No default campaign found. Creating default campaign...");
            await heroCampaignRepository.create(DEFAULT_CAMPAIGN_CONFIG);
            logger.info("Hero System: Default campaign created successfully.");
        } else {
            logger.debug("Hero System: Default campaign already exists.");
        }
    } catch (error) {
        logger.error({
            message: "Hero System initialization failed",
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

