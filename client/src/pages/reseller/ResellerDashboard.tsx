import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import {
    TrendingUp,
    DollarSign,
    Link as LinkIcon,
    ShoppingBag,
    Eye,
    ArrowUpRight,
    Wallet,
    Clock,
    Award,
    Share2,
    Plus,
    ChevronRight,
    BarChart3,
    CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface DashboardData {
    reseller: {
        id: number;
        resellerCode: string;
        status: string;
        tier: string;
        pendingPayout: string;
        totalEarnings: string;
        lifetimeOrders: number;
    };
    tier: string;
    tierConfig: {
        minOrders: number;
        baseRate: number;
        bonus: number;
    };
    balance: {
        pending: number;
        total: number;
    };
    today: {
        clicks: number;
        orders: number;
        earnings: number;
    };
    thisMonth: {
        orders: number;
        earnings: number;
    };
    lifetime: {
        orders: number;
        sales: number;
    };
    topLinks: Array<{
        id: number;
        shortCode: string;
        clicks: number;
        conversions: number;
        product?: { name: string; images: string[] };
    }>;
}

const tierColors: Record<string, string> = {
    bronze: "bg-amber-600",
    silver: "bg-gray-400",
    gold: "bg-yellow-500",
    platinum: "bg-purple-600",
};

const tierNextConfig: Record<string, { next: string; ordersNeeded: number }> = {
    bronze: { next: "Silver", ordersNeeded: 50 },
    silver: { next: "Gold", ordersNeeded: 200 },
    gold: { next: "Platinum", ordersNeeded: 500 },
    platinum: { next: "Max", ordersNeeded: 0 },
};

export default function ResellerDashboard() {
    const [, setLocation] = useLocation();

    const { data: dashboard, isLoading, error } = useQuery<DashboardData>({
        queryKey: ["/api/reseller/dashboard"],
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !dashboard) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <h2 className="text-xl font-semibold">Not a Reseller Yet?</h2>
                <p className="text-muted-foreground">Join our reseller program to start earning!</p>
                <Button onClick={() => setLocation("/reseller/join")}>
                    Become a Reseller
                </Button>
            </div>
        );
    }

    const nextTier = tierNextConfig[dashboard.tier];
    const progressToNext = nextTier.ordersNeeded > 0
        ? (dashboard.lifetime.orders / nextTier.ordersNeeded) * 100
        : 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Reseller Dashboard</h1>
                        <p className="text-muted-foreground">
                            Welcome back! Here's how you're performing.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" asChild>
                            <Link to="/reseller/payouts">
                                <Wallet className="mr-2 h-4 w-4" />
                                Payouts
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link to="/reseller/catalog">
                                <Plus className="mr-2 h-4 w-4" />
                                Share Products
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Tier & Balance Row */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* Tier Card */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full ${tierColors[dashboard.tier]} flex items-center justify-center text-white`}>
                                        <Award className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-xl capitalize">{dashboard.tier}</span>
                                            <Badge variant="secondary">
                                                {((dashboard.tierConfig.baseRate + dashboard.tierConfig.bonus) * 100).toFixed(0)}% Rate
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {dashboard.lifetime.orders} lifetime orders
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {dashboard.tier !== "platinum" && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Progress to {nextTier.next}</span>
                                        <span className="font-medium">{dashboard.lifetime.orders} / {nextTier.ordersNeeded}</span>
                                    </div>
                                    <Progress value={Math.min(progressToNext, 100)} className="h-2" />
                                    <p className="text-xs text-muted-foreground">
                                        {nextTier.ordersNeeded - dashboard.lifetime.orders} more orders to unlock {nextTier.next}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Balance Card */}
                    <Card className="bg-gradient-to-br from-primary to-primary/90 text-white">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="text-sm opacity-80">Available Balance</p>
                                    <p className="text-3xl font-bold">₹{dashboard.balance.pending.toLocaleString()}</p>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setLocation("/reseller/payouts")}
                                    disabled={dashboard.balance.pending < 100}
                                >
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Withdraw
                                </Button>
                            </div>
                            <div className="flex justify-between text-sm opacity-80">
                                <span>Total Earnings</span>
                                <span className="font-medium">₹{dashboard.balance.total.toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                                    <Eye className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{dashboard.today.clicks}</p>
                                    <p className="text-sm text-muted-foreground">Today's Clicks</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                                    <ShoppingBag className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{dashboard.today.orders}</p>
                                    <p className="text-sm text-muted-foreground">Today's Orders</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">₹{dashboard.today.earnings.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">Today's Earnings</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                                    <BarChart3 className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{dashboard.thisMonth.orders}</p>
                                    <p className="text-sm text-muted-foreground">This Month</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation("/reseller/catalog")}>
                        <CardContent className="pt-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-lg bg-primary/10">
                                    <Share2 className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold">Share Products</p>
                                    <p className="text-sm text-muted-foreground">Browse catalog & create links</p>
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation("/reseller/earnings")}>
                        <CardContent className="pt-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-lg bg-green-100">
                                    <TrendingUp className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="font-semibold">View Earnings</p>
                                    <p className="text-sm text-muted-foreground">Commission breakdown</p>
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation("/reseller/bank")}>
                        <CardContent className="pt-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-lg bg-blue-100">
                                    <CreditCard className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-semibold">Bank Settings</p>
                                    <p className="text-sm text-muted-foreground">Manage payout details</p>
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </CardContent>
                    </Card>
                </div>

                {/* Top Links */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Top Performing Links</CardTitle>
                            <CardDescription>Your best converting product shares</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                            <Link to="/reseller/links">
                                View All
                                <ArrowUpRight className="ml-1 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {dashboard.topLinks.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No product links yet</p>
                                <Button variant="ghost" onClick={() => setLocation("/reseller/catalog")}>
                                    Create your first share link
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {dashboard.topLinks.map((link) => (
                                    <div key={link.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50">
                                        <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden">
                                            {link.product?.images?.[0] && (
                                                <img
                                                    src={link.product.images[0]}
                                                    alt={link.product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">
                                                {link.product?.name || `Link ${link.shortCode}`}
                                            </p>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Eye className="h-3 w-3" /> {link.clicks}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <ShoppingBag className="h-3 w-3" /> {link.conversions}
                                                </span>
                                                <span className="text-green-600">
                                                    {link.clicks > 0
                                                        ? ((link.conversions / link.clicks) * 100).toFixed(1)
                                                        : 0}% conversion
                                                </span>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/r/${link.shortCode}`);
                                        }}>
                                            <Share2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
