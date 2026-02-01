import { db } from "../db";
import { eq, and, or, isNull, gt } from "drizzle-orm";
import {
    roles,
    permissions,
    rolePermissions,
    userRoles,
    PermissionDomain,
    PermissionAction,
    Permission,
    Role,
    UserRole,
} from "@shared/rbac-schema";
import { users, User } from "@shared/schema";
import { cacheService } from "../cache";

// ============================================================================
// AUTHORIZATION SERVICE - Central permission checking with Redis cache
// ============================================================================

type CachedPermission = {
    domain: string;
    action: string;
    resource: string | null;
    constraintKey: string | null;
    constraintValue: string | null;
    requiresApproval: boolean;
};

type CachedUserPermissions = {
    permissions: CachedPermission[];
    roles: string[];
    scopes: { type: string; value: string | null }[];
};

// Cache key prefix
const CACHE_KEY_PREFIX = "rbac:user:";
const CACHE_TTL_SECONDS = 5 * 60; // 5 minutes

class AuthorizationService {
    /**
     * Check if a user has a specific permission
     */
    async checkPermission(
        userId: number,
        domain: PermissionDomain | string,
        action: PermissionAction | string,
        context?: {
            resource?: string;
            scopeType?: string;
            scopeValue?: string;
            constraintValue?: number | string;
        }
    ): Promise<{ allowed: boolean; requiresApproval?: boolean; reason?: string }> {
        const userPermissions = await this.getUserPermissions(userId);

        if (!userPermissions || userPermissions.permissions.length === 0) {
            return { allowed: false, reason: "No permissions assigned" };
        }

        // Find matching permission
        const match = userPermissions.permissions.find((p) => {
            // Domain must match
            if (p.domain !== domain) return false;

            // Action must match (or "manage" grants all actions)
            if (p.action !== action && p.action !== "manage") return false;

            // Resource match (null = all resources)
            if (p.resource && context?.resource && p.resource !== context.resource) return false;

            // Constraint check (e.g., amount limit)
            if (p.constraintKey === "amount_limit" && context?.constraintValue) {
                const limit = parseFloat(p.constraintValue || "0");
                const value = typeof context.constraintValue === "string"
                    ? parseFloat(context.constraintValue)
                    : context.constraintValue;
                if (value > limit) return false;
            }

            return true;
        });

        if (!match) {
            return { allowed: false, reason: `Missing permission: ${domain}.${action}` };
        }

        // Check scope isolation
        if (context?.scopeType && context?.scopeValue) {
            const hasScope = userPermissions.scopes.some(
                (s) => s.type === context.scopeType &&
                    (s.value === null || s.value === context.scopeValue)
            );
            if (!hasScope) {
                return { allowed: false, reason: "Scope access denied" };
            }
        }

        return {
            allowed: true,
            requiresApproval: match.requiresApproval
        };
    }

    /**
     * Get all permissions for a user (with Redis caching)
     */
    async getUserPermissions(userId: number): Promise<CachedUserPermissions | null> {
        const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;

        // Check Redis cache
        const cached = await cacheService.get<CachedUserPermissions>(cacheKey);
        if (cached) {
            return cached;
        }

        // Fetch from database
        const now = new Date();

        // Get active user roles
        const activeUserRoles = await db
            .select({
                roleId: userRoles.roleId,
                roleName: roles.name,
                scopeType: userRoles.scopeType,
                scopeValue: userRoles.scopeValue,
            })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(
                and(
                    eq(userRoles.userId, userId),
                    eq(userRoles.isActive, true),
                    eq(roles.isActive, true),
                    or(
                        isNull(userRoles.expiresAt),
                        gt(userRoles.expiresAt, now)
                    )
                )
            );

        if (activeUserRoles.length === 0) {
            return null;
        }

        const roleIds = activeUserRoles.map((ur) => ur.roleId);

        // Get all permissions for these roles
        const rolePerms = await db
            .select({
                domain: permissions.domain,
                action: permissions.action,
                resource: permissions.resource,
                constraintKey: permissions.constraintKey,
                constraintValue: rolePermissions.constraintValue,
                requiresApproval: rolePermissions.requiresApproval,
            })
            .from(rolePermissions)
            .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
            .where(
                or(...roleIds.map((rid) => eq(rolePermissions.roleId, rid)))
            );

        const result: CachedUserPermissions = {
            permissions: rolePerms.map((rp) => ({
                domain: rp.domain,
                action: rp.action,
                resource: rp.resource,
                constraintKey: rp.constraintKey,
                constraintValue: rp.constraintValue,
                requiresApproval: rp.requiresApproval,
            })),
            roles: activeUserRoles.map((ur) => ur.roleName),
            scopes: activeUserRoles.map((ur) => ({
                type: ur.scopeType,
                value: ur.scopeValue,
            })),
        };

        // Cache in Redis
        await cacheService.set(cacheKey, result, CACHE_TTL_SECONDS);

        return result;
    }

    /**
     * Invalidate cache for a user (call when roles change)
     */
    async invalidateCache(userId: number): Promise<void> {
        const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
        await cacheService.del(cacheKey);
    }

    /**
     * Invalidate all RBAC caches (call when permissions/roles are modified globally)
     */
    async invalidateAllCaches(): Promise<void> {
        // Use Redis SCAN to find and delete all RBAC keys
        // For now, we'll rely on TTL expiration
        // In production, use Redis pub/sub for cross-instance invalidation
        console.log("[AuthorizationService] Global cache invalidation triggered (TTL-based)");
    }

    /**
     * Check if user has any of the specified roles
     */
    async hasRole(userId: number, ...roleNames: string[]): Promise<boolean> {
        const userPerms = await this.getUserPermissions(userId);
        if (!userPerms) return false;
        return roleNames.some((rn) => userPerms.roles.includes(rn));
    }

    /**
     * Check if user can access a specific seller's resources
     */
    async canAccessSeller(userId: number, sellerId: number): Promise<boolean> {
        const userPerms = await this.getUserPermissions(userId);
        if (!userPerms) return false;

        // Global scope = access all sellers
        const hasGlobalScope = userPerms.scopes.some(
            (s) => s.type === "global" || s.value === null
        );
        if (hasGlobalScope) return true;

        // Seller-specific scope
        return userPerms.scopes.some(
            (s) => s.type === "seller" && s.value === String(sellerId)
        );
    }

    /**
     * Invalidate cache for all users who have a specific role
     */
    async invalidatePermissionCache(roleId: number): Promise<void> {
        const affectedUsers = await db
            .select({ userId: userRoles.userId })
            .from(userRoles)
            .where(eq(userRoles.roleId, roleId));

        // Process in parallel
        await Promise.all(affectedUsers.map(u => this.invalidateCache(u.userId)));
    }

    /**
     * Get the highest privilege role for a user
     */
    async getPrimaryRole(userId: number): Promise<string | null> {
        const now = new Date();

        const result = await db
            .select({ name: roles.name })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(
                and(
                    eq(userRoles.userId, userId),
                    eq(userRoles.isActive, true),
                    eq(roles.isActive, true),
                    or(
                        isNull(userRoles.expiresAt),
                        gt(userRoles.expiresAt, now)
                    )
                )
            )
            .orderBy(roles.hierarchyLevel)
            .limit(1);

        return result[0]?.name || null;
    }
}

export const authorizationService = new AuthorizationService();
