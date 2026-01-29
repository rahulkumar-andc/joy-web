import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { api } from "@shared/routes";
import { type Order } from "@shared/schema";
import { Loader2, Search, Check, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function AdminOrders() {
    const { data: orders, isLoading } = useQuery<(Order & { user: { name: string; email: string } })[]>({
        queryKey: [api.orders.list.path],
        queryFn: async () => {
            const res = await fetch(api.orders.list.path);
            if (!res.ok) throw new Error("Failed to fetch orders");
            return res.json();
        },
    });

    const [search, setSearch] = useState("");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: number; status: string }) => {
            const res = await fetch(`/api/orders/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error("Failed to update status");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
            toast({
                title: "Status Updated",
                description: "Order status has been updated successfully.",
            });
        },
        onError: () => {
            toast({
                title: "Update Failed",
                description: "Could not update order status.",
                variant: "destructive",
            });
        },
    });

    const filteredOrders = orders?.filter((order) =>
        order.id.toString().includes(search) ||
        order.user.name.toLowerCase().includes(search.toLowerCase()) ||
        order.user.email.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending": return "bg-yellow-100 text-yellow-800";
            case "paid": return "bg-blue-100 text-blue-800";
            case "shipped": return "bg-purple-100 text-purple-800";
            case "delivered": return "bg-green-100 text-green-800";
            case "cancelled": return "bg-red-100 text-red-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="min-h-screen bg-background font-body">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <h1 className="text-3xl font-display font-bold text-primary">Order Management</h1>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search ID, Name, Email..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-accent" />
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-border overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-3">Order ID</th>
                                        <th className="px-6 py-3">Customer</th>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Total</th>
                                        <th className="px-6 py-3">Payment</th>
                                        <th className="px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredOrders?.map((order) => (
                                        <tr key={order.id} className="hover:bg-muted/30">
                                            <td className="px-6 py-4 font-medium text-primary">#{order.id}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-foreground">{order.user.name}</div>
                                                <div className="text-xs text-muted-foreground">{order.user.email}</div>
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground">
                                                {new Date(order.createdAt!).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 font-bold">₹{order.totalAmount}</td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className={order.paymentStatus === 'paid' ? 'border-green-500 text-green-700' : 'border-yellow-500 text-yellow-700'}>
                                                    {order.paymentStatus}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Select
                                                    defaultValue={order.status}
                                                    onValueChange={(val) => updateStatus.mutate({ id: order.id, status: val })}
                                                    disabled={updateStatus.isPending}
                                                >
                                                    <SelectTrigger className={`w-[130px] h-8 ${getStatusColor(order.status)} border-0`}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending">Pending</SelectItem>
                                                        <SelectItem value="paid">Paid</SelectItem>
                                                        <SelectItem value="shipped">Shipped</SelectItem>
                                                        <SelectItem value="delivered">Delivered</SelectItem>
                                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredOrders?.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                                No orders found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
