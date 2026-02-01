import { type Request, type Response, type NextFunction } from "express";
import { authorizationService } from "../services/authorization.service";
import { auditService } from "../services/audit.service";
import { PermissionDomain, PermissionAction } from "@shared/rbac-schema";

// ============================================================================
// RBAC MIDDLEWARE - Enterprise Role-Based Access Control
// ============================================================================

// Legacy role type (for backward compatibility)
export type Role = "admin" | "manager" | "seller" | "user";

// Role → RBAC mapping for migration
const LEGACY_ROLE_MAP: Record<Role, string> = {
    admin: "SUPER_ADMIN",
    manager: "OPS_MANAGER",
    seller: "SELLER_ADMIN",
    user: "USER",
};

/**
 * Legacy role-based restriction (backward compatible)
 * Use requirePermission for new code
 */
export function restrictTo(...allowedRoles: Role[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const user = req.user as { id: number; role: Role };
        const userRole = user.role;

        console.log(`[RBAC Debug] User ID: ${user.id}, Role: ${userRole}`);
        console.log(`[RBAC Debug] Allowed Legacy Roles: ${allowedRoles.join(", ")}`);

        // Check legacy role
        if (allowedRoles.includes(userRole)) {
            return next();
        }

        // Check mapped RBAC role (e.g. SUPER_ADMIN matches admin)
        const mappedRoles = allowedRoles.map((r) => LEGACY_ROLE_MAP[r]);
        if (mappedRoles.includes(userRole)) {
            return next();
        }

        // Try RBAC check (for migrated users)
        const rbacResult = await authorizationService.hasRole(
            user.id,
            ...allowedRoles.map((r) => LEGACY_ROLE_MAP[r])
        );

        if (rbacResult) {
            return next();
        }

        // Log denied access
        await auditService.logDenied(
            req,
            "access",
            "role_check",
            `Required roles: ${allowedRoles.join(", ")}`,
            { resourceType: "route", resourceId: req.path }
        );

        return res.status(403).json({
            message: "You do not have permission to perform this action"
        });
    };
}

/**
 * Permission-based middleware (new RBAC system)
 */
export function requirePermission(
    domain: PermissionDomain | string,
    action: PermissionAction | string,
    options?: {
        resource?: string;
        getConstraintValue?: (req: Request) => number | string | undefined;
        getScopeValue?: (req: Request) => string | undefined;
    }
) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const user = req.user as { id: number; role?: string };

        try {
            const result = await authorizationService.checkPermission(user.id, domain, action, {
                resource: options?.resource,
                constraintValue: options?.getConstraintValue?.(req),
                scopeValue: options?.getScopeValue?.(req),
            });

            if (!result.allowed) {
                await auditService.logDenied(req, domain, action, result.reason || "Permission denied", {
                    resourceType: options?.resource,
                });

                return res.status(403).json({
                    message: result.reason || "You do not have permission to perform this action",
                    code: "PERMISSION_DENIED",
                });
            }

            if (result.requiresApproval) {
                // Store approval requirement in request for controller to handle
                (req as any).requiresApproval = true;
            }

            next();
        } catch (error) {
            console.error("[RBAC] Permission check error:", error);
            await auditService.logError(req, domain, action, error as Error);
            return res.status(500).json({ message: "Authorization check failed" });
        }
    };
}

/**
 * Seller isolation middleware
 * Ensures sellers can only access their own resources
 */
export function requireSellerAccess(getSellerIdFromRequest: (req: Request) => number | undefined) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const user = req.user as { id: number; role: Role };
        const targetSellerId = getSellerIdFromRequest(req);

        if (!targetSellerId) {
            return res.status(400).json({ message: "Seller ID required" });
        }

        // Admins and managers bypass seller isolation
        if (["admin", "manager"].includes(user.role)) {
            return next();
        }

        // Check RBAC scope
        const canAccess = await authorizationService.canAccessSeller(user.id, targetSellerId);

        if (!canAccess) {
            await auditService.logDenied(
                req,
                "sellers",
                "access",
                `Seller isolation: User ${user.id} cannot access seller ${targetSellerId}`,
                { resourceType: "seller", resourceId: String(targetSellerId) }
            );

            return res.status(403).json({
                message: "You do not have access to this seller's resources"
            });
        }

        next();
    };
}

/**
 * Audit logging middleware (wraps sensitive routes)
 */
export function auditAction(domain: string, action: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        // Store audit context for later use
        (req as any).auditContext = { domain, action };

        // Hook into response to log on completion
        const originalSend = res.send.bind(res);
        res.send = function (body: any) {
            // Log success for 2xx responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                auditService.logSuccess(req, domain, action, {
                    resourceId: req.params.id as string | undefined,
                });
            }
            return originalSend(body);
        };

        next();
    };
}

// ============================================================================
// LEGACY POLICIES (Deprecated - use requirePermission instead)
// ============================================================================
export const policies = {
    CAN_MANAGE_PRODUCTS: ["admin", "manager", "seller"] as Role[],
    CAN_MANAGE_ORDERS: ["admin", "manager"] as Role[],
    CAN_MANAGE_USERS: ["admin"] as Role[],
    CAN_VIEW_ADMIN_DASHBOARD: ["admin", "manager"] as Role[],
};

/** @deprecated Use requirePermission instead */
export function requirePolicyPermission(policyKey: keyof typeof policies) {
    return restrictTo(...policies[policyKey]);
}
