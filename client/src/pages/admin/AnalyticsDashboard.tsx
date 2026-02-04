import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Download, Calendar, Eye, MousePointerClick, Trophy, RefreshCw, Truck, Tag, DollarSign, Package } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface CampaignStats {
    id: number;
    name: string;
    stats: {
        impressions: number;
        clicks: number;
    };
}

interface VariantStats {
    id: number;
    variantName: string;
    trafficPercentage: number;
    isActive: boolean;
    stats: {
        impressions: number;
        clicks: number;
        ctr: number;
    };
}

export default function AnalyticsDashboard() {
    const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
    const [dateRange, setDateRange] = useState("7d");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch all campaigns with stats
    const { data: campaigns = [], isLoading } = useQuery<CampaignStats[]>({
        queryKey: ["/api/admin/hero"],
        queryFn: () => apiRequest("GET", "/api/admin/hero").then(r => r.json()),
    });

    // Fetch variants for selected campaign
    const { data: variants = [] } = useQuery<VariantStats[]>({
        queryKey: ["/api/admin/hero", selectedCampaign, "variants"],
        queryFn: () => apiRequest("GET", `/api/admin/hero/${selectedCampaign}/variants`).then(r => r.json()),
        enabled: !!selectedCampaign,
    });

    // Fetch coupon analytics
    const { data: couponData } = useQuery<{
        period: string;
        revenueImpact: { totalOrdersWithCoupons: number; totalRevenueWithCoupons: number; totalDiscountGiven: number; };
        topCouponsByUsage: Array<{ code: string; totalUsage: number; totalRevenue: number; }>;
        topCouponsByRevenue: Array<{ code: string; totalUsage: number; totalRevenue: number; }>;
    }>({
        queryKey: ["/api/admin/analytics/coupons/dashboard"],
        queryFn: () => fetch("/api/admin/analytics/coupons/dashboard", { credentials: "include" }).then(r => r.json()),
    });

    // Fetch shipping analytics
    const { data: shippingData } = useQuery<{
        summary: { totalOrders: number; freeShippingOrders: number; paidShippingOrders: number; freeShippingPercentage: number; totalShippingRevenue: number; avgOrderValue: number; };
        dailyBreakdown: Array<{ date: string; totalOrders: number; freeOrders: number; paidOrders: number; shippingRevenue: number; }>;
        thresholdAnalysis: { ordersBelow499: number; orders499to999: number; ordersAbove999: number; };
    }>({
        queryKey: ["/api/admin/shipping/analytics"],
        queryFn: () => fetch("/api/admin/shipping/analytics?days=" + (dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90), { credentials: "include" }).then(r => r.json()),
    });

    // Auto-promote mutation
    const autoPromoteMutation = useMutation({
        mutationFn: (campaignId: number) =>
            apiRequest("POST", `/api/admin/hero/${campaignId}/auto-promote`, { minImpressions: 100 }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/hero"] });
            toast({ title: "Winner promoted!", description: "The best performing variant is now at 100% traffic." });
        },
    });

    // Calculate totals
    const totalImpressions = campaigns.reduce((sum, c) => sum + c.stats.impressions, 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + c.stats.clicks, 0);
    const overallCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

    // Export to CSV
    const exportToCSV = () => {
        const headers = ["Campaign", "Impressions", "Clicks", "CTR"];
        const rows = campaigns.map(c => [
            c.name,
            c.stats.impressions,
            c.stats.clicks,
            c.stats.impressions > 0 ? ((c.stats.clicks / c.stats.impressions) * 100).toFixed(2) + "%" : "0%"
        ]);

        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `campaign-analytics-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Campaign Analytics</h1>
                    <p className="text-muted-foreground">Track performance and optimize your campaigns</p>
                </div>
                <div className="flex gap-2">
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Date range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1d">Last 24h</SelectItem>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="all">All time</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={exportToCSV}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalImpressions.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Across all campaigns</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                        <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalClicks.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">CTA button clicks</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Overall CTR</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{overallCTR}%</div>
                        <p className="text-xs text-muted-foreground">Click-through rate</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="campaigns" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                    <TabsTrigger value="ab-testing">A/B Testing</TabsTrigger>
                    <TabsTrigger value="coupons" className="flex items-center gap-1">
                        <Tag className="h-3 w-3" /> Coupons
                    </TabsTrigger>
                    <TabsTrigger value="shipping" className="flex items-center gap-1">
                        <Truck className="h-3 w-3" /> Shipping
                    </TabsTrigger>
                </TabsList>

                {/* Campaigns Tab */}
                <TabsContent value="campaigns" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Campaign Performance</CardTitle>
                            <CardDescription>Click-through rates for each campaign</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center h-40">Loading...</div>
                            ) : campaigns.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No campaigns found</div>
                            ) : (
                                <div className="space-y-4">
                                    {campaigns.map(campaign => {
                                        const ctr = campaign.stats.impressions > 0
                                            ? ((campaign.stats.clicks / campaign.stats.impressions) * 100).toFixed(2)
                                            : "0.00";
                                        const barWidth = Math.min(parseFloat(ctr) * 10, 100);

                                        return (
                                            <div key={campaign.id} className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-medium">{campaign.name}</span>
                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Eye className="h-3 w-3" />
                                                            {campaign.stats.impressions.toLocaleString()}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <MousePointerClick className="h-3 w-3" />
                                                            {campaign.stats.clicks.toLocaleString()}
                                                        </span>
                                                        <Badge variant={parseFloat(ctr) > 2 ? "default" : "secondary"}>
                                                            {ctr}% CTR
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary rounded-full transition-all duration-500"
                                                        style={{ width: `${barWidth}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* A/B Testing Tab */}
                <TabsContent value="ab-testing" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>A/B Test Results</CardTitle>
                            <CardDescription>Compare variant performance and promote winners</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4">
                                <Select
                                    value={selectedCampaign?.toString() || ""}
                                    onValueChange={(v) => setSelectedCampaign(parseInt(v))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a campaign" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {campaigns.map(c => (
                                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedCampaign && variants.length > 0 ? (
                                <div className="space-y-4">
                                    {variants.map(variant => {
                                        const isWinner = variants.every(v => v.id === variant.id || variant.stats.ctr >= v.stats.ctr);

                                        return (
                                            <div key={variant.id} className="p-4 border rounded-lg space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">Variant {variant.variantName}</span>
                                                        {isWinner && variant.stats.impressions >= 100 && (
                                                            <Badge className="bg-yellow-500">
                                                                <Trophy className="h-3 w-3 mr-1" />
                                                                Winner
                                                            </Badge>
                                                        )}
                                                        <Badge variant={variant.isActive ? "default" : "secondary"}>
                                                            {variant.trafficPercentage}% traffic
                                                        </Badge>
                                                    </div>
                                                    <Badge variant={variant.stats.ctr > 2 ? "default" : "outline"}>
                                                        {variant.stats.ctr.toFixed(2)}% CTR
                                                    </Badge>
                                                </div>
                                                <div className="flex gap-6 text-sm text-muted-foreground">
                                                    <span>👁️ {variant.stats.impressions.toLocaleString()} impressions</span>
                                                    <span>🖱️ {variant.stats.clicks.toLocaleString()} clicks</span>
                                                </div>
                                                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${isWinner ? "bg-yellow-500" : "bg-primary"}`}
                                                        style={{ width: `${Math.min(variant.stats.ctr * 10, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <Button
                                        onClick={() => autoPromoteMutation.mutate(selectedCampaign)}
                                        disabled={autoPromoteMutation.isPending}
                                        className="w-full"
                                    >
                                        {autoPromoteMutation.isPending ? (
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Trophy className="h-4 w-4 mr-2" />
                                        )}
                                        Auto-Promote Winner
                                    </Button>
                                </div>
                            ) : selectedCampaign ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No variants found for this campaign
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    Select a campaign to view A/B test results
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Coupons Analytics Tab */}
                <TabsContent value="coupons" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Orders with Coupons</CardTitle>
                                <Tag className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{couponData?.revenueImpact?.totalOrdersWithCoupons?.toLocaleString() || 0}</div>
                                <p className="text-xs text-muted-foreground">{couponData?.period}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Revenue from Coupon Orders</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{couponData?.revenueImpact?.totalRevenueWithCoupons?.toLocaleString() || 0}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Total Discounts</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{couponData?.revenueImpact?.totalDiscountGiven?.toLocaleString() || 0}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Top Coupons by Usage</CardTitle>
                            <CardDescription>Most frequently used coupon codes</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {couponData?.topCouponsByUsage && couponData.topCouponsByUsage.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={couponData.topCouponsByUsage}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="code" />
                                        <YAxis />
                                        <Tooltip formatter={(value: number) => value.toLocaleString()} />
                                        <Bar dataKey="totalUsage" fill="#8884d8" name="Usage Count" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">No coupon data available</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Shipping Analytics Tab */}
                <TabsContent value="shipping" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{shippingData?.summary?.totalOrders?.toLocaleString() || 0}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Free Shipping</CardTitle>
                                <Truck className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{shippingData?.summary?.freeShippingPercentage || 0}%</div>
                                <p className="text-xs text-muted-foreground">{shippingData?.summary?.freeShippingOrders || 0} orders</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Shipping Revenue</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{shippingData?.summary?.totalShippingRevenue?.toLocaleString() || 0}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₹{shippingData?.summary?.avgOrderValue?.toLocaleString() || 0}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Orders by Value Threshold</CardTitle>
                                <CardDescription>Distribution of orders relative to free shipping threshold</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {shippingData?.thresholdAnalysis ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: "Below ₹499", value: shippingData.thresholdAnalysis.ordersBelow499, color: "#ef4444" },
                                                    { name: "₹499-999", value: shippingData.thresholdAnalysis.orders499to999, color: "#f59e0b" },
                                                    { name: "Above ₹999", value: shippingData.thresholdAnalysis.ordersAbove999, color: "#22c55e" },
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                dataKey="value"
                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            >
                                                {[
                                                    { color: "#ef4444" },
                                                    { color: "#f59e0b" },
                                                    { color: "#22c55e" },
                                                ].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">No threshold data</div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Daily Orders Trend</CardTitle>
                                <CardDescription>Free vs paid shipping orders over time</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {shippingData?.dailyBreakdown && shippingData.dailyBreakdown.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <LineChart data={shippingData.dailyBreakdown.slice().reverse()}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} />
                                            <YAxis />
                                            <Tooltip labelFormatter={(v) => new Date(v).toLocaleDateString()} />
                                            <Line type="monotone" dataKey="freeOrders" stroke="#22c55e" name="Free Shipping" />
                                            <Line type="monotone" dataKey="paidOrders" stroke="#ef4444" name="Paid Shipping" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">No daily data available</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
