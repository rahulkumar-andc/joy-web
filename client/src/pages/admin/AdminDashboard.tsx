import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";
import { Loader2, DollarSign, ShoppingBag, Package } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/layout";

interface DashboardStats {
    orders: Record<string, number>;
    products: Record<string, number>;
    users: Record<string, number>;
    revenue: {
        total: number;
        daily: DailySales[];
    };
    overview: {
        totalOrders: number;
        activeProducts: number;
        pendingProducts: number;
        totalSellers: number;
        totalUsers: number;
    };
}

interface DailySales {
    date: string;
    total: number;
}

interface TopProduct {
    name: string;
    totalSold: number;
}

export default function AdminDashboard() {
    // Queries
    const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
        queryKey: ["/api/admin/stats/dashboard"],
    });

    const { data: topProducts, isLoading: productsLoading } = useQuery<TopProduct[]>({
        queryKey: ["/api/admin/stats/top-products"],
    });

    if (statsLoading || productsLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
        );
    }

    // Pie Chart Data
    const pieData = stats?.orders
        ? Object.keys(stats.orders).map((status) => ({
            name: status,
            value: Number(stats.orders[status]),
        }))
        : [];

    const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];


    return (
        <AdminLayout
            title="Admin Dashboard"
            subtitle="Overview of platform performance and key metrics"
            actions={
                <Link href="/admin/campaigns">
                    <Button>Manage Campaigns</Button>
                </Link>
            }
        >
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${stats?.revenue.total.toFixed(2) || "0.00"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Last 30 days
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.overview.totalOrders || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            All time
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Products</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.overview.activeProducts || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.overview.pendingProducts || 0} pending review
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sellers</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.overview.totalSellers || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.overview.totalUsers || 0} total users
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Sales Chart */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Sales Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats?.revenue.daily || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `$${value}`}
                                    />
                                    <Tooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#8884d8"
                                        strokeWidth={2}
                                        activeDot={{ r: 8 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Order Status Pie Chart */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Order Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Products */}
            <Card>
                <CardHeader>
                    <CardTitle>Top Selling Products</CardTitle>
                    <CardDescription>
                        Most popular items based on quantity sold.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProducts || []} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={150} />
                                <Tooltip />
                                <Bar dataKey="totalSold" fill="#82ca9d" barSize={20} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </AdminLayout>
    );
}
