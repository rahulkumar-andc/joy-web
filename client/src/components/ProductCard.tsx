import { Link, useLocation } from "wouter";
import { type Product } from "@shared/schema";
import { ShoppingBag, Heart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAddToCart } from "@/hooks/use-cart";
import { useAddToWishlist, useRemoveFromWishlist, useIsInWishlist } from "@/hooks/use-wishlist";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
}

export function ProductCard({ product, onQuickView }: ProductCardProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const addToCartMutation = useAddToCart();
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();
  const { data: wishlistStatus } = useIsInWishlist(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/auth");
      return;
    }
    addToCartMutation.mutate({ productId: product.id, quantity: 1 });
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/auth");
      return;
    }
    if (wishlistStatus?.inWishlist) {
      removeFromWishlist.mutate(product.id);
    } else {
      addToWishlist.mutate(product.id);
    }
  };

  const isInWishlist = wishlistStatus?.inWishlist;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        {product.discountPrice && (
          <span className="bg-destructive text-white text-[10px] font-bold px-2 py-1 rounded-sm tracking-wider uppercase">
            Sale
          </span>
        )}
        {product.isNewArrival && (
          <span className="bg-accent text-white text-[10px] font-bold px-2 py-1 rounded-sm tracking-wider uppercase">
            New
          </span>
        )}
      </div>

      {/* Wishlist Heart Button - Always visible, redirects if needed */}
      <button
        onClick={handleWishlistToggle}
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm transition-all"
      >
        <Heart
          className={`w-5 h-5 transition-colors ${isInWishlist ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-400"
            }`}
        />
      </button>

      {/* Image Container */}
      <Link href={`/product/${product.id}`} className="block relative aspect-[3/4] overflow-hidden bg-gray-100">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Hover Overlay Actions */}
        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex gap-2 justify-center">
            <Button
              size="sm"
              className="bg-white text-primary hover:bg-accent hover:text-white transition-colors flex-1"
              onClick={handleAddToCart}
              disabled={addToCartMutation.isPending}
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              {addToCartMutation.isPending ? "Adding..." : "Add to Cart"}
            </Button>
            {onQuickView && (
              <Button
                size="sm"
                variant="outline"
                className="bg-white/90 hover:bg-white border-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onQuickView(product);
                }}
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="p-4">
        <div className="text-xs text-muted-foreground mb-1 font-medium">{product.brand || "Steal the Deal"}</div>
        <Link href={`/product/${product.id}`}>
          <h3 className="font-display text-lg leading-tight mb-2 hover:text-accent transition-colors truncate">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary">₹{product.price}</span>
          {product.discountPrice && (
            <span className="text-sm text-muted-foreground line-through">₹{product.discountPrice}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
