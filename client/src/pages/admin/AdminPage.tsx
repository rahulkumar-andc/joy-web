import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { ProductManagement } from "./AdminProducts";

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
                        <TabsTrigger value="products">Products</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard">
                        <AnalyticsDashboard />
                    </TabsContent>

                    <TabsContent value="products">
                        <ProductManagement />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
