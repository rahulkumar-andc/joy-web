import { Link, useLocation } from "wouter";
import { Home, ShoppingBag, Heart, User, Search } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

export function BottomNav() {
    const [location] = useLocation();
    const { data: cartItems } = useCart();
    const cartCount = cartItems?.reduce((acc, item) => acc + item.item.quantity, 0) || 0;

    const isActive = (path: string) => location === path;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border md:hidden safe-area-bottom">
            <div className="flex justify-around items-center h-16">
                <Link href="/">
                    <a className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive("/") ? "text-primary" : "text-muted-foreground"}`}>
                        <Home className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Home</span>
                    </a>
                </Link>

                <Link href="/shop">
                    <a className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive("/shop") ? "text-primary" : "text-muted-foreground"}`}>
                        <Search className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Shop</span>
                    </a>
                </Link>

                <Link href="/wishlist">
                    <a className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive("/wishlist") ? "text-primary" : "text-muted-foreground"}`}>
                        <Heart className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Wishlist</span>
                    </a>
                </Link>

                <Link href="/cart">
                    <a className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative ${isActive("/cart") ? "text-primary" : "text-muted-foreground"}`}>
                        <div className="relative">
                            <ShoppingBag className="w-5 h-5" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-accent text-[8px] font-bold text-white">
                                    {cartCount}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] font-medium">Cart</span>
                    </a>
                </Link>

                <Link href="/profile">
                    <a className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive("/profile") ? "text-primary" : "text-muted-foreground"}`}>
                        <User className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Profile</span>
                    </a>
                </Link>
            </div>
        </div>
    );
}
