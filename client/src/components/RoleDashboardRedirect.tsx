import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

/**
 * Role to Dashboard Path Mapping
 * Centralizes the logic for routing authenticated users to their role-specific dashboard.
 */
const ROLE_DASHBOARD_MAP: Record<string, string> = {
    // Admin roles
    SUPER_ADMIN: "/admin",
    BUSINESS_ADMIN: "/admin",
    OPS_ADMIN: "/admin",
    SUPPORT_ADMIN: "/admin",
    CATEGORY_MANAGER: "/admin",
    OPS_MANAGER: "/admin",
    SUPPORT_AGENT: "/admin",
    // Legacy admin role
    admin: "/admin",

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

    // Get dashboard path based on role
    // Note: Reseller status is checked within the ResellerDashboard page itself
    // since it's stored in a separate 'resellers' table, not on the user object
    const dashboardPath = ROLE_DASHBOARD_MAP[user.role] || "/profile";

    return <Redirect to={dashboardPath} />;
}

export default RoleDashboardRedirect;
