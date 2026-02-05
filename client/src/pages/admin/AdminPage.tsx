import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import AnalyticsDashboard from "./AnalyticsDashboard";

export default function AdminPage() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Access denied for non-admin users
    // Access denied for non-admin users
    const hasAdminAccess = user?.role === 'admin' || (user as any).rbacRoles?.includes("SUPER_ADMIN");

    if (!user || !hasAdminAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center flex-col gap-4">
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p>You need admin privileges to view this page.</p>
                <Link href="/auth"><Button>Login as Admin</Button></Link>
            </div>
        );
    }

    return (
        <AdminLayout title="Dashboard" subtitle="Overview of your store performance">
            <AnalyticsDashboard />
        </AdminLayout>
    );
}
