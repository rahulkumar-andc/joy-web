/**
 * Business Dashboard
 * 
 * Main dashboard for BUSINESS_ADMIN and CATEGORY_MANAGER roles.
 * Provides seller management, category management, and product moderation.
 */

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
    Briefcase, Store, FolderTree, Package,
    LayoutDashboard, ChevronRight, TrendingUp,
    UserCheck, AlertCircle, CheckCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// Sidebar navigation items
const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/business/dashboard" },
    { icon: Store, label: "Sellers", href: "/admin/sellers" },
    { icon: FolderTree, label: "Categories", href: "/business/categories" },
    { icon: Package, label: "Product Moderation", href: "/admin/products/moderation" },
];

// Stats Card Component
function StatsCard({
    title,
    value,
    description,
    icon: Icon,
    loading,
    trend
}: {
    title: string;
    value: string | number;
    description?: string;
    icon: any;
    loading?: boolean;
    trend?: { value: number; label: string };
}) {
    if (loading) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-8 rounded" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-16 mb-1" />
                    <Skeleton className="h-3 w-32" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {description}
                    </p>
                )}
                {trend && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <TrendingUp className="h-3 w-3" />
                        {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

// Sidebar Component
function BusinessSidebar() {
    const [location] = useLocation();

    return (
        <aside className="w-64 min-h-screen bg-card border-r hidden lg:block">
            <div className="p-6 border-b">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Briefcase className="h-6 w-6 text-primary" />
                    Business Hub
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Seller & Catalog Management</p>
            </div>
            <nav className="p-4 space-y-1">
                {sidebarItems.map((item) => {
                    const isActive = location === item.href;
                    return (
                        <Link key={item.href} href={item.href}>
                            <a className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                }`}>
                                <item.icon className="h-5 w-5" />
                                <span className="font-medium">{item.label}</span>
                                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                            </a>
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}

// Seller Status Badge
function SellerStatusBadge({ status }: { status: string }) {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
        pending: { variant: "outline", label: "Pending" },
        approved: { variant: "secondary", label: "Approved" },
        active: { variant: "default", label: "Active" },
        suspended: { variant: "destructive", label: "Suspended" },
    };
    const s = config[status] || config.pending;
    return <Badge variant={s.variant}>{s.label}</Badge>;
}

export default function BusinessDashboard() {
    // Fetch business stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ["business-stats"],
        queryFn: async () => {
            const [sellersRes, productsRes] = await Promise.all([
                fetch("/api/admin/sellers", { credentials: "include" }),
                fetch("/api/products", { credentials: "include" }),
            ]);

            const sellers = sellersRes.ok ? await sellersRes.json() : [];
            const products = productsRes.ok ? await productsRes.json() : [];

            return {
                totalSellers: Array.isArray(sellers) ? sellers.length : 0,
                pendingSellers: Array.isArray(sellers) ? sellers.filter((s: any) => s.isApproved === false).length : 0,
                totalProducts: Array.isArray(products) ? products.length : 0,
                pendingModeration: 5, // Mock - would come from moderation API
            };
        },
    });

    // Fetch pending seller applications
    const { data: pendingSellers, isLoading: sellersLoading } = useQuery({
        queryKey: ["pending-sellers"],
        queryFn: async () => {
            const res = await fetch("/api/admin/sellers", { credentials: "include" });
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data) ? data.filter((s: any) => !s.isApproved).slice(0, 5) : [];
        },
    });

    // Fetch products pending moderation
    const { data: pendingProducts, isLoading: productsLoading } = useQuery({
        queryKey: ["pending-moderation"],
        queryFn: async () => {
            const res = await fetch("/api/admin/products/moderation", { credentials: "include" });
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data) ? data.slice(0, 5) : [];
        },
    });

    return (
        <div className="flex min-h-screen bg-background">
            <BusinessSidebar />

            <main className="flex-1 p-6 lg:p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">Business Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage sellers, categories, and product catalog
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    <StatsCard
                        title="Total Sellers"
                        value={stats?.totalSellers || 0}
                        description="Registered sellers"
                        icon={Store}
                        loading={statsLoading}
                        trend={{ value: 12, label: "this month" }}
                    />
                    <StatsCard
                        title="Pending Approval"
                        value={stats?.pendingSellers || 0}
                        description="Seller applications"
                        icon={UserCheck}
                        loading={statsLoading}
                    />
                    <StatsCard
                        title="Total Products"
                        value={stats?.totalProducts || 0}
                        description="In catalog"
                        icon={Package}
                        loading={statsLoading}
                        trend={{ value: 8, label: "this week" }}
                    />
                    <StatsCard
                        title="Pending Moderation"
                        value={stats?.pendingModeration || 0}
                        description="Products to review"
                        icon={AlertCircle}
                        loading={statsLoading}
                    />
                </div>

                {/* Content Grid */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Pending Seller Applications */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserCheck className="h-5 w-5" />
                                Seller Applications
                            </CardTitle>
                            <CardDescription>
                                Pending seller approvals
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {sellersLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                                </div>
                            ) : pendingSellers?.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>No pending applications</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Business Name</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingSellers?.map((seller: any) => (
                                            <TableRow key={seller.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{seller.businessName}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {seller.gstNumber || "GST Pending"}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <SellerStatusBadge status={seller.isApproved ? "approved" : "pending"} />
                                                </TableCell>
                                                <TableCell>
                                                    <Button size="sm">Review</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                            <div className="mt-4">
                                <Link href="/admin/sellers">
                                    <Button variant="outline" className="w-full">
                                        View All Sellers
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Product Moderation Queue */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Product Moderation
                            </CardTitle>
                            <CardDescription>
                                Products awaiting approval
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {productsLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                                </div>
                            ) : pendingProducts?.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>No products pending review</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pendingProducts?.map((product: any) => (
                                        <div
                                            key={product.id}
                                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                        >
                                            <div>
                                                <p className="font-medium">{product.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    ₹{product.mrp}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline">Reject</Button>
                                                <Button size="sm">Approve</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="mt-4">
                                <Link href="/admin/products/moderation">
                                    <Button variant="outline" className="w-full">
                                        View Moderation Queue
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
