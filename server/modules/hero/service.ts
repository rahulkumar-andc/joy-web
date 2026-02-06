import { heroCampaignRepository, type CampaignSelectionCriteria } from "./repository";
import type { HeroCampaign, InsertHeroCampaign, CampaignReview } from "@shared/schema";
import { logger } from "@server/logger";
import fs from "fs";

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
        // Positioning (Offsets in px)
        titleOffsetX: number;
        titleOffsetY: number;
        subtitleOffsetX: number;
        subtitleOffsetY: number;
        ctaOffsetX: number;
        ctaOffsetY: number;
        countdownOffsetX: number;
        countdownOffsetY: number;
        // New Styling Fields
        titleFontSize?: number | null;
        subtitleFontSize?: number | null;
        fontWeight: 'normal' | 'bold';
        overlayColor: 'black' | 'gradient' | 'brand';
        deviceTarget: 'all' | 'desktop' | 'mobile';
        enableAnalytics: boolean;
        secondaryCta: {
            label: string | null;
            href: string | null;
        };
    }
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
            titleOffsetX: campaign.titleOffsetX ?? 0,
            titleOffsetY: campaign.titleOffsetY ?? 0,
            subtitleOffsetX: campaign.subtitleOffsetX ?? 0,
            subtitleOffsetY: campaign.subtitleOffsetY ?? 0,
            ctaOffsetX: campaign.ctaOffsetX ?? 0,
            ctaOffsetY: campaign.ctaOffsetY ?? 0,
            countdownOffsetX: campaign.countdownOffsetX ?? 0,
            countdownOffsetY: campaign.countdownOffsetY ?? 0,
            // New Styling Mapping
            titleFontSize: campaign.titleFontSize,
            subtitleFontSize: campaign.subtitleFontSize,
            fontWeight: (campaign.fontWeight as 'normal' | 'bold') ?? 'normal',
            overlayColor: (campaign.overlayColor as 'black' | 'gradient' | 'brand') ?? 'black',
            deviceTarget: (campaign.deviceTarget as 'all' | 'desktop' | 'mobile') ?? 'all',
            enableAnalytics: campaign.enableAnalytics ?? false,
            secondaryCta: {
                label: campaign.secondaryCtaLabel,
                href: campaign.secondaryCtaUrl
            }
        }
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
     * Get all active campaigns for carousel
     */
    async getActiveCampaigns(criteria: CampaignSelectionCriteria): Promise<CampaignDTO[]>;
    async getActiveCampaigns(isLoggedIn: boolean, currentTime?: Date): Promise<CampaignDTO[]>;
    async getActiveCampaigns(
        criteriaOrIsLoggedIn: CampaignSelectionCriteria | boolean,
        currentTime?: Date
    ): Promise<CampaignDTO[]> {
        const isLoggedIn = typeof criteriaOrIsLoggedIn === "boolean"
            ? criteriaOrIsLoggedIn
            : criteriaOrIsLoggedIn.isLoggedIn;

        const effectiveCurrentTime = typeof criteriaOrIsLoggedIn === "boolean"
            ? currentTime
            : criteriaOrIsLoggedIn.currentTime;

        const campaigns = await heroCampaignRepository.findActiveCampaigns(isLoggedIn, effectiveCurrentTime);
        return campaigns.map(toCampaignDTO);
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
     * Handles cleanup of old media files if they are replaced
     */
    async updateCampaign(id: number, data: Partial<InsertHeroCampaign>): Promise<HeroCampaign | undefined> {
        // Fetch current state to check for existing media
        const currentCampaign = await heroCampaignRepository.findById(id);

        if (currentCampaign) {
            // Check if we are replacing an uploaded file
            const isReplacingMedia = data.mediaSource && (data.mediaSource !== currentCampaign.mediaSource || (data.mediaFilePath && data.mediaFilePath !== currentCampaign.mediaFilePath));
            const isSwitchingToUrl = data.mediaSource === 'url' && currentCampaign.mediaSource === 'upload';

            if ((isReplacingMedia || isSwitchingToUrl) && currentCampaign.mediaSource === 'upload' && currentCampaign.mediaFilePath) {
                await this.deleteFileIfExists(currentCampaign.mediaFilePath);
            }
        }

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

        // Clean up associated media file if it exists
        if (campaign.mediaSource === 'upload' && campaign.mediaFilePath) {
            await this.deleteFileIfExists(campaign.mediaFilePath);
        }

        await heroCampaignRepository.delete(id);
        return { success: true };
    }

    /**
     * Helper to safely delete files
     */
    private async deleteFileIfExists(filePath: string): Promise<void> {
        try {
            // Ensure we are only deleting files within the uploads directory for security
            // Simple check: filePath should not contain '..' and should be relative or absolute path we control
            // For now, assuming standard usage of fs.unlink
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
                logger.info({ message: "Deleted campaign media file", filePath });
            }
        } catch (error) {
            logger.warn({ message: "Failed to delete media file during cleanup", filePath, error });
            // Swallow error to allow DB operation to proceed
        }
    }

    /**
     * Toggle campaign active status
     */
    async toggleCampaignStatus(id: number, isActive: boolean): Promise<HeroCampaign | undefined> {
        return heroCampaignRepository.toggleActive(id, isActive);
    }

    /**
     * Get all campaigns with analytics data
     */
    /**
     * Get all campaigns with analytics data and review status
     */
    async getAllCampaignsWithStats(): Promise<(HeroCampaign & { stats: { impressions: number; clicks: number }; review?: CampaignReview })[]> {
        const campaigns = await heroCampaignRepository.findAll();
        const analytics = await heroCampaignRepository.getCampaignAnalytics();
        const reviews = await heroCampaignRepository.getLatestReviews();

        return campaigns.map(c => ({
            ...c,
            stats: analytics[c.id] || { impressions: 0, clicks: 0 },
            review: reviews[c.id]
        }));
    }

    /**
     * Review a campaign (approve/reject)
     */
    async reviewCampaign(campaignId: number, status: "approved" | "rejected", reviewNotes?: string, reviewerId?: number): Promise<CampaignReview> {
        return heroCampaignRepository.createReview({
            campaignId,
            status,
            reviewNotes,
            reviewerId
        });
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
    mediaSource: "url",
    mediaUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=3870&auto=format&fit=crop",
    title: "Elevate Your Style",
    subtitle: "Discover the new collection defined by elegance and comfort.",
    ctaLabel: "Shop Collection",
    ctaUrl: "/shop",
    contentAlignment: "left",
    textColor: "#ffffff",
    overlayOpacity: "0.4",
    targetAudience: "all",
    titleOffsetX: 0,
    titleOffsetY: 0,
    subtitleOffsetX: 0,
    subtitleOffsetY: 50,
    ctaOffsetX: 0,
    ctaOffsetY: 100,
    countdownOffsetX: 0,
    countdownOffsetY: -100,
    // New Defaults
    fontWeight: "normal",
    overlayColor: "black",
    deviceTarget: "all",
    enableAnalytics: false,
    impressionCount: 0,
    clickCount: 0,
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

