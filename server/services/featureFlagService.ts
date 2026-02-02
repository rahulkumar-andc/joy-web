import { db } from '../db';
import { featureFlags, type FeatureFlag, type InsertFeatureFlag } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { cacheService, CacheTTL } from '../cache';
import { logger } from '../logger';

export class FeatureFlagService {
    /**
     * Check if feature is enabled for a user
     */
    async isEnabled(
        flagName: string,
        userId?: number,
        userRole?: string
    ): Promise<boolean> {
        try {
            // Try cache first
            const cacheKey = `feature_flag:${flagName}`;
            const cached = await cacheService.get<FeatureFlag>(cacheKey);

            let flag = cached;
            if (!flag) {
                const [result] = await db
                    .select()
                    .from(featureFlags)
                    .where(eq(featureFlags.name, flagName));

                if (!result) {
                    logger.warn(`Feature flag not found: ${flagName}`);
                    return false; // Default to disabled
                }

                flag = result;
                await cacheService.set(cacheKey, flag, CacheTTL.MEDIUM);
            }

            // Check if globally disabled
            if (!flag.enabled) {
                return false;
            }

            // Check user-based targeting
            if (flag.userIds && userId && flag.userIds.includes(userId)) {
                return true;
            }

            // Check role-based targeting
            if (flag.userRoles && userRole && flag.userRoles.includes(userRole)) {
                return true;
            }

            // Check rollout percentage
            if (flag.rolloutPercentage > 0) {
                // Deterministic hash-based rollout (consistent per user)
                if (userId) {
                    const hash = this.hashUserId(userId, flagName);
                    const bucket = hash % 100;
                    return bucket < flag.rolloutPercentage;
                }

                // For anonymous users, use random
                return Math.random() * 100 < flag.rolloutPercentage;
            }

            // If enabled but no targeting, available to all
            return flag.rolloutPercentage === 100 || (!flag.userIds && !flag.userRoles);
        } catch (error) {
            logger.error(`Feature flag check failed for ${flagName}`, error);
            return false; // Fail closed
        }
    }

    /**
     * Deterministic hash for consistent rollout
     */
    private hashUserId(userId: number, flagName: string): number {
        const str = `${userId}-${flagName}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Get all feature flags (admin)
     */
    async getAllFlags(): Promise<FeatureFlag[]> {
        return await db.select().from(featureFlags);
    }

    /**
     * Get single flag by ID
     */
    async getFlagById(id: number): Promise<FeatureFlag | undefined> {
        const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.id, id));
        return flag;
    }

    /**
     * Create feature flag
     */
    async createFlag(data: InsertFeatureFlag): Promise<FeatureFlag> {
        const [flag] = await db.insert(featureFlags).values(data).returning();
        await this.invalidateCache(flag.name);
        logger.info(`Feature flag created: ${flag.name}`, { flagId: flag.id });
        return flag;
    }

    /**
     * Update feature flag
     */
    async updateFlag(id: number, data: Partial<InsertFeatureFlag>): Promise<FeatureFlag> {
        const [flag] = await db
            .update(featureFlags)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(featureFlags.id, id))
            .returning();

        await this.invalidateCache(flag.name);
        logger.info(`Feature flag updated: ${flag.name}`, { flagId: flag.id, changes: Object.keys(data) });
        return flag;
    }

    /**
     * Delete feature flag
     */
    async deleteFlag(id: number): Promise<void> {
        const [flag] = await db
            .select()
            .from(featureFlags)
            .where(eq(featureFlags.id, id));

        if (flag) {
            await db.delete(featureFlags).where(eq(featureFlags.id, id));
            await this.invalidateCache(flag.name);
            logger.info(`Feature flag deleted: ${flag.name}`, { flagId: flag.id });
        }
    }

    /**
     * Invalidate flag cache
     */
    private async invalidateCache(flagName: string): Promise<void> {
        await cacheService.del(`feature_flag:${flagName}`);
    }

    /**
     * Get flags for client (only enabled flags with public info)
     * Returns map of flagName => isEnabled for current user
     */
    async getClientFlags(userId?: number, userRole?: string): Promise<Record<string, boolean>> {
        const flags = await this.getAllFlags();
        const result: Record<string, boolean> = {};

        for (const flag of flags) {
            result[flag.name] = await this.isEnabled(flag.name, userId, userRole);
        }

        return result;
    }
}

export const featureFlagService = new FeatureFlagService();
