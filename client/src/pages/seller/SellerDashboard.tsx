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
    Plus
} from "lucide-react";
import { SellerLayout, PremiumHeader } from "@/components/layout";
import { motion } from "framer-motion";

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
    salesHistory: {
        date: string;
        amount: number;
    }[];
    recentActivity: {
        orders: any[];
        transactions: any[];
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
                <div className="min-h-screen bg-background text-foreground">
                    <PremiumHeader />
                    <main className="container mx-auto px-4 py-32">
                        <Card className="max-w-lg mx-auto text-center border-border/50 shadow-lg">
                            <CardHeader>
                                <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Store className="h-10 w-10 text-primary" />
                                </div>
                                <CardTitle className="text-3xl font-display">Become a Seller</CardTitle>
                                <CardDescription className="text-lg mt-2">
                                    Start selling on our marketplace and reach millions of customers
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <ul className="text-left space-y-3 text-muted-foreground bg-muted/30 p-6 rounded-xl">
                                    <li className="flex items-center gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                        <span>Quick and easy registration</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                        <span>Low commission rates</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                        <span>Weekly payouts to your bank</span>
                                    </li>
                                </ul>
                                <Link href="/seller/register">
                                    <Button className="w-full text-lg h-12">
                                        Register as Seller
                                        <ArrowRight className="ml-2 h-5 w-5" />
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
                    bg: "bg-yellow-500/10",
                    title: "Application Under Review",
                    description: "Your seller application is being reviewed. We'll notify you once it's approved."
                },
                rejected: {
                    icon: XCircle,
                    color: "text-red-500",
                    bg: "bg-red-500/10",
                    title: "Application Rejected",
                    description: "Unfortunately, your seller application was rejected. Please contact support for more information."
                },
                suspended: {
                    icon: AlertCircle,
                    color: "text-orange-500",
                    bg: "bg-orange-500/10",
                    title: "Account Suspended",
                    description: "Your seller account has been suspended. Please contact support to resolve this issue."
                },
                blacklisted: {
                    icon: XCircle,
                    color: "text-red-500",
                    bg: "bg-red-500/10",
                    title: "Account Disabled",
                    description: "Your seller account has been permanently disabled."
                }
            };

            const config = statusConfig[errorMessage as keyof typeof statusConfig];
            const Icon = config.icon;

            return (
                <div className="min-h-screen bg-background">
                    <PremiumHeader />
                    <main className="container mx-auto px-4 py-32">
                        <Card className="max-w-lg mx-auto text-center border-border/50 shadow-lg">
                            <CardHeader>
                                <div className={`h-20 w-20 ${config.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                                    <Icon className={`h-10 w-10 ${config.color}`} />
                                </div>
                                <CardTitle className="text-2xl font-display">{config.title}</CardTitle>
                                <CardDescription className="text-lg mt-2">{config.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Link href="/help-center">
                                    <Button variant="outline" className="min-w-[150px]">Contact Support</Button>
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
                <PremiumHeader />
                <main className="container mx-auto px-4 py-32">
                    <Card className="max-w-lg mx-auto text-center border-destructive/20 shadow-lg">
                        <CardHeader>
                            <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="h-10 w-10 text-destructive" />
                            </div>
                            <CardTitle className="text-2xl font-display">Something went wrong</CardTitle>
                            <CardDescription className="text-lg">{errorMessage}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={() => window.location.reload()} variant="outline">
                                Try Again
                            </Button>
                        </CardContent>
                    </Card>
                </main>
            </div>
        );
    }

    return (
        <SellerLayout
            title={dashboard?.seller.shopName}
            subtitle={`Active Seller • ★ ${dashboard?.seller.rating ? parseFloat(dashboard.seller.rating).toFixed(1) : 'N/A'} • ${dashboard?.commission.rate}% commission`}
            actions={
                <Link href="/seller/products/new">
                    <Button className="bg-accent hover:bg-accent/90 text-white shadow-sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Product
                    </Button>
                </Link>
            }
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >

                {/* Notifications Banner */}
                {notifications?.notifications?.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <Card className="mb-6 border-accent/20 bg-accent/5 overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
                            <CardContent className="py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-full shadow-sm">
                                        <Bell className="h-5 w-5 text-accent" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-accent-foreground">Notifications</p>
                                        <span className="text-sm text-muted-foreground">
                                            You have {notifications.notifications.length} unread notifications
                                        </span>
                                    </div>
                                </div>
                                <Link href="/seller/notifications">
                                    <Button variant="ghost" size="sm" className="hover:bg-accent/10 hover:text-accent">View All &rarr;</Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsCard
                        title="Total Orders"
                        value={dashboard?.orders.totalOrders || 0}
                        subtext={`${dashboard?.orders.pendingOrders || 0} pending`}
                        icon={ShoppingCart}
                        color="text-blue-500"
                        bg="bg-blue-500/10"
                    />
                    <StatsCard
                        title="Total Revenue"
                        value={`₹${(dashboard?.orders.totalRevenue || 0).toLocaleString()}`}
                        subtext="Lifetime earnings"
                        icon={TrendingUp}
                        color="text-green-500"
                        bg="bg-green-500/10"
                    />
                    <StatsCard
                        title="Active Products"
                        value={dashboard?.products.active || 0}
                        subtext={`${dashboard?.products.pending || 0} under review`}
                        icon={Package}
                        color="text-purple-500"
                        bg="bg-purple-500/10"
                    />
                    <StatsCard
                        title="Available Balance"
                        value={`₹${parseFloat(dashboard?.wallet?.availableBalance || "0").toLocaleString()}`}
                        subtext={`₹${parseFloat(dashboard?.wallet?.pendingBalance || "0").toLocaleString()} pending`}
                        icon={Wallet}
                        color="text-orange-500"
                        bg="bg-orange-500/10"
                    />
                </div>

                {/* Quick Actions Grid */}
                <h2 className="text-xl font-display font-bold mt-8 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <QuickActionCard
                        href="/seller/orders"
                        title="Manage Orders"
                        description={`${dashboard?.orders.pendingOrders || 0} orders need action`}
                        icon={ShoppingCart}
                        color="bg-blue-500"
                    />
                    <QuickActionCard
                        href="/seller/products"
                        title="My Products"
                        description={`${dashboard?.products.total || 0} total products`}
                        icon={Package}
                        color="bg-green-500"
                    />
                    <QuickActionCard
                        href="/seller/wallet"
                        title="Wallet & Payouts"
                        description="View transactions"
                        icon={Wallet}
                        color="bg-purple-500"
                    />
                    <QuickActionCard
                        href="/seller/profile"
                        title="Shop Settings"
                        description="Profile & bank details"
                        icon={Store}
                        color="bg-orange-500"
                    />
                </div>

                {/* Earnings Overview & Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                    {/* Earnings Chart */}
                    <Card className="lg:col-span-2 border-border/30 shadow-sm overflow-hidden">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-display">Earnings Overview</CardTitle>
                                    <CardDescription>Your revenue this month</CardDescription>
                                </div>
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-0">
                                    Last 30 Days
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {/* Simple visual chart bars */}
                            <div className="flex items-end gap-2 h-32 mb-4">
                                {dashboard?.salesHistory?.map((day: any, i: number) => {
                                    const maxAmount = Math.max(...(dashboard?.salesHistory?.map((d: any) => d.amount) || [100]));
                                    const heightPercentage = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0;
                                    return (
                                        <motion.div
                                            key={i}
                                            className="flex-1 bg-gradient-to-t from-accent/80 to-accent/40 rounded-t-md relative group"
                                            initial={{ height: 0 }}
                                            animate={{ height: `${Math.max(heightPercentage, 2)}%` }} // Min 2% height for visibility
                                            transition={{ delay: i * 0.02, duration: 0.5, ease: "easeOut" }}
                                        >
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                ₹{day.amount.toLocaleString()}
                                                <div className="text-gray-400">{day.date}</div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground overflow-hidden">
                                {dashboard?.salesHistory?.filter((_: any, i: number) => i % 5 === 0).map((day: any) => (
                                    <span key={day.date}>{new Date(day.date).getDate()}</span>
                                ))}
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
                                <div>
                                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                                    <p className="text-lg font-bold">₹{(dashboard?.orders.totalRevenue || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Pending Revenue</p>
                                    <p className="text-lg font-bold">₹{(dashboard?.orders.pendingRevenue || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Avg Order</p>
                                    <p className="text-lg font-bold">₹{dashboard?.orders.totalOrders ? Math.round((dashboard.orders.totalRevenue || 0) / dashboard.orders.totalOrders).toLocaleString() : 0}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="border-border/30 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-display">Recent Activity</CardTitle>
                            <CardDescription>Latest updates</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(!dashboard?.recentActivity?.orders.length && !dashboard?.recentActivity?.transactions.length) && (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    No recent activity
                                </div>
                            )}

                            {dashboard?.recentActivity?.orders.slice(0, 3).map((order: any) => (
                                <div key={`order-${order.id}`} className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                        <Package className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">New Order #{order.sellerOrderNumber}</p>
                                        <p className="text-xs text-muted-foreground">
                                            ₹{Number(order.subtotal).toLocaleString()} • {order.status}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {dashboard?.recentActivity?.transactions.slice(0, 3).map((tx: any) => (
                                <div key={`tx-${tx.id}`} className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                        <Wallet className="h-4 w-4 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{tx.type === 'credit' ? 'Payment Received' : 'Payout Processed'}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {tx.type === 'credit' ? '+' : '-'}₹{Number(tx.amount).toLocaleString()} • {new Date(tx.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            <Link href="/seller/orders">
                                <Button variant="ghost" size="sm" className="w-full mt-2 hover:bg-accent/10 hover:text-accent">
                                    View all activity →
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>

                {/* Inventory Alerts */}
                {(dashboard?.products.pending || 0) > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6"
                    >
                        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800/30">
                            <CardContent className="py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-500/10 rounded-full">
                                        <Clock className="h-5 w-5 text-orange-500" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-orange-700 dark:text-orange-400">Products Under Review</p>
                                        <span className="text-sm text-orange-600/80 dark:text-orange-300/70">
                                            {dashboard?.products.pending || 0} products are pending approval
                                        </span>
                                    </div>
                                </div>
                                <Link href="/seller/products?status=pending">
                                    <Button variant="outline" size="sm" className="border-orange-300 text-orange-600 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950">
                                        View Products
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </motion.div>
        </SellerLayout>
    );
}

function StatsCard({ title, value, subtext, icon: Icon, color, bg }: any) {
    return (
        <motion.div
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="group"
        >
            <Card className="border-border/30 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card to-card/80 overflow-hidden relative">
                {/* Subtle gradient overlay */}
                <div className={`absolute top-0 right-0 w-32 h-32 ${bg} rounded-full blur-3xl opacity-30 -translate-y-8 translate-x-8 group-hover:opacity-50 transition-opacity`} />

                <CardContent className="p-6 relative">
                    <div className="flex items-center justify-between space-y-0 pb-2">
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <motion.div
                            className={`p-2.5 rounded-xl ${bg} shadow-sm`}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 400 }}
                        >
                            <Icon className={`h-4 w-4 ${color}`} />
                        </motion.div>
                    </div>
                    <div className="mt-3">
                        <motion.div
                            className="text-2xl md:text-3xl font-bold tracking-tight"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            {value}
                        </motion.div>
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                            {subtext}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

function QuickActionCard({ href, title, description, icon: Icon, color }: any) {
    return (
        <Link href={href}>
            <Card className="cursor-pointer border-border/50 shadow-sm hover:shadow-md hover:border-accent/30 transition-all duration-300 group">
                <CardContent className="p-6 flex items-center gap-4">
                    <div className={`p-3 rounded-full text-white shadow-md group-hover:scale-110 transition-transform duration-300 ${color}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold group-hover:text-accent transition-colors">{title}</h3>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 ml-auto text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
                </CardContent>
            </Card>
        </Link>
    );
}
