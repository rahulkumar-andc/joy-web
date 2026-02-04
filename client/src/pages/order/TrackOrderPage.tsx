import { useParams } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Package, Truck, CheckCircle2, XCircle, MapPin, CreditCard, Clock, Wifi, WifiOff } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useOrderTracking } from "@/hooks/use-websocket";
import { useEffect } from "react";

// Map orderState to user-friendly labels
const STATE_LABELS: Record<string, string> = {
    CREATED: "Order Placed",
    PAYMENT_PENDING: "Payment Pending",
    CONFIRMED: "Payment Confirmed",
    PROCESSING: "Processing",
    PACKED: "Packed",
    SHIPPED: "Shipped",
    OUT_FOR_DELIVERY: "Out for Delivery",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
};

export default function TrackOrderPage() {
    const { id } = useParams();
    const queryClient = useQueryClient();

    // Real-time order tracking via WebSocket
    const { isConnected, orderUpdate } = useOrderTracking(id);

    const { data: order, isLoading, error } = useQuery({
        queryKey: ["/api/orders", id],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/orders/${id}`);
            return res.json();
        },
        enabled: !!id,
    });

    // Auto-refetch order data when we receive a WebSocket update
    useEffect(() => {
        if (orderUpdate) {
            queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
        }
    }, [orderUpdate, id, queryClient]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-3xl text-center">
                <h1 className="text-2xl font-bold text-destructive">Order Not Found</h1>
                <p className="text-muted-foreground mt-2">
                    We could not find this order. Please check the order ID.
                </p>
            </div>
        );
    }

    const isCancelled = order.status === "cancelled";
    const stateHistory = Array.isArray(order.stateHistory) ? order.stateHistory : [];
    const shippingAddress = typeof order.shippingAddress === "object" ? order.shippingAddress : null;
    const items = Array.isArray(order.items) ? order.items : [];

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Order #{id}</h1>
                <p className="text-muted-foreground">
                    Placed {order.createdAt && formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Left Column: Timeline */}
                <div className="md:col-span-2 space-y-6">
                    {/* Cancelled State */}
                    {isCancelled && (
                        <div className="border border-destructive rounded-lg p-6 bg-destructive/10">
                            <div className="flex items-center gap-3">
                                <XCircle className="h-6 w-6 text-destructive" />
                                <span className="text-lg font-semibold text-destructive">Order Cancelled</span>
                            </div>
                        </div>
                    )}

                    {/* Status Timeline */}
                    {!isCancelled && stateHistory.length > 0 && (
                        <div className="border rounded-lg p-6">
                            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                                <Clock className="h-5 w-5" /> Order Timeline
                            </h2>
                            <div className="relative">
                                <div className="absolute left-4 top-0 h-full w-0.5 bg-muted -z-10"></div>
                                <div className="space-y-6">
                                    {stateHistory.map((entry: any, idx: number) => {
                                        const isLatest = idx === stateHistory.length - 1;
                                        const label = STATE_LABELS[entry.to] || entry.to;
                                        return (
                                            <div key={idx} className="flex gap-4">
                                                <div
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10 ${isLatest
                                                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                                                        : "bg-primary/70 text-primary-foreground"
                                                        }`}
                                                >
                                                    <CheckCircle2 className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold">{label}</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {entry.timestamp && format(new Date(entry.timestamp), "MMM d, yyyy 'at' h:mm a")}
                                                    </p>
                                                    {isLatest && (
                                                        <p className="text-sm text-primary mt-1">Current Status</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tracking Info */}
                    {(order.status === "shipped" || order.status === "out_for_delivery" || order.status === "delivered") && (
                        <div className="border rounded-lg p-6 bg-muted/30">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Truck className="h-5 w-5" /> Tracking Information
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Courier</p>
                                    <p className="font-medium">{order.courierName || "Not Available"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Tracking Number</p>
                                    <p className="font-medium font-mono">{order.trackingNumber || "Not Available"}</p>
                                </div>
                                {order.estimatedDeliveryDate && (
                                    <div className="col-span-2">
                                        <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                                        <p className="font-medium text-primary">
                                            {format(new Date(order.estimatedDeliveryDate), "MMMM d, yyyy")}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Order Items */}
                    <div className="border rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Package className="h-5 w-5" /> Order Items
                        </h2>
                        <div className="space-y-4">
                            {items.map((item: any) => (
                                <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
                                    <div className="flex-1">
                                        <h3 className="font-medium">Product ID: {item.productId}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Quantity: {item.quantity}
                                            {item.size && ` • Size: ${item.size}`}
                                            {item.color && ` • Color: ${item.color}`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">₹{item.price}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Order Summary */}
                <div className="space-y-6">
                    {/* Payment Info */}
                    <div className="border rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <CreditCard className="h-5 w-5" /> Payment
                        </h2>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Status</span>
                                <span className={`font-medium ${order.paymentStatus === "paid" ? "text-green-600" : ""}`}>
                                    {order.paymentStatus?.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex justify-between pt-3 border-t">
                                <span className="font-semibold">Total</span>
                                <span className="font-semibold text-lg">₹{order.totalAmount}</span>
                            </div>

                            {/* Download Invoice Button - Only show for paid orders */}
                            {order.paymentStatus === "paid" && (
                                <button
                                    onClick={() => {
                                        window.open(`/api/orders/${id}/invoice`, '_blank');
                                    }}
                                    className="w-full mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Download Invoice
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="border rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <MapPin className="h-5 w-5" /> Delivery Address
                        </h2>
                        {shippingAddress ? (
                            <div className="text-sm space-y-1">
                                <p className="font-medium">{shippingAddress.fullName}</p>
                                <p>{shippingAddress.addressLine1}</p>
                                <p>
                                    {shippingAddress.city}, {shippingAddress.state}
                                </p>
                                <p>{shippingAddress.zipCode}</p>
                                <p>{shippingAddress.country}</p>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No address available</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
