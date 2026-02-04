import { useState, useRef } from "react";
import {
    useCourierOrders,
    usePickupOrder,
    useInTransitOrder,
    useDeliverOrder,
    CourierOrder,
} from "@/hooks/use-courier-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    Package,
    Truck,
    CheckCircle,
    MapPin,
    Phone,
    Camera,
    Navigation,
    AlertTriangle,
    DollarSign,
    ShieldCheck,
    ShieldAlert,
    Clock,
    MapPinned,
} from "lucide-react";

type DeliveryStatus = "pending" | "picked_up" | "in_transit" | "delivered";

const statusConfig: Record<DeliveryStatus, { label: string; color: string; icon: any }> = {
    pending: { label: "Pending Pickup", color: "bg-yellow-500", icon: Package },
    picked_up: { label: "Picked Up", color: "bg-blue-500", icon: Package },
    in_transit: { label: "In Transit", color: "bg-purple-500", icon: Truck },
    delivered: { label: "Delivered", color: "bg-green-500", icon: CheckCircle },
};

export default function CourierDashboard() {
    const { toast } = useToast();
    const { data, isLoading, error } = useCourierOrders();
    const pickupMutation = usePickupOrder();
    const inTransitMutation = useInTransitOrder();
    const deliverMutation = useDeliverOrder();

    const [selectedOrder, setSelectedOrder] = useState<CourierOrder | null>(null);
    const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
    const [podImage, setPodImage] = useState<File | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [validationResult, setValidationResult] = useState<{
        isSuspicious: boolean;
        isValid?: boolean;
        reason?: string;
        distance?: number | null;
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<DeliveryStatus | "all">("all");

    const filteredOrders = data?.orders.filter((order) => {
        if (activeTab === "all") return true;
        return order.deliveryStatus === activeTab;
    });

    const handlePickup = async (orderId: number) => {
        try {
            await pickupMutation.mutateAsync(orderId);
            toast({
                title: "Order Picked Up",
                description: "Order has been marked as picked up",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleInTransit = async (orderId: number) => {
        try {
            await inTransitMutation.mutateAsync(orderId);
            toast({
                title: "In Transit",
                description: "Order marked as in transit",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleDeliver = (order: CourierOrder) => {
        setSelectedOrder(order);
        setShowDeliveryDialog(true);
    };

    const handleCaptureImage = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPodImage(file);
        }
    };

    const handleCompleteDelivery = async () => {
        if (!selectedOrder || !podImage) {
            toast({
                title: "Missing Image",
                description: "Please capture a proof of delivery image",
                variant: "destructive",
            });
            return;
        }

        setIsCapturing(true);

        try {
            // Get current location
            let location: GeolocationCoordinates | undefined;
            try {
                const position = await new Promise<GeolocationPosition>(
                    (resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            enableHighAccuracy: true,
                            timeout: 10000,
                        });
                    }
                );
                location = position.coords;
            } catch (e) {
                console.warn("Could not get location:", e);
            }

            const result = await deliverMutation.mutateAsync({
                orderId: selectedOrder.id,
                podImage,
                location,
            });

            if (result.validation?.isSuspicious) {
                setValidationResult({
                    isSuspicious: true,
                    isValid: result.validation.isValid,
                    reason: result.validation.reason || "Location discrepancy detected",
                    distance: result.validation.distance,
                });
                toast({
                    title: "Delivery Complete - Flagged for Review",
                    description: "Delivery completed but flagged due to location discrepancy",
                    variant: "destructive",
                });
            } else {
                setValidationResult({
                    isSuspicious: false,
                    isValid: result.validation?.isValid,
                    distance: result.validation?.distance,
                });
                toast({
                    title: "Delivery Complete",
                    description: "Order has been successfully delivered and verified",
                });
            }

            setShowDeliveryDialog(false);
            setSelectedOrder(null);
            setPodImage(null);
            setValidationResult(null);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsCapturing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h1 className="text-xl font-bold mb-2">Error Loading Orders</h1>
                <p className="text-muted-foreground">{(error as Error).message}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4">
                <h1 className="text-xl font-bold">Delivery Dashboard</h1>
                <p className="text-sm opacity-90">
                    {data?.count || 0} assigned orders
                </p>
            </div>

            {/* Status Tabs */}
            <div className="flex overflow-x-auto p-2 gap-2 bg-muted/50">
                {(["all", "pending", "picked_up", "in_transit", "delivered"] as const).map(
                    (status) => (
                        <Button
                            key={status}
                            variant={activeTab === status ? "default" : "outline"}
                            size="sm"
                            onClick={() => setActiveTab(status)}
                            className="whitespace-nowrap"
                        >
                            {status === "all"
                                ? "All"
                                : statusConfig[status as DeliveryStatus]?.label || status}
                        </Button>
                    )
                )}
            </div>

            {/* Orders List */}
            <div className="p-4 space-y-4">
                {filteredOrders?.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center">
                            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No orders in this category</p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredOrders?.map((order) => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            onPickup={() => handlePickup(order.id)}
                            onInTransit={() => handleInTransit(order.id)}
                            onDeliver={() => handleDeliver(order)}
                            isLoading={
                                pickupMutation.isPending ||
                                inTransitMutation.isPending
                            }
                        />
                    ))
                )}
            </div>

            {/* Delivery Completion Dialog */}
            <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Complete Delivery</DialogTitle>
                        <DialogDescription>
                            Take a photo as proof of delivery
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Hidden file input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                        />

                        {/* Image Preview or Capture Button */}
                        {podImage ? (
                            <div className="relative">
                                <img
                                    src={URL.createObjectURL(podImage)}
                                    alt="Proof of delivery"
                                    className="w-full h-48 object-cover rounded-lg"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="absolute bottom-2 right-2"
                                    onClick={handleCaptureImage}
                                >
                                    Retake
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                className="w-full h-32 flex flex-col gap-2"
                                onClick={handleCaptureImage}
                            >
                                <Camera className="h-8 w-8" />
                                <span>Capture Photo</span>
                            </Button>
                        )}

                        {/* COD Info */}
                        {selectedOrder?.codAmount && parseFloat(selectedOrder.codAmount) > 0 && (
                            <div className="flex items-center gap-2 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                                <DollarSign className="h-5 w-5 text-yellow-600" />
                                <div>
                                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                                        COD Amount: ₹{parseFloat(selectedOrder.codAmount).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                        Collect cash before completing
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Validation Status Feedback */}
                        {validationResult && (
                            <div className={`p-3 rounded-lg border ${validationResult.isSuspicious ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    {validationResult.isSuspicious ? (
                                        <ShieldAlert className="h-5 w-5 text-red-600" />
                                    ) : (
                                        <ShieldCheck className="h-5 w-5 text-green-600" />
                                    )}
                                    <span className={`font-medium ${validationResult.isSuspicious ? 'text-red-800 dark:text-red-200' : 'text-green-800 dark:text-green-200'}`}>
                                        {validationResult.isSuspicious ? 'Flagged for Review' : 'Verification Passed'}
                                    </span>
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex items-center gap-2">
                                        <MapPinned className={`h-4 w-4 ${validationResult.isValid ? 'text-green-600' : 'text-red-500'}`} />
                                        <span className="text-muted-foreground">
                                            Location Validation: {validationResult.isValid ? 'Passed' : 'Failed'}
                                        </span>
                                    </div>
                                    {validationResult.distance !== undefined && validationResult.distance !== null && (
                                        <div className="flex items-center gap-2">
                                            <Navigation className={`h-4 w-4 ${validationResult.distance < 500 ? 'text-green-600' : 'text-red-500'}`} />
                                            <span className="text-muted-foreground">
                                                Distance from address: {validationResult.distance < 1000 ? `${Math.round(validationResult.distance)}m` : `${(validationResult.distance / 1000).toFixed(1)}km`}
                                            </span>
                                        </div>
                                    )}
                                    {validationResult.isSuspicious && validationResult.reason && (
                                        <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                                            <p className="text-xs text-red-600 dark:text-red-400">
                                                <AlertTriangle className="h-3 w-3 inline mr-1" />
                                                Issue: {validationResult.reason}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDeliveryDialog(false);
                                setPodImage(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCompleteDelivery}
                            disabled={!podImage || isCapturing}
                            className="w-full sm:w-auto"
                        >
                            {isCapturing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Complete Delivery
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Order Card Component
function OrderCard({
    order,
    onPickup,
    onInTransit,
    onDeliver,
    isLoading,
}: {
    order: CourierOrder;
    onPickup: () => void;
    onInTransit: () => void;
    onDeliver: () => void;
    isLoading: boolean;
}) {
    const status = (order.deliveryStatus || "pending") as DeliveryStatus;
    const config = statusConfig[status] || statusConfig.pending;
    const StatusIcon = config.icon;

    const openMaps = () => {
        const address = `${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}`;
        const encodedAddress = encodeURIComponent(address);
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, "_blank");
    };

    const callCustomer = () => {
        if (order.customerPhone) {
            window.location.href = `tel:${order.customerPhone}`;
        }
    };

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                    <Badge className={`${config.color} text-white`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {/* Customer Info */}
                <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                        <p className="font-medium">{order.shippingAddress.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                            {order.shippingAddress.addressLine1}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                            {order.shippingAddress.zipCode}
                        </p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={openMaps}>
                        <Navigation className="h-4 w-4 mr-1" />
                        Navigate
                    </Button>
                    {order.customerPhone && (
                        <Button variant="outline" size="sm" onClick={callCustomer}>
                            <Phone className="h-4 w-4 mr-1" />
                            Call
                        </Button>
                    )}
                </div>

                {/* COD Badge */}
                {order.codAmount && parseFloat(order.codAmount) > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium">
                            COD: ₹{parseFloat(order.codAmount).toLocaleString()}
                        </span>
                    </div>
                )}

                {/* Order Total */}
                <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Order Total</span>
                    <span className="font-bold">
                        ₹{parseFloat(order.totalAmount).toLocaleString()}
                    </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                    {status === "pending" && (
                        <Button
                            className="flex-1"
                            onClick={onPickup}
                            disabled={isLoading}
                        >
                            <Package className="h-4 w-4 mr-2" />
                            Pick Up
                        </Button>
                    )}
                    {status === "picked_up" && (
                        <Button
                            className="flex-1"
                            onClick={onInTransit}
                            disabled={isLoading}
                        >
                            <Truck className="h-4 w-4 mr-2" />
                            Start Delivery
                        </Button>
                    )}
                    {status === "in_transit" && (
                        <Button
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={onDeliver}
                        >
                            <Camera className="h-4 w-4 mr-2" />
                            Upload & Complete
                        </Button>
                    )}
                    {status === "delivered" && (
                        <div className="flex-1 text-center text-green-600 font-medium">
                            <CheckCircle className="h-5 w-5 inline mr-2" />
                            Delivered
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
