import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import AnalyticsDashboard from "./AnalyticsDashboard";
import { ProductManagement } from "./AdminProducts";
import AdminRefunds from "./AdminRefunds";
import AdminRBAC from "./AdminRBAC";
import AdminResellers from "./AdminResellers";
import AdminPayouts from "./AdminPayouts";

import AdminOrders from "./AdminOrders";
import AdminCampaigns from "./AdminCampaigns";
import AdminCoupons from "./AdminCoupons";
import AdminShippingSettings from "./AdminShippingSettings";
import ContentModeration from "./ContentModeration";

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
    if (!user || user.role !== 'admin') {
        return (
            <div className="min-h-screen flex items-center justify-center flex-col gap-4">
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p>You need admin privileges to view this page.</p>
                <Link href="/auth"><Button>Login as Admin</Button></Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background font-body">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="font-display text-3xl font-bold text-primary">Admin Portal</h1>
                </div>

                <Tabs defaultValue="dashboard" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                        <TabsTrigger value="orders">Orders</TabsTrigger>
                        <TabsTrigger value="products">Products</TabsTrigger>
                        <TabsTrigger value="coupons">Coupons</TabsTrigger>
                        <TabsTrigger value="shipping">Shipping</TabsTrigger>
                        <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                        <TabsTrigger value="moderation">Moderation</TabsTrigger>
                        <TabsTrigger value="refunds">Refunds</TabsTrigger>
                        <TabsTrigger value="resellers">Resellers</TabsTrigger>
                        <TabsTrigger value="payouts">Payouts</TabsTrigger>
                        <TabsTrigger value="rbac">Access Control</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard">
                        <AnalyticsDashboard />
                    </TabsContent>

                    <TabsContent value="orders">
                        <AdminOrders />
                    </TabsContent>

                    <TabsContent value="products">
                        <ProductManagement />
                    </TabsContent>

                    <TabsContent value="coupons">
                        <AdminCoupons />
                    </TabsContent>

                    <TabsContent value="shipping">
                        <AdminShippingSettings />
                    </TabsContent>

                    <TabsContent value="campaigns">
                        <AdminCampaigns />
                    </TabsContent>

                    <TabsContent value="moderation">
                        <ContentModeration />
                    </TabsContent>

                    <TabsContent value="refunds">
                        <AdminRefunds />
                    </TabsContent>

                    <TabsContent value="resellers">
                        <AdminResellers />
                    </TabsContent>

                    <TabsContent value="payouts">
                        <AdminPayouts />
                    </TabsContent>

                    <TabsContent value="rbac">
                        <AdminRBAC />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
