import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
    Search,
    Share2,
    ShoppingBag,
    TrendingUp,
    Filter,
    Check,
    Copy,
    ExternalLink,
    Star,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Product {
    id: number;
    name: string;
    price: string;
    originalPrice?: string;
    images: string[];
    rating: number;
    reviewCount: number;
    category?: string;
}

interface CatalogData {
    reseller: {
        id: number;
        tier: string;
    };
    linkedProductIds: number[];
    links: Array<{
        id: number;
        productId: number;
        shortCode: string;
    }>;
}

export default function ResellerCatalogPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [page, setPage] = useState(1);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [marginValue, setMarginValue] = useState("0");

    // Get catalog info
    const { data: catalogInfo } = useQuery<CatalogData>({
        queryKey: ["/api/reseller/catalog"],
    });

    // Get products
    const { data: productsData, isLoading } = useQuery({
        queryKey: ["/api/products", { search, category, page, limit: 12 }],
    });

    const products = (productsData as any)?.products || [];
    const linkedIds = new Set(catalogInfo?.linkedProductIds || []);
    const linksMap = new Map(catalogInfo?.links?.map(l => [l.productId, l.shortCode]) || []);

    // Create link mutation
    const createLinkMutation = useMutation({
        mutationFn: async (data: { productId: number; marginValue?: string }) => {
            const res = await apiRequest("POST", "/api/reseller/links", {
                productId: data.productId,
                marginType: "percentage",
                marginValue: data.marginValue || "0",
            });
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/reseller/catalog"] });
            toast({
                title: "Link Created!",
                description: "Your share link is ready to use",
            });
            setSelectedProduct(null);
            copyToClipboard(data.link.shortCode);
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create link",
                variant: "destructive",
            });
        },
    });

    const copyToClipboard = (shortCode: string) => {
        const url = `${window.location.origin}/r/${shortCode}`;
        navigator.clipboard.writeText(url);
        toast({
            title: "Copied!",
            description: "Share link copied to clipboard",
        });
    };

    const commissionRate = {
        bronze: 0.05,
        silver: 0.07,
        gold: 0.10,
        platinum: 0.12,
    }[catalogInfo?.reseller?.tier || "bronze"] || 0.05;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Product Catalog</h1>
                        <p className="text-muted-foreground">
                            Browse products & create share links to earn commission
                        </p>
                    </div>
                    <Link to="/reseller/dashboard">
                        <Button variant="outline">
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Button>
                    </Link>
                </div>

                {/* Commission Banner */}
                <Card className="mb-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                    <CardContent className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="h-6 w-6" />
                            <span className="font-medium">
                                You earn <strong>{(commissionRate * 100).toFixed(0)}%</strong> commission on every sale
                            </span>
                        </div>
                        <Badge variant="secondary" className="capitalize">
                            {catalogInfo?.reseller?.tier || "bronze"} Tier
                        </Badge>
                    </CardContent>
                </Card>

                {/* Search & Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search products..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="w-full md:w-48">
                            <Filter className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All Categories</SelectItem>
                            <SelectItem value="electronics">Electronics</SelectItem>
                            <SelectItem value="fashion">Fashion</SelectItem>
                            <SelectItem value="home">Home & Living</SelectItem>
                            <SelectItem value="beauty">Beauty</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Products Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Array(8).fill(0).map((_, i) => (
                            <Card key={i} className="animate-pulse">
                                <div className="aspect-square bg-slate-200"></div>
                                <CardContent className="p-4">
                                    <div className="h-4 bg-slate-200 rounded mb-2"></div>
                                    <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {products.map((product: Product) => {
                            const isLinked = linkedIds.has(product.id);
                            const shortCode = linksMap.get(product.id);
                            const potentialEarning = parseFloat(product.price) * commissionRate;

                            return (
                                <Card key={product.id} className="group overflow-hidden hover:shadow-lg transition-all">
                                    <div className="aspect-square relative bg-slate-100">
                                        {product.images?.[0] && (
                                            <img
                                                src={product.images[0]}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                        {isLinked && (
                                            <div className="absolute top-2 right-2">
                                                <Badge className="bg-green-500">
                                                    <Check className="h-3 w-3 mr-1" />
                                                    Linked
                                                </Badge>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            {isLinked ? (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => copyToClipboard(shortCode!)}
                                                >
                                                    <Copy className="h-4 w-4 mr-1" />
                                                    Copy Link
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => setSelectedProduct(product)}
                                                >
                                                    <Share2 className="h-4 w-4 mr-1" />
                                                    Create Link
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                asChild
                                            >
                                                <Link to={`/product/${product.id}`} target="_blank">
                                                    <ExternalLink className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                    <CardContent className="p-4">
                                        <h3 className="font-medium line-clamp-2 text-sm mb-2">
                                            {product.name}
                                        </h3>
                                        <div className="flex items-center gap-1 mb-2">
                                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                            <span className="text-xs text-muted-foreground">
                                                {product.rating} ({product.reviewCount})
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-lg">₹{product.price}</p>
                                                {product.originalPrice && (
                                                    <p className="text-xs text-muted-foreground line-through">
                                                        ₹{product.originalPrice}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-muted-foreground">You earn</p>
                                                <p className="text-sm font-semibold text-green-600">
                                                    ₹{potentialEarning.toFixed(0)}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                <div className="flex justify-center items-center gap-4 mt-8">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {page}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={products.length < 12}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                {/* Create Link Dialog */}
                <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Share Link</DialogTitle>
                        </DialogHeader>
                        {selectedProduct && (
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="w-20 h-20 rounded-lg bg-slate-100 overflow-hidden">
                                        {selectedProduct.images?.[0] && (
                                            <img
                                                src={selectedProduct.images[0]}
                                                alt={selectedProduct.name}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium">{selectedProduct.name}</h3>
                                        <p className="text-lg font-bold">₹{selectedProduct.price}</p>
                                        <p className="text-sm text-green-600">
                                            Base commission: ₹{(parseFloat(selectedProduct.price) * commissionRate).toFixed(0)}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Add Margin (Optional)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="30"
                                        value={marginValue}
                                        onChange={(e) => setMarginValue(e.target.value)}
                                        placeholder="0"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Add up to 30% margin to your share price. Customers will see a higher price, and you keep the difference.
                                    </p>
                                </div>

                                {marginValue && parseFloat(marginValue) > 0 && (
                                    <Card className="bg-slate-50">
                                        <CardContent className="pt-4">
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span>Original Price</span>
                                                    <span>₹{selectedProduct.price}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Your Margin ({marginValue}%)</span>
                                                    <span>+₹{(parseFloat(selectedProduct.price) * parseFloat(marginValue) / 100).toFixed(0)}</span>
                                                </div>
                                                <div className="flex justify-between font-bold border-t pt-2">
                                                    <span>Customer Pays</span>
                                                    <span>₹{(parseFloat(selectedProduct.price) * (1 + parseFloat(marginValue) / 100)).toFixed(0)}</span>
                                                </div>
                                                <div className="flex justify-between text-green-600 font-semibold">
                                                    <span>Your Total Earning</span>
                                                    <span>
                                                        ₹{(
                                                            parseFloat(selectedProduct.price) * commissionRate +
                                                            parseFloat(selectedProduct.price) * parseFloat(marginValue) / 100
                                                        ).toFixed(0)}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                <Button
                                    className="w-full"
                                    onClick={() => createLinkMutation.mutate({
                                        productId: selectedProduct.id,
                                        marginValue,
                                    })}
                                    disabled={createLinkMutation.isPending}
                                >
                                    {createLinkMutation.isPending ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    ) : (
                                        <Share2 className="mr-2 h-4 w-4" />
                                    )}
                                    Create & Copy Link
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
