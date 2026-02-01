import { useAuth } from "@/hooks/use-auth";
import { useWishlist, useRemoveFromWishlist } from "@/hooks/use-wishlist";
import { useAddToCart } from "@/hooks/use-cart";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Heart, ShoppingBag, Trash2, Loader2 } from "lucide-react";

export default function WishlistPage() {
    const { user } = useAuth();
    const { data: wishlistItems, isLoading } = useWishlist();
    const removeFromWishlist = useRemoveFromWishlist();
    const addToCart = useAddToCart();

    if (!user) {
        return (
            <div className="min-h-screen bg-background font-body">
                <Navbar />
                <div className="container mx-auto px-4 py-20 text-center">
                    <Heart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Login Required</h1>
                    <p className="text-muted-foreground mb-6">Please login to view your wishlist.</p>
                    <Link href="/auth">
                        <Button className="bg-primary text-white">Login</Button>
                    </Link>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background font-body flex flex-col">
            <Navbar />

            <div className="flex-1 container mx-auto px-4 py-12">
                <h1 className="font-display text-3xl font-bold text-primary mb-8">
                    My Wishlist ({wishlistItems?.length || 0} items)
                </h1>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : !wishlistItems || wishlistItems.length === 0 ? (
                    <div className="text-center py-20">
                        <Heart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <h2 className="text-xl font-medium mb-2">Your wishlist is empty</h2>
                        <p className="text-muted-foreground mb-6">
                            Save items you love by clicking the heart icon on products.
                        </p>
                        <Link href="/shop">
                            <Button className="bg-accent text-white">
                                <ShoppingBag className="mr-2 w-4 h-4" />
                                Explore Products
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {wishlistItems.map((item: any) => (
                            <div key={item.item.id} className="bg-white rounded-xl shadow-sm overflow-hidden group">
                                <Link href={`/product/${item.product.id}`}>
                                    <div className="aspect-square overflow-hidden bg-gray-100">
                                        <img
                                            src={item.product.images?.[0] || "/placeholder.jpg"}
                                            alt={item.product.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                </Link>
                                <div className="p-4">
                                    <p className="text-xs text-muted-foreground mb-1">Steal the Deal</p>
                                    <Link href={`/product/${item.product.id}`}>
                                        <h3 className="font-medium text-sm group-hover:text-accent transition-colors line-clamp-1">
                                            {item.product.name}
                                        </h3>
                                    </Link>
                                    <p className="font-bold text-primary mt-1">₹{item.product.price}</p>

                                    <div className="flex gap-2 mt-4">
                                        <Button
                                            size="sm"
                                            className="flex-1 bg-accent text-white hover:bg-accent/90"
                                            onClick={() => addToCart.mutate({ productId: item.product.id, quantity: 1 })}
                                        >
                                            <ShoppingBag className="w-4 h-4 mr-1" />
                                            Add to Cart
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-500 border-red-200 hover:bg-red-50"
                                            onClick={() => removeFromWishlist.mutate(item.product.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
}
