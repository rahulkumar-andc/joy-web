/**
 * RBAC Helper Functions
 * 
 * Centralized authorization checking for support and other modules.
 */

// Admin roles from RBAC system
export const ADMIN_RBAC_ROLES = [
    "SUPER_ADMIN",
    "BUSINESS_ADMIN",
    "OPS_ADMIN",
    "SUPPORT_ADMIN",
];

// Legacy admin roles for backward compatibility
export const LEGACY_ADMIN_ROLES = ["admin", "manager"];

/**
 * Check if user has admin or manager permissions.
 * Uses both RBAC roles and legacy role column for backward compatibility.
 */
export function isAdminOrManager(user: { role?: string; rbacRoles?: string[] } | null | undefined): boolean {
    if (!user) return false;

    // Check legacy role
    if (user.role && LEGACY_ADMIN_ROLES.includes(user.role)) {
        return true;
    }

    // Check RBAC roles
    if (user.rbacRoles && user.rbacRoles.some(r => ADMIN_RBAC_ROLES.includes(r) || LEGACY_ADMIN_ROLES.includes(r))) {
        return true;
    }

    return false;
}

/**
 * Check if user has support-specific permissions.
 */
export function hasSupportPermission(user: { role?: string; rbacRoles?: string[] } | null | undefined): boolean {
    if (!user) return false;

    // Standard admin check
    if (isAdminOrManager(user)) return true;

    // Support-specific role check
    if (user.rbacRoles?.includes("SUPPORT_AGENT")) return true;

    return false;
}
