/**
 * Shipping Settings Routes
 * 
 * Admin API endpoints for managing shipping configuration.
 * Implements RBAC-controlled access with full audit logging.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { restrictTo, requirePermission } from "../middleware/rbac";
import { shippingSettingsService } from "../services/shippingSettingsService";
import { ShippingSettingKeys, ShippingSettingKey } from "@shared/shipping-schema";
import { db } from "../db";
import { roles, userRoles } from "@shared/rbac-schema";
import { eq } from "drizzle-orm";

const router = Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user's hierarchy level from their roles
 */
async function getUserHierarchyLevel(userId: number): Promise<number> {
    const userRolesData = await db
        .select({ hierarchyLevel: roles.hierarchyLevel })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, userId));

    if (userRolesData.length === 0) {
        return 99; // No role = lowest priority
    }

    // Return the highest (lowest number = highest priority)
    return Math.min(...userRolesData.map(r => r.hierarchyLevel ?? 99));
}

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

/**
 * POST /api/shipping/calculate
 * Calculate shipping cost for checkout (public endpoint)
 */
router.post("/calculate", async (req: Request, res: Response) => {
    try {
        const { orderTotal } = z.object({
            orderTotal: z.number().nonnegative(),
        }).parse(req.body);

        const result = await shippingSettingsService.calculateShipping(orderTotal);

        res.json({
            shippingCost: result.shippingCost,
            isFree: result.isFree,
            reason: result.reason,
            appliedThreshold: result.appliedThreshold,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Invalid input", errors: error.errors });
        }
        console.error("[Shipping] Calculate error:", error);
        res.status(500).json({ message: "Failed to calculate shipping" });
    }
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/shipping/settings
 * Get all shipping settings
 */
router.get("/settings",
    requireAuth,
    restrictTo("admin", "manager"),
    async (req: Request, res: Response) => {
        try {
            const user = req.user as { id: number };
            const userLevel = await getUserHierarchyLevel(user.id);

            const settings = await shippingSettingsService.getSettingsForApi();

            // Filter settings based on user's role level
            const filteredSettings: Record<string, any> = {};
            for (const [key, setting] of Object.entries(settings)) {
                // Include if user has sufficient permission level
                if (userLevel <= (setting.minRoleLevel ?? 1)) {
                    filteredSettings[key] = setting;
                } else if (userLevel <= 10) {
                    // Business Admin can see settings they can modify
                    filteredSettings[key] = {
                        ...setting,
                        readonly: setting.minRoleLevel < userLevel,
                    };
                }
            }

            res.json({
                settings: filteredSettings,
                userLevel,
                canEditAll: userLevel <= 1,
            });
        } catch (error) {
            console.error("[Shipping] Get settings error:", error);
            res.status(500).json({ message: "Failed to fetch settings" });
        }
    }
);

/**
 * PUT /api/admin/shipping/settings/:key
 * Update a shipping setting
 */
router.put("/settings/:key",
    requireAuth,
    async (req: Request, res: Response) => {
        try {
            const key = req.params.key as ShippingSettingKey;
            const { value } = z.object({
                value: z.string(),
            }).parse(req.body);

            // Validate key is a known setting
            const validKeys = Object.values(ShippingSettingKeys);
            if (!validKeys.includes(key)) {
                return res.status(400).json({ message: `Unknown setting key: ${key}` });
            }

            const user = req.user as { id: number };
            const userLevel = await getUserHierarchyLevel(user.id);

            // Check specific permission based on setting type
            const setting = await shippingSettingsService.getSettingWithMeta(key);
            if (!setting) {
                return res.status(404).json({ message: "Setting not found" });
            }

            // Determine required permission
            let hasPermission = false;
            if (userLevel <= 1) {
                // Super Admin can update anything
                hasPermission = true;
            } else if (setting.allowedValues && userLevel <= 10) {
                // Business Admin can only select from allowed values
                if (setting.allowedValues.includes(value)) {
                    hasPermission = true;
                }
            }

            if (!hasPermission) {
                return res.status(403).json({
                    message: "Insufficient permissions",
                    allowedValues: setting.allowedValues,
                });
            }

            const result = await shippingSettingsService.updateSetting(
                key,
                value,
                user.id,
                userLevel,
                req
            );

            if (!result.success) {
                return res.status(400).json({ message: result.error });
            }

            res.json({ message: "Setting updated successfully", key, value });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Invalid input", errors: error.errors });
            }
            console.error("[Shipping] Update setting error:", error);
            res.status(500).json({ message: "Failed to update setting" });
        }
    }
);

/**
 * GET /api/admin/shipping/audit
 * Get shipping settings audit log (Super Admin only)
 */
router.get("/audit",
    requireAuth,
    restrictTo("admin"),
    async (req: Request, res: Response) => {
        try {
            const user = req.user as { id: number };
            const userLevel = await getUserHierarchyLevel(user.id);

            // Only Super Admin can view audit logs
            if (userLevel > 1) {
                return res.status(403).json({ message: "Super Admin access required" });
            }

            const { key, limit, offset } = z.object({
                key: z.string().optional(),
                limit: z.coerce.number().optional().default(50),
                offset: z.coerce.number().optional().default(0),
            }).parse(req.query);

            const auditLogs = await shippingSettingsService.getAuditLog({
                key,
                limit,
                offset,
            });

            res.json({ auditLogs });
        } catch (error) {
            console.error("[Shipping] Get audit log error:", error);
            res.status(500).json({ message: "Failed to fetch audit logs" });
        }
    }
);

/**
 * GET /api/admin/shipping/settings/:key/options
 * Get allowed values for a setting (for Business Admin dropdown)
 */
router.get("/settings/:key/options",
    requireAuth,
    restrictTo("admin", "manager"),
    async (req: Request, res: Response) => {
        try {
            const key = req.params.key as ShippingSettingKey;
            const allowedValues = await shippingSettingsService.getAllowedValues(key);

            res.json({
                key,
                allowedValues: allowedValues ?? [],
                hasRestrictions: allowedValues !== null,
            });
        } catch (error) {
            console.error("[Shipping] Get options error:", error);
            res.status(500).json({ message: "Failed to fetch options" });
        }
    }
);

// ============================================================================
// PRESETS ENDPOINTS
// ============================================================================

import { shippingPresets } from "@shared/shipping-schema";
import { desc, asc } from "drizzle-orm";

/**
 * GET /api/admin/shipping/presets
 * Get all shipping presets
 */
router.get("/presets",
    requireAuth,
    restrictTo("admin", "manager"),
    async (req: Request, res: Response) => {
        try {
            const presets = await db
                .select()
                .from(shippingPresets)
                .where(eq(shippingPresets.isActive, true))
                .orderBy(asc(shippingPresets.name));

            res.json({ presets });
        } catch (error) {
            console.error("[Shipping] Get presets error:", error);
            res.status(500).json({ message: "Failed to fetch presets" });
        }
    }
);

/**
 * POST /api/admin/shipping/presets/:id/apply
 * Apply a preset (updates multiple settings at once)
 */
router.post("/presets/:id/apply",
    requireAuth,
    restrictTo("admin", "manager"),
    async (req: Request, res: Response) => {
        try {
            const presetId = parseInt(String(req.params.id));
            const user = req.user as { id: number };
            const userLevel = await getUserHierarchyLevel(user.id);

            // Get preset
            const preset = await db
                .select()
                .from(shippingPresets)
                .where(eq(shippingPresets.id, presetId))
                .limit(1);

            if (preset.length === 0) {
                return res.status(404).json({ message: "Preset not found" });
            }

            const settings = preset[0].settings as Record<string, string>;
            const results: { key: string; success: boolean; error?: string }[] = [];

            // Apply each setting
            for (const [key, value] of Object.entries(settings)) {
                const result = await shippingSettingsService.updateSetting(
                    key as ShippingSettingKey,
                    value,
                    user.id,
                    userLevel,
                    req
                );
                results.push({ key, success: result.success, error: result.error });
            }

            res.json({
                message: `Preset "${preset[0].name}" applied`,
                presetId,
                results,
            });
        } catch (error) {
            console.error("[Shipping] Apply preset error:", error);
            res.status(500).json({ message: "Failed to apply preset" });
        }
    }
);

/**
 * POST /api/admin/shipping/presets
 * Create a new preset (Super Admin only)
 */
router.post("/presets",
    requireAuth,
    async (req: Request, res: Response) => {
        try {
            const user = req.user as { id: number };
            const userLevel = await getUserHierarchyLevel(user.id);

            if (userLevel > 1) {
                return res.status(403).json({ message: "Super Admin access required" });
            }

            const { name, description, settings } = z.object({
                name: z.string().min(1),
                description: z.string().optional(),
                settings: z.record(z.string()),
            }).parse(req.body);

            const [newPreset] = await db
                .insert(shippingPresets)
                .values({
                    name,
                    description,
                    settings,
                    isSystem: false,
                    createdBy: user.id,
                })
                .returning();

            res.json({ preset: newPreset });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Invalid input", errors: error.errors });
            }
            console.error("[Shipping] Create preset error:", error);
            res.status(500).json({ message: "Failed to create preset" });
        }
    }
);

// ============================================================================
// ROLLBACK ENDPOINT
// ============================================================================

import { shippingSettingsAudit, shippingSettings } from "@shared/shipping-schema";

/**
 * POST /api/admin/shipping/rollback/:auditId
 * Rollback a setting to its previous value from audit log
 */
router.post("/rollback/:auditId",
    requireAuth,
    async (req: Request, res: Response) => {
        try {
            const auditId = parseInt(String(req.params.auditId));
            const user = req.user as { id: number };
            const userLevel = await getUserHierarchyLevel(user.id);

            // Only Super Admin can rollback
            if (userLevel > 1) {
                return res.status(403).json({ message: "Super Admin access required" });
            }

            // Get audit entry
            const [auditEntry] = await db
                .select()
                .from(shippingSettingsAudit)
                .where(eq(shippingSettingsAudit.id, auditId))
                .limit(1);

            if (!auditEntry) {
                return res.status(404).json({ message: "Audit entry not found" });
            }

            // Restore to old value
            const oldValue = auditEntry.oldValue;
            if (oldValue === null) {
                return res.status(400).json({
                    message: "Cannot rollback: no previous value exists"
                });
            }

            const result = await shippingSettingsService.updateSetting(
                auditEntry.settingKey as ShippingSettingKey,
                oldValue,
                user.id,
                userLevel,
                req
            );

            if (!result.success) {
                return res.status(400).json({ message: result.error });
            }

            res.json({
                message: "Setting rolled back successfully",
                key: auditEntry.settingKey,
                restoredValue: oldValue,
            });
        } catch (error) {
            console.error("[Shipping] Rollback error:", error);
            res.status(500).json({ message: "Failed to rollback setting" });
        }
    }
);

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

import { shippingAnalyticsService } from "../services/shippingAnalyticsService";

/**
 * GET /api/admin/shipping/analytics
 * Get shipping analytics data
 */
router.get("/analytics",
    requireAuth,
    restrictTo("admin", "manager"),
    async (req: Request, res: Response) => {
        try {
            const { days } = z.object({
                days: z.coerce.number().optional().default(30),
            }).parse(req.query);

            const analytics = await shippingAnalyticsService.getAnalytics(days);

            res.json(analytics);
        } catch (error) {
            console.error("[Shipping] Get analytics error:", error);
            res.status(500).json({ message: "Failed to fetch analytics" });
        }
    }
);

/**
 * POST /api/shipping/preview
 * Preview shipping calculation without saving (for admin UI)
 */
router.post("/preview",
    requireAuth,
    async (req: Request, res: Response) => {
        try {
            const { orderTotal } = z.object({
                orderTotal: z.number().positive(),
            }).parse(req.body);

            const result = await shippingSettingsService.calculateShipping(orderTotal);

            res.json({
                orderTotal,
                shippingCost: result.shippingCost,
                isFree: result.isFree,
                reason: result.reason,
                appliedThreshold: result.appliedThreshold,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Invalid input", errors: error.errors });
            }
            console.error("[Shipping] Preview error:", error);
            res.status(500).json({ message: "Failed to calculate preview" });
        }
    }
);

export default router;

