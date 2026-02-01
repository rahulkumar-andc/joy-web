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
