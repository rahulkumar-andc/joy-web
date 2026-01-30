import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
import { Loader2, Plus, Package, DollarSign, ShoppingCart } from "lucide-react";
import { Navbar } from "@/components/Navbar";

export default function SellerDashboard() {
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ["seller-stats"],
        queryFn: async () => {
            const res = await fetch("/api/seller/stats");
            if (!res.ok) throw new Error("Failed to fetch stats");
            return res.json();
        }
    });

    const { data: products, isLoading: productsLoading } = useQuery({
        queryKey: ["seller-products"],
        queryFn: async () => {
            const res = await fetch("/api/seller/products");
            if (!res.ok) throw new Error("Failed to fetch products");
            return res.json();
        }
    });

    if (statsLoading || productsLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Seller Dashboard</h1>
                    <Link href="/admin/products/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Product
                        </Button>
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{stats?.totalRevenue?.toFixed(2) || "0.00"}</div>
                            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Products</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
                            <p className="text-xs text-muted-foreground">Active listings</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.totalOrdersItems || 0}</div>
                            <p className="text-xs text-muted-foreground">Total units sold</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Products Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>My Products</CardTitle>
                        <CardDescription>Manage your product listings</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Stock</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products?.map((product: any) => (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>₹{product.price}</TableCell>
                                        <TableCell>{product.stockQuantity}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs ${product.stockQuantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {product.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/admin/products/${product.id}/edit`}>
                                                <Button variant="ghost" size="sm">Edit</Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
