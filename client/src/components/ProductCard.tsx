import { Link, useLocation } from "wouter";
import { type Product } from "@shared/schema";
import { ShoppingBag, Heart, Eye, Plus, Check, Star, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAddToCart } from "@/hooks/use-cart";
import { useAddToWishlist, useRemoveFromWishlist, useIsInWishlist } from "@/hooks/use-wishlist";
import { useProductRating } from "@/hooks/use-reviews";
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
  const { data: ratingData } = useProductRating(product.id);


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
  // Formula: (MRP - SalePrice) / MRP * 100
  const discountPercentage = product.salePrice
    ? Math.round(((Number(product.mrp) - Number(product.salePrice)) / Number(product.mrp)) * 100)
    : null;

  return (
    <Link href={`/product/${product.id}`}>
      <motion.article
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3 }}
        className="group relative bg-white flex flex-col h-full hover:shadow-[0_3px_16px_0_rgba(0,0,0,0.11)] transition-shadow duration-200 cursor-pointer overflow-hidden p-3"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Wishlist Heart - Flipkart style: Top right, grey, distinct */}
        <div className="absolute top-3 right-3 z-20">
          <motion.button
            onClick={handleWishlistToggle}
            whileTap={{ scale: 0.8 }}
            className="p-1 rounded-full text-gray-300 hover:text-red-500 transition-colors"
          >
            <Heart
              className={cn(
                "w-5 h-5",
                isInWishlist ? "fill-[#ff4343] text-[#ff4343]" : "fill-gray-200 text-gray-300"
              )}
            />
          </motion.button>
        </div>

        {/* Image Container - Height constraint for alignment */}
        <div className="relative aspect-[4/5] w-full mb-2 flex items-center justify-center">
          <img
            src={product.images[0]}
            alt={product.name}
            className="max-h-full max-w-full object-contain mx-auto transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>

        {/* Product Details - Compact left-aligned */}
        <div className="flex flex-col gap-1 mt-1">
          {/* Brand & Sponsored */}
          <div className="text-[12px] font-medium text-gray-500 uppercase tracking-wide truncate">
            {product.brand || "Steal the Deal"}
          </div>

          {/* Title - Truncated to 1 line for clean grid */}
          <h3 className="font-normal text-[14px] leading-tight text-gray-900 truncate group-hover:text-flipkart-blue transition-colors">
            {product.name}
          </h3>

          {/* Ratings Section - Real Data Only */}
          <div className="flex items-center gap-2 mt-1">
            {ratingData?.avgRating ? (
              <>
                <div className="flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[12px] font-bold px-2 py-[3px] rounded-full shadow-sm">
                  {ratingData.avgRating.toFixed(1)} <Star className="w-2.5 h-2.5 fill-current" />
                </div>
                <span className="text-gray-500 text-[13px] font-medium">({ratingData.totalRatings.toLocaleString()} reviews)</span>
              </>
            ) : (
              <span className="text-gray-400 text-[12px] italic">No ratings yet</span>
            )}
            {/* Verified Seller Badge */}
            {product.sellerId && (
              <div className="ml-auto flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified</span>
              </div>
            )}
          </div>

          {/* Price Section */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Main price = salePrice (transactional) or mrp if no sale */}
            <div className="font-medium text-[16px] text-[#212121]">
              ₹{(product.salePrice || product.mrp).toLocaleString()}
            </div>
            {/* If salePrice exists, show MRP as crossed-out */}
            {product.salePrice && (
              <>
                <div className="text-[14px] text-[#878787] line-through">
                  ₹{product.mrp.toLocaleString()}
                </div>
                <div className="text-[13px] font-bold text-[#388e3c]">
                  {discountPercentage}% off
                </div>
              </>
            )}
          </div>

          {/* Size Preview (Optional) */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="flex gap-1 mt-2 overflow-hidden items-center text-[13px] text-gray-500">
              <span className="mr-1">Size:</span>
              {product.sizes.slice(0, 4).join(", ")}
            </div>
          )}
        </div>
      </motion.article>
    </Link>
  );
}
