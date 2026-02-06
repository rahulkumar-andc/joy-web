
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Loader2, ArrowLeft, MapPin, Receipt, HelpCircle, Download, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { OrderStatusBadge } from "@/components/orders/OrderBadge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function OrderDetailPage() {
    const params = useParams();
    const id = params.id;
    const { toast } = useToast();
    const [, navigate] = useLocation();
    const queryClient = useQueryClient();
    const [showCancelDialog, setShowCancelDialog] = useState(false);

    const { data: order, isLoading, error } = useQuery({
        queryKey: [`/api/orders/${id}`],
        queryFn: async () => {
            const res = await fetch(`/api/orders/${id}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error("Order not found");
                throw new Error("Failed to fetch order details");
            }
            return res.json();
        },
        enabled: !!id
    });

    const cancelMutation = useMutation({
        mutationFn: async () => {
            // Get CSRF token from cookie (cookie name is CSRF-TOKEN)
            const csrfToken = document.cookie
                .split("; ")
                .find((row) => row.startsWith("CSRF-TOKEN="))
                ?.split("=")[1];

            const res = await fetch(`/api/orders/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrfToken || ""
                },
                body: JSON.stringify({ status: "cancelled" })
            });
            if (!res.ok) throw new Error("Failed to cancel order");
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Order Cancelled", description: "Your order has been cancelled successfully." });
            queryClient.invalidateQueries({ queryKey: [`/api/orders/${id}`] });
            queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message || "Failed to cancel order", variant: "destructive" });
        }
    });

    const handleNeedHelp = () => {
        // Navigate to support tickets page with order context
        navigate(`/account/tickets?orderId=${id}`);
    };

    const handleDownloadInvoice = () => {
        toast({ title: "Downloading Invoice...", description: "Your invoice download will start shortly." });
        // TODO: Connect to actual invoice generation endpoint
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (error || !order) return <div className="h-screen flex flex-col items-center justify-center gap-4"><h2 className="text-xl font-bold">Order not found</h2><Link href="/orders"><Button>Back to Orders</Button></Link></div>;

    const canCancel = ["pending", "created", "confirmed", "payment_pending"].includes(order.status);

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/orders"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        Order {order.displayId || `ORD-${order.id}`}
                        <OrderStatusBadge status={order.status} />
                    </h1>
                    <p className="text-muted-foreground text-sm">Placed on {format(new Date(order.createdAt), "dd MMM yyyy, hh:mm a")}</p>
                </div>
                <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleDownloadInvoice}>
                        <Download className="w-4 h-4 mr-2" /> Invoice
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleNeedHelp}>
                        <HelpCircle className="w-4 h-4 mr-2" /> Need Help?
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COLUMN - Main Details */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Timeline */}
                    <Card>
                        <CardContent className="pt-6">
                            <OrderTimeline status={order.status} dates={{
                                createdAt: order.createdAt,
                                paymentDate: order.status !== 'pending' ? order.createdAt : undefined, // Approximation
                                shippedAt: order.shippedAt, // Ensure this field exists or map it
                                deliveredAt: order.deliveredAt
                            }} />

                            {order.status === 'pending' && (
                                <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 rounded-md text-sm border border-yellow-100">
                                    Your order has been placed. We will confirm it shortly.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Items */}
                    <Card>
                        <CardHeader><CardTitle>Items in this Order</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {order.orderItems?.map((item: any) => (
                                <div key={item.id} className="flex gap-4 border-b last:border-0 pb-4 last:pb-0">
                                    <div className="h-24 w-24 bg-muted rounded-md overflow-hidden flex-shrink-0 border">
                                        {/* Assuming product object is joined */}
                                        <img src={item.product?.images?.[0] || "/placeholder"} alt={item.product?.name} className="h-full w-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold">{item.name || item.product?.name}</h3>
                                        <p className="text-sm text-muted-foreground">{item.product?.brand || "Brand"}</p>
                                        <div className="flex gap-4 mt-2 text-sm">
                                            {item.size && <span className="bg-muted px-2 py-0.5 rounded text-xs">Size: {item.size}</span>}
                                            {item.color && <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border" style={{ backgroundColor: item.color }}></span><span className="text-muted-foreground capitalize">{item.color}</span></div>}
                                        </div>
                                        <div className="mt-2 font-medium">₹{item.price} x {item.quantity}</div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Delivery & Address */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader><CardTitle className="text-base flex items-center"><MapPin className="w-4 h-4 mr-2" /> Delivery Address</CardTitle></CardHeader>
                            <CardContent className="text-sm space-y-1">
                                <p className="font-semibold">{order.shippingAddress?.fullName || "User Name"}</p>
                                <p>{order.shippingAddress?.addressLine1}</p>
                                <p>{order.shippingAddress?.addressLine2}</p>
                                <p>{order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}</p>
                                <p className="mt-2 text-muted-foreground">Phone: {order.shippingAddress?.phone}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-base flex items-center"><Truck className="w-4 h-4 mr-2" /> Shipping Info</CardTitle></CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Courier</span>
                                    <span className="font-medium">{order.courierName || "Not assigned"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tracking ID</span>
                                    <span className="font-medium">{order.trackingNumber || "-"}</span>
                                </div>
                                <div className="flex justify-between mt-2 pt-2 border-t">
                                    <span className="text-muted-foreground">Expected by</span>
                                    <span className="font-medium text-green-600">
                                        {order.estimatedDeliveryDate ? format(new Date(order.estimatedDeliveryDate), "dd MMM yyyy") : "Date pending"}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* RIGHT COLUMN - Summary & Actions */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="text-base flex items-center"><Receipt className="w-4 h-4 mr-2" /> Order Summary</CardTitle></CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between"><span>Subtotal</span><span>₹{Number(order.totalAmount) - Number(order.shippingCost)}</span></div>
                            <div className="flex justify-between"><span>Shipping</span><span>₹{order.shippingCost}</span></div>
                            <div className="flex justify-between"><span>Tax</span><span>₹0.00</span></div> {/* Placeholder */}
                            <Separator />
                            <div className="flex justify-between font-bold text-base"><span>Total</span><span>₹{order.totalAmount}</span></div>
                        </CardContent>
                    </Card>

                    {canCancel && (
                        <Card className="border-red-100 bg-red-50/50">
                            <CardContent className="pt-6">
                                <h4 className="font-semibold text-red-700 mb-2">Cancel Order?</h4>
                                <p className="text-xs text-red-600/80 mb-4">You can cancel this order before it is shipped. Refunds will be processed to your original payment method.</p>
                                <Button variant="destructive" className="w-full" onClick={() => setShowCancelDialog(true)} disabled={cancelMutation.isPending}>
                                    {cancelMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Cancel Order
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Cancel Confirmation Dialog */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel this order? This action cannot be undone.
                            Any payment made will be refunded to your original payment method.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>No, Keep Order</AlertDialogCancel>
                        <AlertDialogAction onClick={() => cancelMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Yes, Cancel Order
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
