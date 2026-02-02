import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Loader2,
    Package,
    DollarSign,
    ShoppingCart,
    TrendingUp,
    Wallet,
    AlertCircle,
    Bell,
    Store,
    ArrowRight,
    Clock,
    CheckCircle2,
    XCircle,
    Truck
} from "lucide-react";
import { Navbar } from "@/components/Navbar";

interface DashboardStats {
    seller: {
        id: number;
        shopName: string;
        status: string;
        rating: string;
    };
    orders: {
        totalOrders: number;
        pendingOrders: number;
        confirmedOrders: number;
        shippedOrders: number;
        deliveredOrders: number;
        cancelledOrders: number;
        totalRevenue: number;
        pendingRevenue: number;
    };
    products: {
        total: number;
        active: number;
        pending: number;
        rejected: number;
    };
    wallet: {
        pendingBalance: string;
        availableBalance: string;
        totalEarned: string;
        totalWithdrawn: string;
    } | null;
    commission: {
        rate: number;
        type: string;
    };
}

export default function SellerDashboard() {
    const [, navigate] = useLocation();

    const { data: dashboard, isLoading, error } = useQuery<DashboardStats>({
        queryKey: ["seller-dashboard"],
        queryFn: async () => {
            const res = await fetch("/api/seller/dashboard", {
                credentials: "include"
            });
            if (!res.ok) {
                if (res.status === 401) {
                    navigate("/auth?redirect=/seller/dashboard");
                    throw new Error("Please login to view your seller dashboard");
                }
                if (res.status === 404) {
                    throw new Error("not_a_seller");
                }
                if (res.status === 403) {
                    const data = await res.json();
                    throw new Error(data.status || "pending");
                }
                throw new Error("Failed to fetch dashboard");
            }
            return res.json();
        },
        retry: false
    });

    const { data: notifications } = useQuery({
        queryKey: ["seller-notifications"],
        queryFn: async () => {
            const res = await fetch("/api/seller/notifications?unread=true&limit=5", {
                credentials: "include"
            });
            if (!res.ok) return { notifications: [] };
            return res.json();
        },
        enabled: !!dashboard
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        const errorMessage = (error as Error).message;

        // Not a seller - show registration prompt
        if (errorMessage === "not_a_seller") {
            return (
                <div className="min-h-screen bg-background">
                    <Navbar />
                    <main className="container mx-auto px-4 py-16">
                        <Card className="max-w-lg mx-auto text-center">
                            <CardHeader>
                                <Store className="h-16 w-16 mx-auto text-primary mb-4" />
                                <CardTitle className="text-2xl">Become a Seller</CardTitle>
                                <CardDescription>
                                    Start selling on our marketplace and reach millions of customers
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <ul className="text-left space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        Quick and easy registration
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        Low commission rates
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        Weekly payouts to your bank
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        Dedicated seller support
                                    </li>
                                </ul>
                                <Link href="/seller/register">
                                    <Button className="w-full">
                                        Register as Seller
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </main>
                </div>
            );
        }

        // Seller pending/suspended/etc
        if (["pending", "rejected", "suspended", "blacklisted"].includes(errorMessage)) {
            const statusConfig = {
                pending: {
                    icon: Clock,
                    color: "text-yellow-500",
                    title: "Application Under Review",
                    description: "Your seller application is being reviewed. We'll notify you once it's approved."
                },
                rejected: {
                    icon: XCircle,
                    color: "text-red-500",
                    title: "Application Rejected",
                    description: "Unfortunately, your seller application was rejected. Please contact support for more information."
                },
                suspended: {
                    icon: AlertCircle,
                    color: "text-orange-500",
                    title: "Account Suspended",
                    description: "Your seller account has been suspended. Please contact support to resolve this issue."
                },
                blacklisted: {
                    icon: XCircle,
                    color: "text-red-500",
                    title: "Account Disabled",
                    description: "Your seller account has been permanently disabled."
                }
            };

            const config = statusConfig[errorMessage as keyof typeof statusConfig];
            const Icon = config.icon;

            return (
                <div className="min-h-screen bg-background">
                    <Navbar />
                    <main className="container mx-auto px-4 py-16">
                        <Card className="max-w-lg mx-auto text-center">
                            <CardHeader>
                                <Icon className={`h-16 w-16 mx-auto ${config.color} mb-4`} />
                                <CardTitle className="text-2xl">{config.title}</CardTitle>
                                <CardDescription>{config.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Link href="/help-center">
                                    <Button variant="outline">Contact Support</Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </main>
                </div>
            );
        }

        // General error
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="container mx-auto px-4 py-16">
                    <Card className="max-w-lg mx-auto text-center">
                        <CardHeader>
                            <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
                            <CardTitle>Something went wrong</CardTitle>
                            <CardDescription>{errorMessage}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={() => window.location.reload()}>
                                Try Again
                            </Button>
                        </CardContent>
                    </Card>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">{dashboard?.seller.shopName}</h1>
                        <p className="text-muted-foreground flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-green-600 border-green-600">
                                Active Seller
                            </Badge>
                            {dashboard?.seller.rating && (
                                <span>★ {parseFloat(dashboard.seller.rating).toFixed(1)}</span>
                            )}
                            <span className="text-xs">
                                Commission: {dashboard?.commission.rate}%
                            </span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/seller/products/new">
                            <Button>
                                <Package className="mr-2 h-4 w-4" />
                                Add Product
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Notifications Banner */}
                {notifications?.notifications?.length > 0 && (
                    <Card className="mb-6 border-primary/20 bg-primary/5">
                        <CardContent className="py-3">
                            <div className="flex items-center gap-3">
                                <Bell className="h-5 w-5 text-primary" />
                                <span className="text-sm font-medium">
                                    You have {notifications.notifications.length} unread notifications
                                </span>
                                <Link href="/seller/notifications" className="ml-auto">
                                    <Button variant="ghost" size="sm">View All</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{dashboard?.orders.totalOrders || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                {dashboard?.orders.pendingOrders || 0} pending
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                ₹{(dashboard?.orders.totalRevenue || 0).toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Products</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{dashboard?.products.active || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                {dashboard?.products.pending || 0} pending review
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                ₹{parseFloat(dashboard?.wallet?.availableBalance || "0").toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                ₹{parseFloat(dashboard?.wallet?.pendingBalance || "0").toLocaleString()} pending
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Link href="/seller/orders">
                        <Card className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="py-6 flex items-center gap-4">
                                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                                    <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Manage Orders</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {dashboard?.orders.pendingOrders} need action
                                    </p>
                                </div>
                                <ArrowRight className="h-5 w-5 ml-auto text-muted-foreground" />
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/seller/products">
                        <Card className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="py-6 flex items-center gap-4">
                                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                                    <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">My Products</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {dashboard?.products.total} total
                                    </p>
                                </div>
                                <ArrowRight className="h-5 w-5 ml-auto text-muted-foreground" />
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/seller/wallet">
                        <Card className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="py-6 flex items-center gap-4">
                                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                                    <Wallet className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Wallet & Payouts</h3>
                                    <p className="text-sm text-muted-foreground">
                                        View transactions
                                    </p>
                                </div>
                                <ArrowRight className="h-5 w-5 ml-auto text-muted-foreground" />
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/seller/profile">
                        <Card className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="py-6 flex items-center gap-4">
                                <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                                    <Store className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Shop Settings</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Profile & bank details
                                    </p>
                                </div>
                                <ArrowRight className="h-5 w-5 ml-auto text-muted-foreground" />
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Order Status Overview */}
                <Card>
                    <CardHeader>
                        <CardTitle>Order Status Overview</CardTitle>
                        <CardDescription>Current status of your orders</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <div className="text-3xl font-bold text-yellow-600">
                                    {dashboard?.orders.pendingOrders || 0}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">Pending</p>
                            </div>
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <div className="text-3xl font-bold text-blue-600">
                                    {dashboard?.orders.confirmedOrders || 0}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">Confirmed</p>
                            </div>
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <div className="text-3xl font-bold text-purple-600">
                                    {dashboard?.orders.shippedOrders || 0}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">Shipped</p>
                            </div>
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <div className="text-3xl font-bold text-green-600">
                                    {dashboard?.orders.deliveredOrders || 0}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">Delivered</p>
                            </div>
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <div className="text-3xl font-bold text-red-600">
                                    {dashboard?.orders.cancelledOrders || 0}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">Cancelled</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
