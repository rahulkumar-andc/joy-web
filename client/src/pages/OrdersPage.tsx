
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2, Package, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/orders/OrderBadge";
import { api } from "@shared/routes"; // Assuming we can use this path, otherwise manual fetch
import { useState } from "react";
import { format } from "date-fns";

export default function OrdersPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const { data: orders, isLoading } = useQuery({
        queryKey: ["/api/orders"],
        queryFn: async () => {
            const res = await fetch("/api/orders");
            if (!res.ok) throw new Error("Failed to fetch orders");
            return res.json();
        }
    });

    const filteredOrders = orders?.filter((order: any) =>
        order.displayId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toString().includes(searchTerm)
    );

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">My Orders</h1>
                    <p className="text-muted-foreground">View and track your order history</p>
                </div>
                <div className="flex w-full md:w-auto gap-2">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search Order ID..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon"><Filter className="w-4 h-4" /></Button>
                </div>
            </div>

            <div className="space-y-4">
                {filteredOrders?.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/50">
                        <Package className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                        <h3 className="text-lg font-medium">No orders found</h3>
                        <p className="text-muted-foreground mb-4">You haven't placed any orders yet.</p>
                        <Link href="/"><Button>Start Shopping</Button></Link>
                    </div>
                ) : (
                    filteredOrders?.map((order: any) => (
                        <Card key={order.id} className="overflow-hidden bg-card hover:shadow-md transition-shadow duration-200">
                            <div className="bg-muted/30 px-6 py-3 border-b flex justify-between items-center text-sm">
                                <div className="flex gap-4">
                                    <span className="font-semibold text-primary">{order.displayId || `ORD-${order.id}`}</span>
                                    <span className="text-muted-foreground">{format(new Date(order.createdAt), "dd MMM yyyy")}</span>
                                </div>
                                <span className="font-bold">₹{order.totalAmount}</span>
                            </div>

                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                    <div className="flex-1 space-y-4">
                                        {order.orderItems?.slice(0, 2).map((item: any) => (
                                            <div key={item.id} className="flex gap-4">
                                                <div className="h-16 w-16 bg-muted rounded-md overflow-hidden flex-shrink-0">
                                                    {/* Using a placeholder for now as we might need to join product images */}
                                                    <img src={item.product?.images?.[0] || "/placeholder"} alt={item.product?.name} className="h-full w-full object-cover" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium line-clamp-1">{item.name || item.product?.name}</h4>
                                                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {order.orderItems?.length > 2 && <p className="text-xs text-muted-foreground">+{order.orderItems.length - 2} more items</p>}
                                    </div>

                                    <div className="flex flex-col items-end gap-2 text-right min-w-[140px]">
                                        <OrderStatusBadge status={order.status} />
                                        <div className="text-sm mt-2">
                                            <p className="text-muted-foreground">Expected Delivery</p>
                                            <p className="font-medium text-foreground">
                                                {order.estimatedDeliveryDate ? format(new Date(order.estimatedDeliveryDate), "dd MMM") : "TBD"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="bg-muted/10 px-6 py-3 flex justify-end gap-3 border-t">
                                {order.status === 'shipped' && <Button variant="outline" size="sm">Track Order</Button>}
                                <Link href={`/orders/${order.id}`}>
                                    <Button variant="default" size="sm">View Details</Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
