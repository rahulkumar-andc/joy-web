import { db } from "../db";
import { eq, and, gt, lt, isNull, or } from "drizzle-orm";
import { userRoles, roles, InsertUserRole } from "@shared/rbac-schema";
import { users } from "@shared/schema";
import { authorizationService } from "./authorization.service";
import { auditService } from "./audit.service";
import { approvalService } from "./approval.service";

// ============================================================================
// ELEVATION SERVICE - Time-bound permission grants
// ============================================================================

type ElevationRequest = {
    userId: number;
    roleId: number;
    reason: string;
    durationHours: number;
    requestedBy: number;
    scopeType?: "global" | "vertical" | "region" | "seller";
    scopeValue?: string;
};

type ElevationResult = {
    success: boolean;
    elevationId?: number;
    expiresAt?: Date;
    requiresApproval?: boolean;
    message?: string;
};

// Default elevation durations (in hours)
const ELEVATION_LIMITS = {
    maxDurationHours: 24, // Maximum elevation duration
    defaultDurationHours: 4, // Default if not specified
    criticalRolesRequireApproval: ["SUPER_ADMIN", "BUSINESS_ADMIN", "OPS_ADMIN"], // Roles requiring approval
};

class ElevationService {
    /**
     * Request temporary elevation for a user
     * Some elevations require approval from a higher authority
     */
    async requestElevation(request: ElevationRequest): Promise<ElevationResult> {
        // Validate duration
        const durationHours = Math.min(
            request.durationHours || ELEVATION_LIMITS.defaultDurationHours,
            ELEVATION_LIMITS.maxDurationHours
        );

        // Get target role details
        const [targetRole] = await db.select()
            .from(roles)
            .where(eq(roles.id, request.roleId));

        if (!targetRole) {
            return { success: false, message: "Role not found" };
        }

        // Check if this role requires approval for elevation
        const requiresApproval = ELEVATION_LIMITS.criticalRolesRequireApproval.includes(targetRole.name);

        if (requiresApproval) {
            // Create approval request instead of direct grant
            const approvalResult = await approvalService.createRequest({
                requesterId: request.requestedBy,
                domain: "elevation",
                action: "grant",
                resourceType: "user",
                resourceId: String(request.userId),
                payload: {
                    userId: request.userId,
                    roleId: request.roleId,
                    roleName: targetRole.name,
                    reason: request.reason,
                    durationHours,
                    scopeType: request.scopeType,
                    scopeValue: request.scopeValue,
                },
                expiresInHours: 4, // Approval request expires in 4 hours
            });

            return {
                success: approvalResult.success,
                requiresApproval: true,
                message: `Elevation to ${targetRole.displayName} requires approval`,
            };
        }

        // Direct grant for non-critical roles
        return this.grantElevation(request, durationHours);
    }

    /**
     * Grant temporary elevated access (called directly or after approval)
     */
    async grantElevation(
        request: ElevationRequest,
        durationHours: number
    ): Promise<ElevationResult> {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + durationHours);

