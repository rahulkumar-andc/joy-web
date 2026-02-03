import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/layout";
import {
    Loader2,
    Search,
    Eye,
    ChevronLeft,
    ChevronRight,
    Package,
    Truck,
    CheckCircle,
    XCircle,
    Clock
} from "lucide-react";
import { format } from "date-fns";

interface Order {
    id: number;
    userId: number;
    totalAmount: string; // Decimal string
    status: string;
    createdAt: string;
    shippingAddress: any;
    items: any[];
    user: {
        name: string;
        email: string;
    };
    paymentStatus?: string;
}

const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    paid: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
};

const statusIcons: Record<string, any> = {
    pending: Clock,
    processing: Package,
    shipped: Truck,
    delivered: CheckCircle,
    cancelled: XCircle,
    paid: CheckCircle,
};

export default function AdminOrders() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Fetch Orders
    const { data, isLoading } = useQuery({
        queryKey: ["admin-orders", page, statusFilter, search],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
            });
            if (statusFilter !== "all") params.set("status", statusFilter);
            if (search) params.set("search", search);

            const res = await fetch(`/api/admin/orders?${params}`, {
                credentials: "include"
            });
            if (!res.ok) throw new Error("Failed to fetch orders");
            return res.json();
        },
    });

    // Update Status Mutation
    const updateStatusMutation = useMutation({
        mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
            const res = await fetch(`/api/admin/orders/${orderId}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ status }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to update status");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
            toast({
                title: "Status Updated",
                description: `Order status changed successfully`,
            });
            setSelectedOrder(null);
        },
        onError: (error: Error) => {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleStatusUpdate = (orderId: number, newStatus: string) => {
        updateStatusMutation.mutate({ orderId, status: newStatus });
    };

    if (isLoading) {
        return (
            <div className="flex bg-background h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
        );
    }

    return (
        <AdminLayout
            title="Orders Management"
            subtitle="View and manage customer orders"
        >
            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by Order ID, Customer Name or Email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Orders</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="shipped">Shipped</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Orders ({data?.total || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data?.orders?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No orders found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.orders?.map((order: Order) => {
                                    const Icon = statusIcons[order.status] || Package;
                                    return (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">#{order.id}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{order.user.name}</span>
                                                    <span className="text-xs text-muted-foreground">{order.user.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(order.createdAt), "MMM d, yyyy HH:mm")}
                                            </TableCell>
                                            <TableCell>₹{parseFloat(order.totalAmount).toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Badge className={`${statusColors[order.status] || "bg-gray-100"} flex items-center gap-1 w-fit`}>
                                                    <Icon className="h-3 w-3" />
                                                    <span className="capitalize">{order.status}</span>
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            Manage Status
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Update Order Status #{order.id}</DialogTitle>
                                                            <DialogDescription>
                                                                Change the status of this order.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="status" className="text-right">
                                                                    Status
                                                                </Label>
                                                                <Select
                                                                    defaultValue={order.status}
                                                                    onValueChange={(val) => handleStatusUpdate(order.id, val)}
                                                                >
                                                                    <SelectTrigger className="col-span-3">
                                                                        <SelectValue placeholder="Select status" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="pending">Pending</SelectItem>
                                                                        <SelectItem value="paid">Paid</SelectItem>
                                                                        <SelectItem value="processing">Processing</SelectItem>
                                                                        <SelectItem value="shipped">Shipped</SelectItem>
                                                                        <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                                                                        <SelectItem value="delivered">Delivered</SelectItem>
                                                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {data?.total > 20 && (
                        <div className="flex justify-center items-center gap-2 mt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                Page {page} of {Math.ceil(data.total / 20)}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => p + 1)}
                                disabled={page >= Math.ceil(data.total / 20)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </AdminLayout>
    );
}
