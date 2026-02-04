import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AdminLayout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    Check,
    X,
    Eye,
    ChevronLeft,
    ChevronRight,
    Package,
    AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import api from "@/lib/api";

interface PendingProduct {
    id: number;
    name: string;
    price: string;
    images: string[];
    description: string;
    stockQuantity: number;
    seller: {
        shopName: string;
        businessEmail: string;
    };
    createdAt: string;
}

export default function AdminProductModerationPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [moderationDialogOpen, setModerationDialogOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<PendingProduct | null>(null);
    const [action, setAction] = useState<"approve" | "reject">("approve");
    const [rejectionReason, setRejectionReason] = useState("");
    const [viewDialogOpen, setViewDialogOpen] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ["admin-pending-products", page],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
            });

            const res = await fetch(`/api/admin/products/pending?${params}`, {
                credentials: "include"
            });
            if (!res.ok) throw new Error("Failed to fetch pending products");
            return res.json();
        },
    });

    const moderateMutation = useMutation({
        mutationFn: async ({ productId, action, reason }: {
            productId: number;
            action: "approve" | "reject";
            reason?: string;
        }) => {
            const response = await api.patch(`/api/admin/products/${productId}/status`, {
                status: action === "approve" ? "approved" : "rejected",
                reason
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-pending-products"] });
            toast({
                title: "Product Moderated",
                description: `Product has been ${action}d`,
            });
            setModerationDialogOpen(false);
            setSelectedProduct(null);
            setRejectionReason("");
        },
        onError: (error: Error) => {
            toast({
                title: "Moderation Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleModerate = (product: PendingProduct, moderateAction: "approve" | "reject") => {
        setSelectedProduct(product);
        setAction(moderateAction);
        setModerationDialogOpen(true);
    };

    const handleView = (product: PendingProduct) => {
        setSelectedProduct(product);
        setViewDialogOpen(true);
    };

    const confirmModeration = () => {
        if (!selectedProduct) return;
        if (action === "reject" && !rejectionReason) {
            toast({
                title: "Reason Required",
                description: "Please provide a reason for rejection",
                variant: "destructive",
            });
            return;
        }

        moderateMutation.mutate({
            productId: selectedProduct.id,
            action,
            reason: rejectionReason,
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <AdminLayout
            title="Product Moderation"
            subtitle="Review and approve or reject pending products"
        >
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {data?.total || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Products Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Pending Products ({data?.total || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                    {data?.products?.length === 0 ? (
                        <div className="text-center py-12">
                            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Pending Products</h3>
                            <p className="text-muted-foreground">
                                All products have been reviewed
                            </p>
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">Image</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Seller</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Stock</TableHead>
                                        <TableHead>Submitted</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data?.products?.map((product: PendingProduct) => (
                                        <TableRow key={product.id}>
                                            <TableCell>
                                                <div className="w-12 h-12 rounded bg-muted overflow-hidden">
                                                    {product.images?.[0] ? (
                                                        <img
                                                            src={product.images[0]}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Package className="h-6 w-6 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-[300px]">
                                                    <div className="font-medium truncate">{product.name}</div>
                                                    <div className="text-sm text-muted-foreground truncate">
                                                        {product.description}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div className="font-medium">{product.seller.shopName}</div>
                                                    <div className="text-muted-foreground">{product.seller.businessEmail}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>₹{parseFloat(product.price).toLocaleString()}</TableCell>
                                            <TableCell>{product.stockQuantity}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {format(new Date(product.createdAt), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleView(product)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        onClick={() => handleModerate(product, "approve")}
                                                    >
                                                        <Check className="h-4 w-4 mr-1" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleModerate(product, "reject")}
                                                    >
                                                        <X className="h-4 w-4 mr-1" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
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

            {/* View Product Dialog */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Product Details</DialogTitle>
                    </DialogHeader>
                    {selectedProduct && (
                        <div className="space-y-4">
                            {/* Images */}
                            <div className="grid grid-cols-4 gap-2">
                                {selectedProduct.images?.map((img, idx) => (
                                    <img
                                        key={idx}
                                        src={img}
                                        alt={`Product ${idx + 1}`}
                                        className="w-full h-24 object-cover rounded border"
                                    />
                                ))}
                            </div>

                            {/* Details */}
                            <div className="space-y-2">
                                <div>
                                    <Label>Product Name</Label>
                                    <p className="text-sm">{selectedProduct.name}</p>
                                </div>
                                <div>
                                    <Label>Description</Label>
                                    <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Price</Label>
                                        <p className="text-sm">₹{parseFloat(selectedProduct.price).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <Label>Stock</Label>
                                        <p className="text-sm">{selectedProduct.stockQuantity}</p>
                                    </div>
                                </div>
                                <div>
                                    <Label>Seller</Label>
                                    <p className="text-sm">{selectedProduct.seller.shopName}</p>
                                    <p className="text-xs text-muted-foreground">{selectedProduct.seller.businessEmail}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Moderation Confirmation Dialog */}
            <Dialog open={moderationDialogOpen} onOpenChange={setModerationDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {action === "approve" ? "Approve" : "Reject"} Product
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to {action} "{selectedProduct?.name}"?
                        </DialogDescription>
                    </DialogHeader>

                    {action === "reject" && (
                        <div className="space-y-2">
                            <Label htmlFor="reason">Rejection Reason *</Label>
                            <Textarea
                                id="reason"
                                placeholder="Please provide a detailed reason for rejection..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={4}
                            />
                            <p className="text-xs text-muted-foreground">
                                This reason will be sent to the seller
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModerationDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className={action === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
                            variant={action === "reject" ? "destructive" : "default"}
                            onClick={confirmModeration}
                            disabled={moderateMutation.isPending || (action === "reject" && !rejectionReason)}
                        >
                            {moderateMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Confirm {action === "approve" ? "Approval" : "Rejection"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