        try {
            // Check if user already has this role (active or elevated)
            const [existing] = await db.select()
                .from(userRoles)
                .where(
                    and(
                        eq(userRoles.userId, request.userId),
                        eq(userRoles.roleId, request.roleId),
                        eq(userRoles.isActive, true),
                        or(
                            isNull(userRoles.expiresAt),
                            gt(userRoles.expiresAt, new Date())
                        )
                    )
                );

            if (existing) {
                return {
                    success: false,
                    message: "User already has this role (active or elevated)"
                };
            }

            // Insert temporary role assignment
            const [elevation] = await db.insert(userRoles).values({
                userId: request.userId,
                roleId: request.roleId,
                scopeType: request.scopeType || "global",
                scopeValue: request.scopeValue || null,
                grantedBy: request.requestedBy,
                expiresAt,
                isActive: true,
            }).returning();

            // Invalidate user's permission cache
            await authorizationService.invalidateCache(request.userId);

            return {
                success: true,
                elevationId: elevation.id,
                expiresAt,
                message: `Elevated access granted until ${expiresAt.toISOString()}`,
            };
        } catch (error) {
            console.error("[ElevationService] Failed to grant elevation:", error);
            return { success: false, message: "Failed to grant elevation" };
        }
    }

    /**
     * Revoke elevated access before expiry
     */
    async revokeElevation(
        elevationId: number,
        revokedBy: number,
        reason?: string
    ): Promise<ElevationResult> {
        try {
            const [elevation] = await db.select()
                .from(userRoles)
                .where(eq(userRoles.id, elevationId));

            if (!elevation) {
                return { success: false, message: "Elevation not found" };
            }

            if (!elevation.expiresAt) {
                return { success: false, message: "This is a permanent role, not an elevation" };
            }

            // Deactivate the elevation
            await db.update(userRoles)
                .set({ isActive: false })
                .where(eq(userRoles.id, elevationId));

            // Invalidate user's permission cache
            await authorizationService.invalidateCache(elevation.userId);

            return {
                success: true,
                elevationId,
                message: reason
                    ? `Elevation revoked: ${reason}`
                    : "Elevation revoked successfully",
            };
        } catch (error) {
            console.error("[ElevationService] Failed to revoke elevation:", error);
            return { success: false, message: "Failed to revoke elevation" };
        }
    }

    /**
     * Get active elevations for a user
     */
    async getUserElevations(userId: number) {
        const now = new Date();

        return db.select({
            id: userRoles.id,
            roleId: roles.id,
            roleName: roles.name,
            displayName: roles.displayName,
            scopeType: userRoles.scopeType,
            scopeValue: userRoles.scopeValue,
            grantedAt: userRoles.grantedAt,
            expiresAt: userRoles.expiresAt,
        })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(
                and(
                    eq(userRoles.userId, userId),
                    eq(userRoles.isActive, true),
                    gt(userRoles.expiresAt, now) // Only temporary (has expiry)
                )
            );
    }

    /**
     * Cleanup expired elevations (run via cron job)
     * This is a maintenance function - expired elevations are already
     * functionally inactive due to the expiresAt check in authorization
     */
    async cleanupExpiredElevations(): Promise<number> {
        const now = new Date();

        const result = await db.update(userRoles)
            .set({ isActive: false })
            .where(
                and(
                    eq(userRoles.isActive, true),
                    lt(userRoles.expiresAt, now) // expiresAt < now (expired)
                )
            )
            .returning();

        // Invalidate cache for affected users
        const affectedUserIds = Array.from(new Set(result.map(r => r.userId)));
        for (const userId of affectedUserIds) {
            await authorizationService.invalidateCache(userId);
        }

        console.log(`[ElevationService] Cleaned up ${result.length} expired elevations`);
        return result.length;
    }

    /**
     * Extend an existing elevation
     */
    async extendElevation(
        elevationId: number,
        additionalHours: number,
        extendedBy: number
    ): Promise<ElevationResult> {
        const [elevation] = await db.select()
            .from(userRoles)
            .where(eq(userRoles.id, elevationId));

        if (!elevation) {
            return { success: false, message: "Elevation not found" };
        }

        if (!elevation.expiresAt) {
            return { success: false, message: "This is a permanent role, cannot extend" };
        }

        if (!elevation.isActive) {
            return { success: false, message: "Elevation is no longer active" };
        }

        // Calculate new expiry (from current expiry or now, whichever is later)
        const baseTime = elevation.expiresAt > new Date()
            ? elevation.expiresAt
            : new Date();

        const newExpiresAt = new Date(baseTime);
        newExpiresAt.setHours(newExpiresAt.getHours() + additionalHours);

        // Enforce maximum total duration (24 hours from original grant)
        const grantedAt = elevation.grantedAt || new Date();
        const maxExpiry = new Date(grantedAt);
        maxExpiry.setHours(maxExpiry.getHours() + ELEVATION_LIMITS.maxDurationHours);

        if (newExpiresAt > maxExpiry) {
            return {
                success: false,
                message: `Cannot extend beyond ${ELEVATION_LIMITS.maxDurationHours} hours from original grant`
            };
        }

        await db.update(userRoles)
            .set({ expiresAt: newExpiresAt })
            .where(eq(userRoles.id, elevationId));

        // Invalidate cache
        await authorizationService.invalidateCache(elevation.userId);

        return {
            success: true,
            elevationId,
            expiresAt: newExpiresAt,
            message: `Elevation extended until ${newExpiresAt.toISOString()}`,
        };
    }
}

export const elevationService = new ElevationService();
