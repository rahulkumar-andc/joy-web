/**
 * Shipping Settings Service
 * 
 * Centralized service for all shipping calculations and settings management.
 * Features:
 * - In-memory caching with automatic invalidation
 * - RBAC-controlled updates
 * - Full audit trail
 * - Priority-based shipping calculation
 */

import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import {
    shippingSettings,
    shippingSettingsAudit,
    ShippingSetting,
    ShippingSettingKeys,
    ShippingSettingKey,
} from "@shared/shipping-schema";
import { logger } from "../logger";
import { Request } from "express";

// ============================================================================
// TYPES
// ============================================================================

export interface ShippingCalculationResult {
    shippingCost: number;
    isFree: boolean;
    reason: ShippingFreeReason;
    appliedThreshold?: number;
}

export type ShippingFreeReason =
    | "always_free_threshold"
    | "festive_mode"
    | "normal_threshold"
    | "global_override"
    | "not_free";

interface CachedSettings {
    settings: Map<string, ShippingSetting>;
    loadedAt: number;
}

// ============================================================================
// SHIPPING SETTINGS SERVICE
// ============================================================================

class ShippingSettingsService {
    private cache: CachedSettings | null = null;
    private readonly CACHE_TTL_MS = 60 * 1000; // 1 minute cache

    // ========================================================================
    // SETTINGS RETRIEVAL
    // ========================================================================

    /**
     * Get all shipping settings (cached)
     */
    async getAllSettings(): Promise<Map<string, ShippingSetting>> {
        if (this.isCacheValid()) {
            return this.cache!.settings;
        }

        const settings = await db.select().from(shippingSettings);
        const settingsMap = new Map<string, ShippingSetting>();

        for (const setting of settings) {
            settingsMap.set(setting.key, setting);
        }

        this.cache = {
            settings: settingsMap,
            loadedAt: Date.now(),
        };

        logger.debug("[ShippingSettings] Cache refreshed", { count: settings.length });
        return settingsMap;
    }

    /**
     * Get a single setting value
     */
    async getSetting(key: ShippingSettingKey): Promise<string | null> {
        const settings = await this.getAllSettings();
        return settings.get(key)?.value ?? null;
    }

    /**
     * Get setting with metadata (for admin panel)
     */
    async getSettingWithMeta(key: ShippingSettingKey): Promise<ShippingSetting | null> {
        const settings = await this.getAllSettings();
        return settings.get(key) ?? null;
    }

    /**
     * Get all settings formatted for API response
     */
    async getSettingsForApi(): Promise<Record<string, any>> {
        const settings = await this.getAllSettings();
        const result: Record<string, any> = {};

        settings.forEach((setting, key) => {
            result[key] = {
                value: setting.value,
                description: setting.description,
                allowedValues: setting.allowedValues,
                minRoleLevel: setting.minRoleLevel,
                updatedAt: setting.updatedAt,
            };
        });

        return result;
    }

    // ========================================================================
    // SHIPPING CALCULATION (Core Business Logic)
    // ========================================================================

    /**
     * Calculate shipping cost for an order
     * Priority order:
     * 1. Global override → Free
     * 2. Always free threshold (₹999+) → Free
     * 3. Festive mode + threshold → Free
     * 4. Normal threshold → Free
     * 5. Default cost
     */
    async calculateShipping(orderTotal: number): Promise<ShippingCalculationResult> {
        const settings = await this.getAllSettings();

        // Helper to get numeric value
        const getNum = (key: string): number => {
            const val = settings.get(key)?.value;
            return val ? parseFloat(val) : 0;
        };

        // Helper to get boolean value
        const getBool = (key: string): boolean => {
            return settings.get(key)?.value === "true";
        };

        // 1. Check global override first
        if (getBool(ShippingSettingKeys.GLOBAL_FREE_SHIPPING_OVERRIDE)) {
            return {
                shippingCost: 0,
                isFree: true,
                reason: "global_override",
            };
        }

        // 2. Check always-free threshold (highest priority, ignores other settings)
        const alwaysFreeThreshold = getNum(ShippingSettingKeys.ALWAYS_FREE_THRESHOLD);
        if (orderTotal >= alwaysFreeThreshold) {
            return {
                shippingCost: 0,
                isFree: true,
                reason: "always_free_threshold",
                appliedThreshold: alwaysFreeThreshold,
            };
        }

        // 3. Check if free shipping is enabled
        const freeShippingEnabled = getBool(ShippingSettingKeys.FREE_SHIPPING_ENABLED);
        if (!freeShippingEnabled) {
            // Free shipping disabled - return default cost
            return {
                shippingCost: getNum(ShippingSettingKeys.DEFAULT_SHIPPING_COST),
                isFree: false,
                reason: "not_free",
            };
        }

        // 4. Check festive mode
        const festiveEnabled = getBool(ShippingSettingKeys.FESTIVE_MODE_ENABLED);
        if (festiveEnabled) {
            const festiveThreshold = getNum(ShippingSettingKeys.FESTIVE_THRESHOLD);
            if (orderTotal >= festiveThreshold) {
                return {
                    shippingCost: 0,
                    isFree: true,
                    reason: "festive_mode",
                    appliedThreshold: festiveThreshold,
                };
            }
        }

        // 5. Check normal threshold
        const normalThreshold = getNum(ShippingSettingKeys.FREE_SHIPPING_THRESHOLD);
        if (orderTotal >= normalThreshold) {
            return {
                shippingCost: 0,
                isFree: true,
                reason: "normal_threshold",
                appliedThreshold: normalThreshold,
            };
        }

        // 6. Default shipping cost
        return {
            shippingCost: getNum(ShippingSettingKeys.DEFAULT_SHIPPING_COST),
            isFree: false,
            reason: "not_free",
        };
    }

