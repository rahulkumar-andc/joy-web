import { Link, useLocation } from "wouter";
import { type Product } from "@shared/schema";
import { ShoppingBag, Heart, Eye, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAddToCart } from "@/hooks/use-cart";
import { useAddToWishlist, useRemoveFromWishlist, useIsInWishlist } from "@/hooks/use-wishlist";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

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

  const [isHovered, setIsHovered] = useState(false);
  const [showAddedFeedback, setShowAddedFeedback] = useState(false);

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/auth");
      return;
    }
    addToCartMutation.mutate(
      { productId: product.id, quantity: 1 },
      {
        onSuccess: () => {
          setShowAddedFeedback(true);
          setTimeout(() => setShowAddedFeedback(false), 1500);
        },
      }
    );
  }, [user, navigate, addToCartMutation, product.id]);

  const handleWishlistToggle = useCallback((e: React.MouseEvent) => {
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
  }, [user, navigate, wishlistStatus, removeFromWishlist, addToWishlist, product.id]);

  const isInWishlist = wishlistStatus?.inWishlist;
  const hasSecondImage = product.images.length > 1;

  // Calculate discount percentage if applicable
  const discountPercentage = product.discountPrice
    ? Math.round(((Number(product.discountPrice) - Number(product.price)) / Number(product.discountPrice)) * 100)
    : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        {discountPercentage && discountPercentage > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-destructive text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wider uppercase shadow-sm"
          >
            -{discountPercentage}%
          </motion.span>
        )}
        {product.isNewArrival && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-accent text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wider uppercase shadow-sm"
          >
            New
          </motion.span>
        )}
      </div>

      {/* Wishlist Heart Button */}
      <motion.button
        onClick={handleWishlistToggle}
        whileTap={{ scale: 0.9 }}
        className={cn(
          "absolute top-3 right-3 z-10 p-2.5 rounded-full shadow-md transition-all duration-300",
          isInWishlist
            ? "bg-red-50 text-red-500"
            : "bg-white/90 hover:bg-white text-gray-400 hover:text-red-400"
        )}
        aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart
          className={cn(
            "w-5 h-5 transition-all",
            isInWishlist && "fill-red-500 text-red-500 scale-110"
          )}
        />
      </motion.button>

      {/* Image Container with Hover Swap */}
      <Link href={`/product/${product.id}`} className="block relative aspect-[3/4] overflow-hidden bg-warm-beige">
        {/* Primary Image */}
        <motion.img
          src={product.images[0]}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover"
          animate={{
            opacity: isHovered && hasSecondImage ? 0 : 1,
            scale: isHovered ? 1.05 : 1
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          loading="lazy"
        />

        {/* Secondary Image (shown on hover) */}
        {hasSecondImage && (
          <motion.img
            src={product.images[1]}
            alt={`${product.name} - alternate view`}
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{
              opacity: isHovered ? 1 : 0,
              scale: isHovered ? 1.05 : 1
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            loading="lazy"
          />
        )}

        {/* Quick Actions Overlay */}
        <motion.div
          className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 via-black/30 to-transparent"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex gap-2 justify-center">
            <motion.div
              className="flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                size="sm"
                className={cn(
                  "w-full font-semibold transition-all duration-300",
                  showAddedFeedback
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-white text-primary hover:bg-accent hover:text-white"
                )}
                onClick={handleAddToCart}
                disabled={addToCartMutation.isPending}
              >
                <AnimatePresence mode="wait">
                  {showAddedFeedback ? (
                    <motion.span
                      key="added"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Added!
                    </motion.span>
                  ) : addToCartMutation.isPending ? (
                    <motion.span
                      key="adding"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                      </motion.div>
                      Adding...
                    </motion.span>
                  ) : (
                    <motion.span
                      key="add"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center"
                    >
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Add to Cart
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>

            {onQuickView && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/90 hover:bg-white border-0 shadow-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onQuickView(product);
                  }}
                  aria-label="Quick view"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </Link>

      {/* Product Info */}
      <div className="p-4 space-y-2">
        {/* Brand */}
        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {product.brand || "Steal the Deal"}
        </div>

        {/* Title */}
        <Link href={`/product/${product.id}`}>
          <h3 className="font-display text-lg leading-tight hover:text-accent transition-colors line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-center gap-3 pt-1">
          <span className="font-bold text-lg text-primary">
            ₹{product.price.toLocaleString()}
          </span>
          {product.discountPrice && (
            <>
              <span className="text-sm text-muted-foreground line-through">
                ₹{product.discountPrice.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Save ₹{(Number(product.discountPrice) - Number(product.price)).toLocaleString()}
              </span>
            </>
          )}
        </div>

        {/* Quick Size Preview (if sizes exist) */}
        {product.sizes && product.sizes.length > 0 && (
          <div className="flex items-center gap-1 pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-xs text-muted-foreground mr-1">Sizes:</span>
            {product.sizes.slice(0, 5).map((size) => (
              <span
                key={size}
                className="text-xs px-1.5 py-0.5 border border-border rounded bg-muted/50"
              >
                {size}
              </span>
            ))}
            {product.sizes.length > 5 && (
              <span className="text-xs text-muted-foreground">+{product.sizes.length - 5}</span>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
}
