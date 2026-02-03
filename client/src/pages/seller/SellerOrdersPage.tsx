import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
    Card,
    CardContent,
    CardDescription,
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SellerLayout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    Search,
    Package,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Eye,
    Truck,
    CheckCircle,
    XCircle,
    Clock
} from "lucide-react";
import { format } from "date-fns";

interface SellerOrder {
    id: number;
    sellerOrderNumber: string;
    status: string;
    subtotal: string;
    sellerEarnings: string;
    createdAt: string;
    items: {
        id: number;
        productName: string;
        quantity: number;
        unitPrice: string;
    }[];
    order?: {
        shippingAddress?: {
            name?: string;
            city?: string;
        };
    };
}

const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    processing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    shipped: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    out_for_delivery: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
    delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    returned: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const statusIcons: Record<string, any> = {
    pending: Clock,
    confirmed: CheckCircle,
    processing: Package,
    shipped: Truck,
    out_for_delivery: Truck,
    delivered: CheckCircle,
    cancelled: XCircle,
    returned: Package,
};

const nextStatusMap: Record<string, string> = {
    pending: "confirmed",
    confirmed: "processing",
    processing: "shipped",
    shipped: "out_for_delivery",
    out_for_delivery: "delivered",
};

export default function SellerOrdersPage() {
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);
    const [trackingNumber, setTrackingNumber] = useState("");
    const [shippingProvider, setShippingProvider] = useState("");
    const [note, setNote] = useState("");

    const { data, isLoading, error } = useQuery({
        queryKey: ["seller-orders", page, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
            });
            if (statusFilter !== "all") params.set("status", statusFilter);

            const res = await fetch(`/api/seller/orders?${params}`, {
                credentials: "include"
            });
            if (!res.ok) {
                if (res.status === 401) {
                    navigate("/auth?redirect=/seller/orders");
                    throw new Error("Please login");
                }
                throw new Error("Failed to fetch orders");
            }
            return res.json();
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ orderId, status, details }: {
            orderId: number;
            status: string;
            details?: { trackingNumber?: string; shippingProvider?: string; note?: string };
        }) => {
            const res = await fetch(`/api/seller/orders/${orderId}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ status, ...details }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to update status");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
            toast({
                title: "Status Updated",
                description: "Order status has been updated successfully",
            });
            setUpdateDialogOpen(false);
            resetForm();
        },
        onError: (error: Error) => {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const resetForm = () => {
        setSelectedOrder(null);
        setTrackingNumber("");
        setShippingProvider("");
        setNote("");
    };

    const handleUpdateStatus = (order: SellerOrder) => {
        setSelectedOrder(order);
        setUpdateDialogOpen(true);
    };

    const confirmUpdate = () => {
        if (!selectedOrder) return;

        const nextStatus = nextStatusMap[selectedOrder.status];
        if (!nextStatus) return;

        const details: any = { note };
        if (nextStatus === "shipped") {
            details.trackingNumber = trackingNumber;
            details.shippingProvider = shippingProvider;
        }

        updateStatusMutation.mutate({
            orderId: selectedOrder.id,
            status: nextStatus,
            details,
        });
    };

    if (isLoading) {
        return (
            <SellerLayout title="My Orders">
                <div className="h-[50vh] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </SellerLayout>
        );
    }

    if (error) {
        return (
            <SellerLayout title="My Orders">
                <Card className="max-w-lg mx-auto text-center mt-12">
                    <CardHeader>
                        <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
                        <CardTitle>Error Loading Orders</CardTitle>
                        <CardDescription>{(error as Error).message}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => window.location.reload()}>
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </SellerLayout>
        );
    }

    return (
        <SellerLayout title="My Orders" subtitle="Manage and fulfill customer orders">
            <div className="space-y-6">

                {/* Filters */}
                <Card className="mb-6">
                    <CardContent className="py-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Orders</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="shipped">Shipped</SelectItem>
                                    <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
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
                        {data?.orders?.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
                                <p className="text-muted-foreground">
                                    Orders will appear here when customers buy your products
                                </p>
                            </div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Order ID</TableHead>
                                            <TableHead>Items</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data?.orders?.map((order: SellerOrder) => {
                                            const Icon = statusIcons[order.status] || Package;
                                            return (
                                                <TableRow key={order.id}>
                                                    <TableCell className="font-mono text-sm">
                                                        {order.sellerOrderNumber}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">
                                                            {order.items.slice(0, 2).map(item => (
                                                                <div key={item.id} className="truncate max-w-[200px]">
                                                                    {item.quantity}x {item.productName}
                                                                </div>
                                                            ))}
                                                            {order.items.length > 2 && (
                                                                <span className="text-muted-foreground">
                                                                    +{order.items.length - 2} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">
                                                            <div>{order.order?.shippingAddress?.name || "N/A"}</div>
                                                            <div className="text-muted-foreground">
                                                                {order.order?.shippingAddress?.city || ""}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">
                                                            <div className="font-medium">
                                                                ₹{parseFloat(order.subtotal).toLocaleString()}
                                                            </div>
                                                            <div className="text-muted-foreground text-xs">
                                                                Earning: ₹{parseFloat(order.sellerEarnings).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={`${statusColors[order.status] || ""} flex items-center gap-1 w-fit`}>
                                                            <Icon className="h-3 w-3" />
                                                            {order.status.replace(/_/g, " ")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {format(new Date(order.createdAt), "MMM d, yyyy")}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Link href={`/seller/orders/${order.id}`}>
                                                                <Button variant="ghost" size="sm">
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </Link>
                                                            {nextStatusMap[order.status] && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleUpdateStatus(order)}
                                                                >
                                                                    {order.status === "processing" ? "Ship" :
                                                                        order.status === "pending" ? "Confirm" :
                                                                            "Update"}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>

                                {/* Pagination */}
                                {data?.totalPages > 1 && (
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
                                            Page {page} of {data.totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={page >= data.totalPages}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Update Status Dialog */}
            <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Order Status</DialogTitle>
                        <DialogDescription>
                            Update order {selectedOrder?.sellerOrderNumber} to{" "}
                            <strong>{nextStatusMap[selectedOrder?.status || ""]?.replace(/_/g, " ")}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {selectedOrder?.status === "processing" && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="trackingNumber">Tracking Number *</Label>
                                    <Input
                                        id="trackingNumber"
                                        placeholder="Enter tracking number"
                                        value={trackingNumber}
                                        onChange={(e) => setTrackingNumber(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="shippingProvider">Shipping Provider</Label>
                                    <Select value={shippingProvider} onValueChange={setShippingProvider}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="bluedart">BlueDart</SelectItem>
                                            <SelectItem value="delhivery">Delhivery</SelectItem>
                                            <SelectItem value="ecom">Ecom Express</SelectItem>
                                            <SelectItem value="dtdc">DTDC</SelectItem>
                                            <SelectItem value="india_post">India Post</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="note">Note (Optional)</Label>
                            <Textarea
                                id="note"
                                placeholder="Add a note..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmUpdate}
                            disabled={
                                updateStatusMutation.isPending ||
                                (selectedOrder?.status === "processing" && !trackingNumber)
                            }
                        >
                            {updateStatusMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Update Status
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </SellerLayout>
    );
}
