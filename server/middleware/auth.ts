import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: "Authentication required" });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated() && (req.user as any)?.role === "admin") {
        return next();
    }
    res.status(403).json({ message: "Admin access required" });
}

/**
 * Middleware that allows both admin and seller roles
 * Used for seller-specific endpoints like image upload
 */
export function requireSeller(req: Request, res: Response, next: NextFunction) {
    const role = (req.user as any)?.role;
    if (req.isAuthenticated() && ["admin", "seller"].includes(role)) {
        return next();
    }
    res.status(403).json({
        message: "Seller access required",
        code: "SELLER_ACCESS_REQUIRED"
    });
}

/**
 * Middleware that allows specific roles
 */
export function requireRole(allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as any;

        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Authentication required" });
        }

        if (allowedRoles.includes(user?.role)) {
            return next();
        }

        // Check RBAC roles if available (fallback/advanced)
        if (user?.rbacRoles && user.rbacRoles.some((r: string) => allowedRoles.includes(r))) {
            return next();
        }

        res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    };
}
