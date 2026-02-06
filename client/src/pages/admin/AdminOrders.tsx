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
    Clock,
    AlertTriangle,
    User,
    MapPin,
    Banknote
} from "lucide-react";
import { format } from "date-fns";

interface Order {
    id: number;
    displayId?: string;
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
    // Delivery System Fields
    deliveryStatus?: string;
    assignedCourier?: number;
    courierName?: string;
    isSuspiciousDelivery?: boolean;
    suspiciousReason?: string;
    codAmount?: string;
    codCollected?: boolean;
    paymentSettled?: boolean;
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
    const [codDialogOrder, setCodDialogOrder] = useState<Order | null>(null);
    const [codAmount, setCodAmount] = useState("");

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
            // Extract CSRF token from cookie
            const csrfToken = document.cookie
                .split("; ")
                .find(row => row.startsWith("CSRF-TOKEN="))
                ?.split("=")[1];

            const res = await fetch(`/api/orders/${orderId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrfToken || ""
                },
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

    // COD Collection Mutation
    const collectCodMutation = useMutation({
        mutationFn: async ({ orderId, amountCollected }: { orderId: number; amountCollected: string }) => {
            const csrfToken = document.cookie
                .split("; ")
                .find(row => row.startsWith("CSRF-TOKEN="))
                ?.split("=")[1];

            const res = await fetch(`/api/admin/orders/${orderId}/collect-cod`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrfToken || ""
                },
                credentials: "include",
                body: JSON.stringify({ amountCollected }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to collect COD");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
            toast({
                title: "COD Collected",
                description: "Cash on delivery amount has been marked as collected.",
            });
            setCodDialogOrder(null);
            setCodAmount("");
        },
        onError: (error: Error) => {
            toast({
                title: "Collection Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleCollectCod = () => {
        if (codDialogOrder) {
            collectCodMutation.mutate({
                orderId: codDialogOrder.id,
                amountCollected: codAmount || codDialogOrder.codAmount || "0"
            });
        }
    };

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
                                placeholder="Search by Order ID (ORD-XXX), Name or Email..."
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
                                <TableHead>Delivery</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data?.orders?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No orders found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.orders?.map((order: Order) => {
                                    const Icon = statusIcons[order.status] || Package;
                                    return (
                                        <TableRow key={order.id} className={order.isSuspiciousDelivery ? "bg-red-50 dark:bg-red-900/10" : ""}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {order.displayId || `#${order.id}`}
                                                    {order.isSuspiciousDelivery && (
                                                        <span title={order.suspiciousReason || "Suspicious delivery"}>
                                                            <AlertTriangle className="h-4 w-4 text-red-500" />
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{order.user.name}</span>
                                                    <span className="text-xs text-muted-foreground">{order.user.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(order.createdAt), "MMM d, yyyy HH:mm")}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span>₹{parseFloat(order.totalAmount).toLocaleString()}</span>
                                                    {order.codAmount && parseFloat(order.codAmount) > 0 && (
                                                        <span className="text-xs text-yellow-600 dark:text-yellow-400">
                                                            COD: ₹{parseFloat(order.codAmount).toLocaleString()}
                                                            {order.codCollected && <span className="text-green-600"> (Collected)</span>}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${statusColors[order.status] || "bg-gray-100"} flex items-center gap-1 w-fit`}>
                                                    <Icon className="h-3 w-3" />
                                                    <span className="capitalize">{order.status}</span>
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {order.deliveryStatus ? (
                                                        <Badge variant="outline" className="w-fit capitalize">
                                                            {order.deliveryStatus === 'in_transit' ? 'In Transit' : order.deliveryStatus}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Not assigned</span>
                                                    )}
                                                    {order.courierName && (
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <User className="h-3 w-3" />
                                                            {order.courierName}
                                                        </span>
                                                    )}
                                                </div>
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
                                                            <DialogTitle>Update Order Status {order.displayId || '#' + order.id}</DialogTitle>
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

                                                {/* COD Collection Button */}
                                                {order.codAmount && parseFloat(order.codAmount) > 0 && !order.codCollected && (
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        className="ml-2 bg-yellow-600 hover:bg-yellow-700"
                                                        onClick={() => {
                                                            setCodDialogOrder(order);
                                                            setCodAmount(order.codAmount || "");
                                                        }}
                                                    >
                                                        <Banknote className="h-4 w-4 mr-1" />
                                                        Collect COD
                                                    </Button>
                                                )}
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

            {/* COD Collection Dialog */}
            <Dialog open={!!codDialogOrder} onOpenChange={(open) => !open && setCodDialogOrder(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Collect COD Payment</DialogTitle>
                        <DialogDescription>
                            Confirm cash collection for Order {codDialogOrder?.displayId || '#' + codDialogOrder?.id}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Expected Amount</Label>
                            <div className="col-span-3 font-medium">
                                ₹{codDialogOrder?.codAmount ? parseFloat(codDialogOrder.codAmount).toLocaleString() : "0"}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="collected-amount" className="text-right">
                                Collected Amount
                            </Label>
                            <Input
                                id="collected-amount"
                                type="number"
                                value={codAmount}
                                onChange={(e) => setCodAmount(e.target.value)}
                                placeholder="Enter amount collected"
                                className="col-span-3"
                            />
                        </div>
                        {codAmount && codDialogOrder?.codAmount && parseFloat(codAmount) !== parseFloat(codDialogOrder.codAmount) && (
                            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-sm">Amount mismatch - this will be logged</span>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCodDialogOrder(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCollectCod}
                            disabled={collectCodMutation.isPending}
                            className="bg-yellow-600 hover:bg-yellow-700"
                        >
                            {collectCodMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Banknote className="h-4 w-4 mr-2" />
                                    Confirm Collection
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
