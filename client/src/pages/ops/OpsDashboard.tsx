/**
 * OPS Dashboard
 * 
 * Main dashboard for OPS_ADMIN and OPS_MANAGER roles.
 * Provides order management, courier assignment, and delivery tracking.
 */

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
    Package, Truck, Users, DollarSign,
    LayoutDashboard, ChevronRight, Clock,
    CheckCircle, AlertCircle, MapPin
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Sidebar navigation items
const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/ops/dashboard" },
    { icon: Package, label: "Orders", href: "/ops/orders" },
    { icon: Truck, label: "Couriers", href: "/ops/couriers" },
    { icon: MapPin, label: "Deliveries", href: "/ops/deliveries" },
    { icon: DollarSign, label: "COD Settlement", href: "/ops/cod" },
];

// Stats Card Component
function StatsCard({
    title,
    value,
    description,
    icon: Icon,
    trend,
    loading
}: {
    title: string;
    value: string | number;
    description?: string;
    icon: any;
    trend?: { value: number; label: string };
    loading?: boolean;
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
                    <p className={`text-xs mt-1 ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

// Sidebar Component
function OpsSidebar() {
    const [location] = useLocation();

    return (
        <aside className="w-64 min-h-screen bg-card border-r hidden lg:block">
            <div className="p-6 border-b">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Truck className="h-6 w-6 text-primary" />
                    OPS Dashboard
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Operations Management</p>
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

// Order Status Badge
function OrderStatusBadge({ status }: { status: string }) {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
        pending: { variant: "outline", label: "Pending" },
        confirmed: { variant: "secondary", label: "Confirmed" },
        packed: { variant: "default", label: "Packed" },
        shipped: { variant: "default", label: "Shipped" },
        delivered: { variant: "secondary", label: "Delivered" },
        cancelled: { variant: "destructive", label: "Cancelled" },
    };

    const config = statusConfig[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function OpsDashboard() {
    const { toast } = useToast();
    const [selectedCourier, setSelectedCourier] = useState<string>("");

    // Fetch dashboard stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ["ops-stats"],
        queryFn: async () => {
            // Aggregate from multiple endpoints
            const [ordersRes, couriersRes] = await Promise.all([
                fetch("/api/admin/orders?status=packed,shipped", { credentials: "include" }),
                fetch("/api/admin/deliveries/couriers", { credentials: "include" }),
            ]);

            const orders = ordersRes.ok ? await ordersRes.json() : [];
            const couriersData = couriersRes.ok ? await couriersRes.json() : { couriers: [] };

            return {
                pendingOrders: Array.isArray(orders) ? orders.filter((o: any) => o.status === "packed").length : 0,
                shippedOrders: Array.isArray(orders) ? orders.filter((o: any) => o.status === "shipped").length : 0,
                activeCouriers: couriersData.couriers?.length || 0,
                todayDeliveries: 0, // Would need additional API
            };
        },
    });

    // Fetch pending orders for assignment
    const { data: pendingOrders, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
        queryKey: ["ops-pending-orders"],
        queryFn: async () => {
            const res = await fetch("/api/admin/orders?status=packed", { credentials: "include" });
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data) ? data.slice(0, 10) : []; // Show latest 10
        },
    });

    // Fetch available couriers
    const { data: couriers } = useQuery({
        queryKey: ["available-couriers"],
        queryFn: async () => {
            const res = await fetch("/api/admin/deliveries/couriers", { credentials: "include" });
            if (!res.ok) return [];
            const data = await res.json();
            return data.couriers || [];
        },
    });

    // Assign courier to order
    const handleAssignCourier = async (orderId: number) => {
        if (!selectedCourier) {
            toast({ title: "Select a courier", variant: "destructive" });
            return;
        }

        try {
            const res = await fetch(`/api/admin/orders/${orderId}/assign-courier`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ courierId: parseInt(selectedCourier) }),
            });

            if (!res.ok) throw new Error("Failed to assign courier");

            toast({ title: "Courier assigned successfully!" });
            refetchOrders();
        } catch (error) {
            toast({ title: "Failed to assign courier", variant: "destructive" });
        }
    };

    return (
        <div className="flex min-h-screen bg-background">
            <OpsSidebar />

            <main className="flex-1 p-6 lg:p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">Operations Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage orders, couriers, and deliveries
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    <StatsCard
                        title="Pending Orders"
                        value={stats?.pendingOrders || 0}
                        description="Ready for dispatch"
                        icon={Package}
                        loading={statsLoading}
                    />
                    <StatsCard
                        title="In Transit"
                        value={stats?.shippedOrders || 0}
                        description="Currently being delivered"
                        icon={Truck}
                        loading={statsLoading}
                    />
                    <StatsCard
                        title="Active Couriers"
                        value={stats?.activeCouriers || 0}
                        description="Available for assignment"
                        icon={Users}
                        loading={statsLoading}
                    />
                    <StatsCard
                        title="Today's Deliveries"
                        value={stats?.todayDeliveries || 0}
                        description="Completed today"
                        icon={CheckCircle}
                        loading={statsLoading}
                    />
                </div>

                {/* Quick Actions */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Pending Orders for Assignment */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Orders Ready for Dispatch
                            </CardTitle>
                            <CardDescription>
                                Assign couriers to packed orders
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {ordersLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                                </div>
                            ) : pendingOrders?.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>No orders pending dispatch</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Order #</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Courier</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingOrders?.map((order: any) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-medium">
                                                    #{order.id}
                                                </TableCell>
                                                <TableCell>
                                                    <OrderStatusBadge status={order.status} />
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={selectedCourier}
                                                        onValueChange={setSelectedCourier}
                                                    >
                                                        <SelectTrigger className="w-32">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {couriers?.map((c: any) => (
                                                                <SelectItem
                                                                    key={c.id}
                                                                    value={c.id.toString()}
                                                                >
                                                                    {c.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAssignCourier(order.id)}
                                                    >
                                                        Assign
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                            <div className="mt-4">
                                <Link href="/ops/orders">
                                    <Button variant="outline" className="w-full">
                                        View All Orders
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active Couriers */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Active Couriers
                            </CardTitle>
                            <CardDescription>
                                Delivery partners available today
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {couriers?.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>No active couriers</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {couriers?.slice(0, 5).map((courier: any) => (
                                        <div
                                            key={courier.id}
                                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                        >
                                            <div>
                                                <p className="font-medium">{courier.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {courier.email}
                                                </p>
                                            </div>
                                            <Badge variant="outline">Available</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="mt-4">
                                <Link href="/ops/couriers">
                                    <Button variant="outline" className="w-full">
                                        Manage Couriers
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
