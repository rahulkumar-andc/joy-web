import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    ArrowLeft,
    User,
    Mail,
    Phone,
    Calendar,
    ShoppingBag,
    CreditCard,
    MapPin,
    Shield,
    UserCheck,
    UserX,
    Ban,
    Eye
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

interface CustomerDetail {
    id: number;
    name: string;
    email: string;
    phone?: string;
    role: string;
    isVerified: boolean;
    createdAt: string;
    lastLoginAt?: string;
    orders: Array<{
        id: number;
        totalAmount: string;
        status: string;
        createdAt: string;
        itemCount: number;
    }>;
    addresses: Array<{
        id: number;
        fullName: string;
        addressLine1: string;
        city: string;
        state: string;
        zipCode: string;
        isDefault: boolean;
    }>;
    stats: {
        totalOrders: number;
        totalSpent: number;
        avgOrderValue: number;
    };
}

export default function AdminCustomerDetailPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [, params] = useRoute("/admin/users/:id");
    const userId = params?.id ? parseInt(params.id) : null;

    // Fetch customer details
    const { data: customer, isLoading, error } = useQuery<CustomerDetail>({
        queryKey: ["admin-customer", userId],
        queryFn: async () => {
            const res = await fetch(`/api/admin/users/${userId}`, {
                credentials: "include"
            });
            if (!res.ok) throw new Error("Failed to fetch customer");
            return res.json();
        },
        enabled: !!userId,
    });

    // Update customer mutation
    const mutation = useMutation({
        mutationFn: async ({ role, isVerified, isBanned }: { role?: string; isVerified?: boolean; isBanned?: boolean }) => {
            const csrfToken = document.cookie
                .split("; ")
                .find(row => row.startsWith("CSRF-TOKEN="))
                ?.split("=")[1];

            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrfToken || ""
                },
                credentials: "include",
                body: JSON.stringify({ role, isVerified, isBanned }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Update failed");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-customer", userId] });
            toast({ title: "Success", description: "Customer updated successfully" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    if (isLoading) {
        return (
            <AdminLayout title="Customer Details" subtitle="Loading...">
                <div className="flex h-60 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
            </AdminLayout>
        );
    }

    if (error || !customer) {
        return (
            <AdminLayout title="Customer Details" subtitle="Error">
                <Card>
                    <CardContent className="py-8 text-center">
                        <p className="text-red-500">Failed to load customer details</p>
                        <Link href="/admin/users">
                            <Button variant="outline" className="mt-4">
                                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Users
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </AdminLayout>
        );
    }

    const statusColors: Record<string, string> = {
        pending: "bg-yellow-100 text-yellow-800",
        processing: "bg-blue-100 text-blue-800",
        shipped: "bg-purple-100 text-purple-800",
        delivered: "bg-green-100 text-green-800",
        cancelled: "bg-red-100 text-red-800",
    };

    return (
        <AdminLayout
            title={customer.name || "Customer"}
            subtitle={`Customer ID: ${customer.id}`}
        >
            {/* Back Button */}
            <div className="mb-4">
                <Link href="/admin/users">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Users
                    </Button>
                </Link>
            </div>

            {/* Customer Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Profile Card */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" /> Profile
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">{customer.name}</h3>
                                <Badge variant={customer.role === 'admin' ? 'destructive' : customer.role === 'seller' ? 'default' : 'secondary'}>
                                    {customer.role}
                                </Badge>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{customer.email}</span>
                            </div>
                            {customer.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{customer.phone}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>Joined {format(new Date(customer.createdAt), "MMM d, yyyy")}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <Badge variant={customer.isVerified ? 'outline' : 'secondary'} className={customer.isVerified ? "bg-green-50 text-green-700 border-green-200" : ""}>
                                {customer.isVerified ? "Verified" : "Unverified"}
                            </Badge>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-4 border-t">
                            {!customer.isVerified && (
                                <Button size="sm" onClick={() => mutation.mutate({ isVerified: true })} disabled={mutation.isPending}>
                                    <UserCheck className="h-4 w-4 mr-1" /> Verify
                                </Button>
                            )}
                            {customer.isVerified && (
                                <Button size="sm" variant="outline" onClick={() => mutation.mutate({ isVerified: false })} disabled={mutation.isPending}>
                                    <UserX className="h-4 w-4 mr-1" /> Revoke
                                </Button>
                            )}
                            {customer.role !== 'admin' && (
                                <Button size="sm" variant="outline" onClick={() => mutation.mutate({ role: 'admin' })} disabled={mutation.isPending}>
                                    <Shield className="h-4 w-4 mr-1" /> Make Admin
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Cards */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Customer Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-primary" />
                                <div className="text-2xl font-bold">{customer.stats?.totalOrders || 0}</div>
                                <div className="text-xs text-muted-foreground">Total Orders</div>
                            </div>
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <CreditCard className="h-8 w-8 mx-auto mb-2 text-green-600" />
                                <div className="text-2xl font-bold">₹{customer.stats?.totalSpent?.toLocaleString() || 0}</div>
                                <div className="text-xs text-muted-foreground">Total Spent</div>
                            </div>
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                                <div className="text-2xl font-bold">₹{customer.stats?.avgOrderValue?.toLocaleString() || 0}</div>
                                <div className="text-xs text-muted-foreground">Avg Order Value</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for Orders and Addresses */}
            <Tabs defaultValue="orders">
                <TabsList>
                    <TabsTrigger value="orders">Order History</TabsTrigger>
                    <TabsTrigger value="addresses">Addresses</TabsTrigger>
                </TabsList>

                <TabsContent value="orders">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Orders</CardTitle>
                            <CardDescription>{customer.orders?.length || 0} orders found</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {customer.orders && customer.orders.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Order ID</TableHead>
                                            <TableHead>Items</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {customer.orders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-medium">#{order.id}</TableCell>
                                                <TableCell>{order.itemCount} items</TableCell>
                                                <TableCell>₹{parseFloat(order.totalAmount).toLocaleString()}</TableCell>
                                                <TableCell>
                                                    <Badge className={statusColors[order.status] || "bg-gray-100"}>
                                                        {order.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{format(new Date(order.createdAt), "MMM d, yyyy")}</TableCell>
                                                <TableCell className="text-right">
                                                    <Link href={`/admin/orders?orderId=${order.id}`}>
                                                        <Button variant="ghost" size="sm">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No orders found for this customer
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="addresses">
                    <Card>
                        <CardHeader>
                            <CardTitle>Saved Addresses</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {customer.addresses && customer.addresses.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {customer.addresses.map((address) => (
                                        <div key={address.id} className="p-4 border rounded-lg">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                                                    <div>
                                                        <p className="font-medium">{address.fullName}</p>
                                                        <p className="text-sm text-muted-foreground">{address.addressLine1}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {address.city}, {address.state} {address.zipCode}
                                                        </p>
                                                    </div>
                                                </div>
                                                {address.isDefault && (
                                                    <Badge variant="outline">Default</Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No addresses saved
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </AdminLayout>
    );
}
