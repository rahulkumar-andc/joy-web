import { useState } from "react";
import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "@/components/ProductCard";
import { ProductSkeletonGrid } from "@/components/ProductSkeleton";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Product } from "@shared/schema";

interface BoughtTogetherProps {
    currentProductId: number;
    currentProduct: Product;
}

const categoryTabs = [
    { id: "all", label: "All Categories" },
    { id: "shirts", label: "Shirts" },
    { id: "accessories", label: "Accessories" },
    { id: "bottoms", label: "Bottoms" },
];

export function BoughtTogether({ currentProductId, currentProduct }: BoughtTogetherProps) {
    const [activeTab, setActiveTab] = useState("all");
    const [selectedItems, setSelectedItems] = useState<number[]>([currentProductId]);

    const { data: products, isLoading } = useProducts({});

    // Get random products as "frequently bought together"
    const boughtTogetherProducts = products
        ? products
            .filter((p: Product) => p.id !== currentProductId)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
        : [];

    const toggleItem = (productId: number) => {
        setSelectedItems(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const calculateTotal = () => {
        const currentPrice = Number(currentProduct.salePrice || currentProduct.mrp);
        const additionalPrice = boughtTogetherProducts
            .filter((p: Product) => selectedItems.includes(p.id))
            .reduce((sum: number, p: Product) => sum + Number(p.salePrice || p.mrp), 0);
        return currentPrice + additionalPrice;
    };

    if (isLoading) {
        return (
            <div className="bg-white p-4 shadow-sm mt-4">
                <h2 className="text-[18px] font-medium text-gray-900 mb-4">Frequently Bought Together</h2>
                <ProductSkeletonGrid count={3} />
            </div>
        );
    }

    if (boughtTogetherProducts.length === 0) return null;

    return (
        <div className="bg-white p-4 shadow-sm mt-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3 mb-4">
                <h2 className="text-[18px] font-medium text-gray-900">Frequently Bought Together</h2>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-4 mb-6 border-b">
                {categoryTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "pb-2 px-1 text-[14px] font-medium transition-colors relative",
                            activeTab === tab.id
                                ? "text-flipkart-blue border-b-2 border-flipkart-blue"
                                : "text-gray-600 hover:text-flipkart-blue"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Products Grid */}
            <div className="flex items-center gap-4 flex-wrap">
                {/* Current Product */}
                <div className="relative w-[180px] flex-shrink-0">
                    <div className="border rounded p-2 bg-gray-50">
                        <img
                            src={currentProduct.images?.[0] || "/placeholder.png"}
                            alt={currentProduct.name}
                            className="w-full h-[180px] object-contain"
                        />
                        <p className="text-[12px] text-gray-700 mt-2 line-clamp-2">{currentProduct.name}</p>
                        <p className="text-[14px] font-medium">
                            ₹{(currentProduct.salePrice || currentProduct.mrp).toLocaleString()}
                        </p>
                    </div>
                    <div className="absolute -top-2 -left-2 bg-flipkart-blue text-white text-[10px] px-2 py-0.5 rounded">
                        This item
                    </div>
                </div>

                {/* Plus Signs and Other Products */}
                {boughtTogetherProducts.map((product: Product, idx: number) => (
                    <div key={product.id} className="flex items-center gap-4">
                        <Plus className="w-5 h-5 text-gray-400" />
                        <div
                            className={cn(
                                "relative w-[180px] flex-shrink-0 cursor-pointer transition-all",
                                selectedItems.includes(product.id) ? "ring-2 ring-flipkart-blue rounded" : ""
                            )}
                            onClick={() => toggleItem(product.id)}
                        >
                            <div className="border rounded p-2 hover:shadow-md transition-shadow">
                                <img
                                    src={product.images?.[0] || "/placeholder.png"}
                                    alt={product.name}
                                    className="w-full h-[180px] object-contain"
                                />
                                <p className="text-[12px] text-gray-700 mt-2 line-clamp-2">{product.name}</p>
                                <p className="text-[14px] font-medium">
                                    ₹{(product.salePrice || product.mrp).toLocaleString()}
                                </p>
                            </div>
                            <input
                                type="checkbox"
                                checked={selectedItems.includes(product.id)}
                                onChange={() => toggleItem(product.id)}
                                className="absolute top-2 right-2 w-4 h-4 accent-flipkart-blue"
                            />
                        </div>
                    </div>
                ))}

                {/* Total & Add to Cart */}
                <div className="ml-auto flex flex-col items-end gap-2 min-w-[200px]">
                    <div className="text-right">
                        <p className="text-[12px] text-gray-500">Total Price</p>
                        <p className="text-[24px] font-bold text-gray-900">₹{calculateTotal().toLocaleString()}</p>
                        <p className="text-[12px] text-green-600">{selectedItems.length} items selected</p>
                    </div>
                    <Button className="bg-[#ff9f00] hover:bg-[#f39400] text-white font-bold uppercase w-full">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Add {selectedItems.length} items to Cart
                    </Button>
                </div>
            </div>
        </div>
    );
}
