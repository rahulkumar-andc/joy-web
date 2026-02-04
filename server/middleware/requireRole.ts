/**
 * Role-Based Access Control Middleware
 * 
 * Provides middleware for protecting routes based on user roles.
 * Uses the RBAC role names from shared/rbac-seed.ts
 */

import { Request, Response, NextFunction } from 'express';

// Define role hierarchies for convenience
export const ADMIN_ROLES = [
    'SUPER_ADMIN',
    'BUSINESS_ADMIN',
    'OPS_ADMIN',
    'SUPPORT_ADMIN',
    'admin', // Legacy role
];

export const OPS_ROLES = [
    'SUPER_ADMIN',
    'OPS_ADMIN',
    'OPS_MANAGER',
];

export const DELIVERY_ROLES = [
    'DELIVERY_PARTNER',
    'courier', // Legacy role
];

export const SELLER_ROLES = [
    'SELLER_ADMIN',
    'SELLER_MANAGER',
    'seller', // Legacy role
];

/**
 * Middleware to require specific roles for route access.
 * 
 * @param allowedRoles - Array of role names that are allowed to access the route
 * @returns Express middleware function
 * 
 * @example
 * // Single role
 * router.get('/courier/orders', requireAuth, requireRole('DELIVERY_PARTNER'), handler);
 * 
 * // Multiple roles
 * router.get('/admin/orders', requireAuth, requireRole(...ADMIN_ROLES), handler);
 */
export function requireRole(...allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        // Check authentication first
        if (!req.isAuthenticated?.() || !req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
            });
        }

        const user = req.user as { role?: string };
        const userRole = user.role;

        // Check if user has an allowed role
        if (!userRole || !allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
            });
        }

        next();
    };
}

/**
 * Middleware to require admin roles.
 * Shorthand for requireRole(...ADMIN_ROLES)
 */
export function requireAdmin() {
    return requireRole(...ADMIN_ROLES);
}

/**
 * Middleware to require operations roles (for delivery management).
 * Shorthand for requireRole(...OPS_ROLES)
 */
export function requireOps() {
    return requireRole(...OPS_ROLES);
}

/**
 * Middleware to require delivery partner role.
 * Shorthand for requireRole(...DELIVERY_ROLES)
 */
export function requireDeliveryPartner() {
    return requireRole(...DELIVERY_ROLES, ...OPS_ROLES);
}

/**
 * Middleware to require seller roles.
 * Shorthand for requireRole(...SELLER_ROLES)
 */
export function requireSeller() {
    return requireRole(...SELLER_ROLES, ...ADMIN_ROLES);
}
