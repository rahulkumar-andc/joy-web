import { useAdminStats } from "@/hooks/use-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingBag, Users, AlertTriangle, TrendingUp } from "lucide-react";
import { RevenueChart } from "@/components/admin/RevenueChart";
export function AnalyticsDashboard() {
    const { data: stats, isLoading } = useAdminStats();

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-muted rounded-xl" />
                ))}
            </div>
        );
    }

    if (!stats) return <div>Failed to load stats</div>;

    const cards = [
        {
            title: "Total Revenue",
            value: `₹${stats.totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: "text-green-600",
        },
        {
            title: "Total Orders",
            value: stats.totalOrders,
            icon: ShoppingBag,
            color: "text-blue-600",
        },
        {
            title: "Active Users",
            value: stats.totalUsers,
            icon: Users,
            color: "text-purple-600",
        },
        {
            title: "Low Stock Items",
            value: stats.lowStockCount,
            icon: AlertTriangle,
            color: stats.lowStockCount > 0 ? "text-red-600" : "text-gray-600",
        },
    ];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card) => (
                    <Card key={card.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {card.title}
                            </CardTitle>
                            <card.icon className={`h-4 w-4 ${card.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Revenue Chart */}
            <RevenueChart />
        </div>
    );
}
