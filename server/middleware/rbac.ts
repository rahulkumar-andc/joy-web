import { type Request, type Response, type NextFunction } from "express";

export type Role = "admin" | "manager" | "seller" | "user";

export function restrictTo(...allowedRoles: Role[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const userRole = (req.user as any).role as Role;

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: "You do not have permission to perform this action" });
        }

        next();
    };
}

// Optional: Granular policies (if needed later)
// For now, role-based is sufficient as per requirements
export const policies = {
    CAN_MANAGE_PRODUCTS: ["admin", "manager", "seller"],
    CAN_MANAGE_ORDERS: ["admin", "manager"],
    CAN_MANAGE_USERS: ["admin"],
    CAN_VIEW_ADMIN_DASHBOARD: ["admin", "manager"],
};

export function requirePermission(policyKey: keyof typeof policies) {
    return restrictTo(...(policies[policyKey] as Role[]));
}