    // ========================================================================
    // SETTINGS UPDATE (With RBAC & Audit)
    // ========================================================================

    /**
     * Update a shipping setting
     * @param key - Setting key
     * @param value - New value
     * @param userId - User making the change
     * @param userRoleLevel - User's hierarchy level (1 = Super Admin)
     * @param req - Express request for audit metadata
     */
    async updateSetting(
        key: ShippingSettingKey,
        value: string,
        userId: number,
        userRoleLevel: number,
        req?: Request
    ): Promise<{ success: boolean; error?: string }> {
        // Get current setting
        const setting = await this.getSettingWithMeta(key);
        if (!setting) {
            return { success: false, error: `Setting "${key}" not found` };
        }

        // RBAC check: Verify user has permission
        if (userRoleLevel > (setting.minRoleLevel ?? 1)) {
            return {
                success: false,
                error: `Insufficient permissions. Required level: ${setting.minRoleLevel}`,
            };
        }

        // If setting has allowed values, validate the new value
        if (setting.allowedValues && Array.isArray(setting.allowedValues)) {
            // Business Admin must choose from allowed values
            if (userRoleLevel > 1 && !setting.allowedValues.includes(value)) {
                return {
                    success: false,
                    error: `Value must be one of: ${setting.allowedValues.join(", ")}`,
                };
            }
        }

        const oldValue = setting.value;

        try {
            // Update setting
            await db
                .update(shippingSettings)
                .set({
                    value,
                    updatedAt: new Date(),
                    updatedBy: userId,
                })
                .where(eq(shippingSettings.key, key));

            // Create audit log entry
            await db.insert(shippingSettingsAudit).values({
                settingKey: key,
                oldValue,
                newValue: value,
                changedBy: userId,
                ipAddress: req?.ip ?? null,
                userAgent: req?.get("user-agent") ?? null,
            });

            // Invalidate cache
            this.invalidateCache();

            logger.info(`[ShippingSettings] Setting updated`, {
                key,
                oldValue,
                newValue: value,
                changedBy: userId,
            });

            return { success: true };
        } catch (error) {
            logger.error(`[ShippingSettings] Update failed`, { key, error });
            return { success: false, error: "Database update failed" };
        }
    }

    /**
     * Get allowed values for Business Admin dropdown
     */
    async getAllowedValues(key: ShippingSettingKey): Promise<string[] | null> {
        const setting = await this.getSettingWithMeta(key);
        return setting?.allowedValues ?? null;
    }

    // ========================================================================
    // AUDIT LOG
    // ========================================================================

    /**
     * Get audit log entries
     */
    async getAuditLog(options?: {
        key?: string;
        limit?: number;
        offset?: number;
    }): Promise<any[]> {
        let query = db
            .select()
            .from(shippingSettingsAudit)
            .orderBy(desc(shippingSettingsAudit.changedAt))
            .limit(options?.limit ?? 50)
            .offset(options?.offset ?? 0);

        if (options?.key) {
            query = query.where(eq(shippingSettingsAudit.settingKey, options.key)) as any;
        }

        return query;
    }

    // ========================================================================
    // CACHE MANAGEMENT
    // ========================================================================

    private isCacheValid(): boolean {
        if (!this.cache) return false;
        return Date.now() - this.cache.loadedAt < this.CACHE_TTL_MS;
    }

    /**
     * Invalidate the settings cache (call after updates)
     */
    invalidateCache(): void {
        this.cache = null;
        logger.debug("[ShippingSettings] Cache invalidated");
    }
}

// Export singleton instance
export const shippingSettingsService = new ShippingSettingsService();
