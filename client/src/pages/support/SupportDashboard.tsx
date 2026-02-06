/**
 * Support Dashboard
 * 
 * Main dashboard for SUPPORT_ADMIN and SUPPORT_AGENT roles.
 * Provides ticket management, refund processing, and customer support tools.
 */

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
    Headphones, MessageSquare, RefreshCw, Users,
    LayoutDashboard, ChevronRight, Clock,
    AlertTriangle, CheckCircle, Search
} from "lucide-react";
import { useAdminTickets } from "@/hooks/use-support";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
    { icon: LayoutDashboard, label: "Dashboard", href: "/support/dashboard" },
    { icon: MessageSquare, label: "Tickets", href: "/support/tickets" },
    { icon: RefreshCw, label: "Refunds", href: "/support/refunds" },
    { icon: Users, label: "Customers", href: "/support/customers" },
];

// Stats Card Component
function StatsCard({
    title,
    value,
    description,
    icon: Icon,
    loading,
    variant = "default"
}: {
    title: string;
    value: string | number;
    description?: string;
    icon: any;
    loading?: boolean;
    variant?: "default" | "warning" | "success";
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

    const variantStyles = {
        default: "bg-primary/10 text-primary",
        warning: "bg-yellow-100 text-yellow-700",
        success: "bg-green-100 text-green-700",
    };

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${variantStyles[variant]}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

// Sidebar Component
function SupportSidebar() {
    const [location] = useLocation();

    return (
        <aside className="w-64 min-h-screen bg-card border-r hidden lg:block">
            <div className="p-6 border-b">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Headphones className="h-6 w-6 text-primary" />
                    Support Center
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Customer Support</p>
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

// Priority Badge
function PriorityBadge({ priority }: { priority: string }) {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
        high: { variant: "destructive", label: "High" },
        medium: { variant: "default", label: "Medium" },
        low: { variant: "outline", label: "Low" },
    };
    const p = config[priority] || config.medium;
    return <Badge variant={p.variant}>{p.label}</Badge>;
}

export default function SupportDashboard() {
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch support stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ["support-stats"],
        queryFn: async () => {
            // Would integrate with real ticket/refund APIs
            const refundsRes = await fetch("/api/admin/refunds", { credentials: "include" });
            const refunds = refundsRes.ok ? await refundsRes.json() : [];

            return {
                openTickets: 12, // Mock - would come from ticket system
                pendingRefunds: Array.isArray(refunds) ? refunds.filter((r: any) => r.status === "pending").length : 0,
                resolvedToday: 8, // Mock
                avgResponseTime: "2.5h", // Mock
            };
        },
    });

    // Fetch real tickets
    // Import hook at top first: import { useAdminTickets } from "@/hooks/use-support";
    // But I can't add import here. I need to add import in a separate block or verify if I can edit imports and body in one go? 
    // Usually I should do imports first.
    // I will use replace_file_content for imports first.
    // This step targets the body.

    // Actually, let's just use the hook here assuming I add the import.
    // I'll add the import in the next step or do it properly now.
    // I'll update the body now and add import as separate step.

    const { data: ticketsData, isLoading: ticketsLoading } = useAdminTickets({ limit: 5 });
    const recentTickets = ticketsData?.tickets?.map((t: any) => ({
        id: t.id,
        subject: t.subject,
        customer: t.user?.name || t.user?.email || "Unknown",
        priority: t.priority.toLowerCase(),
        status: t.status.toLowerCase(),
        created: new Date(t.createdAt).toLocaleDateString() + " " + new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })) || [];

    // Fetch pending refunds
    const { data: pendingRefunds, isLoading: refundsLoading } = useQuery({
        queryKey: ["pending-refunds"],
        queryFn: async () => {
            const res = await fetch("/api/admin/refunds?status=pending", { credentials: "include" });
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data) ? data.slice(0, 5) : [];
        },
    });

    return (
        <div className="flex min-h-screen bg-background">
            <SupportSidebar />

            <main className="flex-1 p-6 lg:p-8">
                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Support Dashboard</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage tickets, refunds, and customer issues
                        </p>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search customer or order..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    <StatsCard
                        title="Open Tickets"
                        value={stats?.openTickets || 0}
                        description="Awaiting response"
                        icon={MessageSquare}
                        loading={statsLoading}
                        variant="warning"
                    />
                    <StatsCard
                        title="Pending Refunds"
                        value={stats?.pendingRefunds || 0}
                        description="Needs approval"
                        icon={RefreshCw}
                        loading={statsLoading}
                    />
                    <StatsCard
                        title="Resolved Today"
                        value={stats?.resolvedToday || 0}
                        description="Issues closed"
                        icon={CheckCircle}
                        loading={statsLoading}
                        variant="success"
                    />
                    <StatsCard
                        title="Avg Response Time"
                        value={stats?.avgResponseTime || "N/A"}
                        description="First response"
                        icon={Clock}
                        loading={statsLoading}
                    />
                </div>

                {/* Content Grid */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Recent Tickets */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                Recent Tickets
                            </CardTitle>
                            <CardDescription>
                                Latest customer issues
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Priority</TableHead>
                                        <TableHead>Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentTickets.map((ticket: any) => (
                                        <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50">
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{ticket.subject}</p>
                                                    <p className="text-sm text-muted-foreground">{ticket.customer}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <PriorityBadge priority={ticket.priority} />
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {ticket.created}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <div className="mt-4">
                                <Link href="/support/tickets">
                                    <Button variant="outline" className="w-full">
                                        View All Tickets
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pending Refunds */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <RefreshCw className="h-5 w-5" />
                                Pending Refunds
                            </CardTitle>
                            <CardDescription>
                                Refund requests awaiting approval
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {refundsLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                                </div>
                            ) : pendingRefunds?.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>No pending refunds</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pendingRefunds?.map((refund: any) => (
                                        <div
                                            key={refund.id}
                                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                        >
                                            <div>
                                                <p className="font-medium">Order #{refund.orderId}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    ₹{refund.amount}
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
                                <Link href="/admin/refunds">
                                    <Button variant="outline" className="w-full">
                                        View All Refunds
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
