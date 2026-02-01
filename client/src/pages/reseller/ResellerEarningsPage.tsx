import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
    DollarSign,
    TrendingUp,
    Calendar,
    ShoppingBag,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    ChevronLeft,
    Filter,
    Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface Commission {
    id: number;
    orderId: number;
    orderAmount: string;
    baseCommissionRate: string;
    baseCommissionAmount: string;
    marginEarnings: string;
    totalAmount: string;
    status: "pending" | "confirmed" | "cancelled" | "refunded" | "paid";
    createdAt: string;
    order?: {
        status: string;
    };
}

const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
    pending: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100" },
    confirmed: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
    cancelled: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
    refunded: { icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-100" },
    paid: { icon: DollarSign, color: "text-blue-600", bg: "bg-blue-100" },
};

export default function ResellerEarningsPage() {
    const [statusFilter, setStatusFilter] = useState("");

    const { data: commissions, isLoading } = useQuery<Commission[]>({
        queryKey: ["/api/reseller/commissions", { status: statusFilter || undefined }],
    });

    // Calculate summary stats
    const stats = {
        total: commissions?.reduce((sum, c) => sum + parseFloat(c.totalAmount), 0) || 0,
        pending: commissions?.filter(c => c.status === "pending").reduce((sum, c) => sum + parseFloat(c.totalAmount), 0) || 0,
        confirmed: commissions?.filter(c => c.status === "confirmed").reduce((sum, c) => sum + parseFloat(c.totalAmount), 0) || 0,
        paid: commissions?.filter(c => c.status === "paid").reduce((sum, c) => sum + parseFloat(c.totalAmount), 0) || 0,
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Earnings & Commissions</h1>
                        <p className="text-muted-foreground">
                            Track your commission from every sale
                        </p>
                    </div>
                    <Link to="/reseller/dashboard">
                        <Button variant="outline">
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Button>
                    </Link>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">₹{stats.total.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">Total Earned</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">₹{stats.pending.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">Pending</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                                    <CheckCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">₹{stats.confirmed.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">Available</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">₹{stats.paid.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">Paid Out</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Commission Status Guide */}
                <Card className="mb-6">
                    <CardContent className="py-4">
                        <div className="flex flex-wrap gap-4 justify-center text-sm">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                                    Pending
                                </Badge>
                                <span className="text-muted-foreground">Awaiting delivery</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                                    Confirmed
                                </Badge>
                                <span className="text-muted-foreground">Ready to withdraw</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                                    Paid
                                </Badge>
                                <span className="text-muted-foreground">Transferred to you</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Filters */}
                <div className="flex gap-4 mb-6">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-48">
                            <Filter className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>

                {/* Commission List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Commission History</CardTitle>
                        <CardDescription>All your earnings from orders</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-4">
                                {Array(5).fill(0).map((_, i) => (
                                    <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                                        <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                                        <div className="flex-1">
                                            <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
                                            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                                        </div>
                                        <div className="h-6 bg-slate-200 rounded w-20"></div>
                                    </div>
                                ))}
                            </div>
                        ) : commissions?.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No commissions yet</p>
                                <Link to="/reseller/catalog">
                                    <Button variant="ghost">Start sharing products to earn</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {commissions?.map((commission) => {
                                    const config = statusConfig[commission.status] || statusConfig.pending;
                                    const Icon = config.icon;

                                    return (
                                        <div
                                            key={commission.id}
                                            className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                        >
                                            <div className={`p-2 rounded-lg ${config.bg}`}>
                                                <Icon className={`h-5 w-5 ${config.color}`} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium">Order #{commission.orderId}</span>
                                                    <Badge
                                                        variant="outline"
                                                        className={`${config.bg} ${config.color} border-0 capitalize`}
                                                    >
                                                        {commission.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {formatDate(commission.createdAt)}
                                                    </span>
                                                    <span>
                                                        Order: ₹{parseFloat(commission.orderAmount).toLocaleString()}
                                                    </span>
                                                    <span>
                                                        Rate: {(parseFloat(commission.baseCommissionRate) * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="font-bold text-lg text-green-600">
                                                    +₹{parseFloat(commission.totalAmount).toLocaleString()}
                                                </p>
                                                {parseFloat(commission.marginEarnings) > 0 && (
                                                    <p className="text-xs text-muted-foreground">
                                                        incl. ₹{parseFloat(commission.marginEarnings).toFixed(0)} margin
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
