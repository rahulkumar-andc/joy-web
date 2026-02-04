import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAddToCart } from "@/hooks/use-cart";
import { useAddToWishlist, useRemoveFromWishlist, useIsInWishlist } from "@/hooks/use-wishlist";
import { useAuth } from "@/hooks/use-auth";
import { Star, Heart, ShoppingBag, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { type Product } from "@shared/schema";

interface QuickViewModalProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function QuickViewModal({ product, open, onOpenChange }: QuickViewModalProps) {
    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);

    const addToCart = useAddToCart();
    const addToWishlist = useAddToWishlist();
    const removeFromWishlist = useRemoveFromWishlist();
    const { data: wishlistStatus } = useIsInWishlist(product?.id || 0);
    const { user } = useAuth();

    if (!product) return null;

    const handleAddToCart = () => {
        addToCart.mutate({
            productId: product.id,
            quantity,
            size: selectedSize || undefined,
            color: selectedColor || undefined
        });
        onOpenChange(false);
    };

    const handleWishlistToggle = () => {
        if (!user) return;
        if (wishlistStatus?.inWishlist) {
            removeFromWishlist.mutate(product.id);
        } else {
            addToWishlist.mutate(product.id);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Image */}
                    <div className="aspect-[3/4] md:aspect-auto bg-muted">
                        <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Details */}
                    <div className="p-6 md:p-8 flex flex-col">
                        {product.brand && (
                            <span className="text-accent text-sm font-medium uppercase tracking-wide mb-1">
                                {product.brand}
                            </span>
                        )}

                        <h2 className="font-display text-2xl md:text-3xl font-bold text-primary mb-4">
                            {product.name}
                        </h2>

                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-4 h-4 ${i < 4 ? "fill-current" : "text-gray-300"}`} />
                                ))}
                            </div>
                            <span className="text-sm text-muted-foreground">(12 reviews)</span>
                        </div>

                        <div className="text-2xl font-bold text-primary mb-4">
                            ₹{(product.salePrice || product.mrp)}
                            {product.salePrice && (
                                <span className="ml-2 text-lg text-muted-foreground line-through">
                                    ₹{product.mrp}
                                </span>
                            )}
                        </div>

                        {product.description && (
                            <p className="text-muted-foreground text-sm mb-6 line-clamp-3">
                                {product.description}
                            </p>
                        )}

                        {/* Size selector */}
                        {product.sizes && product.sizes.length > 0 && (
                            <div className="mb-4">
                                <span className="text-sm font-medium mb-2 block">Size</span>
                                <div className="flex gap-2">
                                    {product.sizes.map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => setSelectedSize(size)}
                                            className={`w-10 h-10 rounded-lg border flex items-center justify-center text-sm font-medium transition-all
                        ${selectedSize === size ? "border-primary bg-primary text-white" : "border-border hover:border-primary/50"}`}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Color selector */}
                        {product.colors && product.colors.length > 0 && (
                            <div className="mb-6">
                                <span className="text-sm font-medium mb-2 block">Color</span>
                                <div className="flex gap-2">
                                    {product.colors.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setSelectedColor(color)}
                                            className={`w-8 h-8 rounded-full border-2 transition-all
                        ${selectedColor === color ? "border-primary scale-110" : "border-transparent"}`}
                                            style={{ backgroundColor: color.toLowerCase() === 'white' ? '#f0f0f0' : color.toLowerCase() }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quantity and actions */}
                        <div className="flex items-center gap-3 mt-auto">
                            <div className="flex items-center border border-border rounded-lg">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="px-3 py-2 hover:bg-muted/50"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-10 text-center font-medium">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="px-3 py-2 hover:bg-muted/50"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            <Button
                                className="flex-1 bg-accent hover:bg-accent/90 text-white"
                                onClick={handleAddToCart}
                                disabled={addToCart.isPending}
                            >
                                <ShoppingBag className="w-4 h-4 mr-2" />
                                {addToCart.isPending ? "Adding..." : "Add to Cart"}
                            </Button>

                            {user && (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleWishlistToggle}
                                >
                                    <Heart
                                        className={`w-5 h-5 ${wishlistStatus?.inWishlist ? "fill-red-500 text-red-500" : ""}`}
                                    />
                                </Button>
                            )}
                        </div>

                        <Link
                            href={`/product/${product.id}`}
                            className="text-sm text-accent hover:underline text-center mt-4"
                            onClick={() => onOpenChange(false)}
                        >
                            View Full Details →
                        </Link>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
