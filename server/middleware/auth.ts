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
