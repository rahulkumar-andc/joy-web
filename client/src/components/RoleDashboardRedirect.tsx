import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

/**
 * Role to Dashboard Path Mapping
 * Centralizes the logic for routing authenticated users to their role-specific dashboard.
 */
const ROLE_DASHBOARD_MAP: Record<string, string> = {
    // Super Admin - Full access to admin panel
    SUPER_ADMIN: "/admin",
    admin: "/admin",

    // OPS roles - Operations Dashboard
    OPS_ADMIN: "/ops/dashboard",
    OPS_MANAGER: "/ops/dashboard",

    // Support roles - Support Dashboard
    SUPPORT_ADMIN: "/support/dashboard",
    SUPPORT_AGENT: "/support/dashboard",

    // Business roles - Business Dashboard
    BUSINESS_ADMIN: "/business/dashboard",
    CATEGORY_MANAGER: "/business/dashboard",

    // Seller roles
    SELLER_ADMIN: "/seller/dashboard",
    SELLER_MANAGER: "/seller/dashboard",
    seller: "/seller/dashboard",

    // Courier role
    DELIVERY_PARTNER: "/courier/dashboard",
    courier: "/courier/dashboard",

    // Customer role
    USER: "/profile",
    user: "/profile",
};

/**
 * RoleDashboardRedirect Component
 * 
 * Automatically redirects authenticated users to their role-specific dashboard.
 * - Unauthenticated users → /auth
 * - Resellers (special flag) → /reseller/dashboard
 * - Role-based users → corresponding dashboard from ROLE_DASHBOARD_MAP
 * - Fallback → /profile
 */
export function RoleDashboardRedirect() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Not authenticated → redirect to auth
    if (!user) {
        return <Redirect to="/auth" />;
    }

    // Check RBAC roles first (from userRoles table)
    const rbacRoles = (user as any).rbacRoles as string[] | undefined;
    if (rbacRoles && rbacRoles.length > 0) {
        // Find dashboard for the first matching RBAC role (priority order)
        for (const role of rbacRoles) {
            if (ROLE_DASHBOARD_MAP[role]) {
                return <Redirect to={ROLE_DASHBOARD_MAP[role]} />;
            }
        }
    }

    // Fallback to legacy role field
    const dashboardPath = ROLE_DASHBOARD_MAP[user.role] || "/profile";

    return <Redirect to={dashboardPath} />;
}

export default RoleDashboardRedirect;
