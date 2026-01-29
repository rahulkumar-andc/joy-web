import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Package, ChevronRight, ShoppingBag } from "lucide-react";

export default function OrdersPage() {
    const { user } = useAuth();

    const { data: orders, isLoading } = useQuery({
        queryKey: ["/api/orders"],
        queryFn: async () => {
            const res = await fetch("/api/orders", { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch orders");
            return res.json();
        },
        enabled: !!user,
    });

    if (!user) {
        return (
            <div className="min-h-screen bg-background font-body">
                <Navbar />
                <div className="container mx-auto px-4 py-20 text-center">
                    <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Login Required</h1>
                    <p className="text-muted-foreground mb-6">Please login to view your orders.</p>
                    <Link href="/auth">
                        <Button className="bg-primary text-white">Login</Button>
                    </Link>
                </div>
                <Footer />
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending": return "bg-yellow-100 text-yellow-800";
            case "processing": return "bg-blue-100 text-blue-800";
            case "shipped": return "bg-purple-100 text-purple-800";
            case "delivered": return "bg-green-100 text-green-800";
            case "cancelled": return "bg-red-100 text-red-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="min-h-screen bg-background font-body flex flex-col">
            <Navbar />

            <div className="flex-1 container mx-auto px-4 py-12">
                <h1 className="font-display text-3xl font-bold text-primary mb-8">My Orders</h1>

                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl h-32 animate-pulse" />
                        ))}
                    </div>
                ) : orders?.length === 0 ? (
                    <div className="text-center py-20">
                        <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <h2 className="text-xl font-medium mb-2">No orders yet</h2>
                        <p className="text-muted-foreground mb-6">Start shopping to see your orders here!</p>
                        <Link href="/shop">
                            <Button className="bg-accent text-white">Shop Now</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders?.map((order: any) => (
                            <Card key={order.id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div>
                                        <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(order.createdAt).toLocaleDateString("en-IN", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                            })}
                                        </p>
                                    </div>
                                    <Badge className={getStatusColor(order.status)}>
                                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                    </Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium">₹{order.totalAmount}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Payment: {order.paymentStatus}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
}
