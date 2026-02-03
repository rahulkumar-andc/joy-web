import { useProduct } from "@/hooks/use-products";
import { useProductReviews, useProductRating, useCreateReview } from "@/hooks/use-reviews";
import { useAddToWishlist, useRemoveFromWishlist, useIsInWishlist } from "@/hooks/use-wishlist";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useAuth } from "@/hooks/use-auth";
import { PremiumHeader, PremiumFooter } from "@/components/layout";
import { SizeGuideDialog } from "@/components/SizeGuideDialog";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { useRoute, useLocation } from "wouter";
import { X, Heart, ShoppingBag, Truck, ShieldCheck, Share2, Ruler, Star, ChevronRight, Home } from "lucide-react";
import { RelatedProducts } from "@/components/RelatedProducts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAddToCart } from "@/hooks/use-cart";
import { useState, useEffect } from "react";
import { Minus, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductPage() {
  const [, params] = useRoute("/product/:id");
  const [, navigate] = useLocation();
  const id = params ? parseInt(params.id) : 0;
  const { data: product, isLoading } = useProduct(id);
  const { data: reviews } = useProductReviews(id);
  const { data: ratingData } = useProductRating(id);
  const createReview = useCreateReview();
  const addToCartMutation = useAddToCart();
  const { user } = useAuth();

  // Wishlist
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();
  const { data: wishlistStatus } = useIsInWishlist(id);

  // Recently viewed
  const { addToRecent } = useRecentlyViewed();
  useEffect(() => {
    if (id && product) {
      addToRecent(id);
    }
  }, [id, product, addToRecent]);

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  if (isLoading || !product) {
    return (
      <div className="min-h-screen bg-background font-body">
        <PremiumHeader />
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="aspect-[3/4]"><Skeleton className="w-full h-full rounded-2xl" /></div>
            <div className="space-y-6">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    addToCartMutation.mutate({
      productId: product.id,
      quantity,
      size: selectedSize || undefined,
      color: selectedColor || undefined
    });
  };

  const handleWishlistToggle = () => {
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

  const handleSubmitReview = () => {
    if (!user) return;
    createReview.mutate(
      { productId: product.id, rating: reviewRating, comment: reviewComment },
      { onSuccess: () => { setReviewComment(""); setReviewRating(5); } }
    );
  };

  const isInWishlist = wishlistStatus?.inWishlist;
  const avgRating = ratingData?.rating || 0;
  const reviewCount = ratingData?.count || 0;

  return (
    <div className="min-h-screen bg-background font-body">
      <SEO
        title={product.name}
        description={product.description}
        image={product.images[0]}
      />
      <PremiumHeader />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/shop" className="inline-flex items-center text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Shop
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Gallery */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <div className="aspect-[3/4] bg-white rounded-2xl overflow-hidden shadow-sm relative">
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={handleWishlistToggle}
                className="absolute top-4 right-4 p-3 rounded-full bg-white/90 hover:bg-white shadow-md transition-all"
              >
                <Heart
                  className={`w-6 h-6 transition-colors ${isInWishlist ? "fill-red-500 text-red-500" : "text-gray-400"
                    }`}
                />
              </button>
            </div>
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="mb-2 text-accent font-medium tracking-wide text-sm uppercase">{product.brand || "Steal the Deal"}</div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-primary mb-4">{product.name}</h1>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.round(avgRating) ? "fill-current" : "text-gray-300"}`} />
                ))}
              </div>
              <span className="text-muted-foreground text-sm">
                {avgRating > 0 ? `${avgRating} (${reviewCount} Reviews)` : "No reviews yet"}
              </span>
            </div>

            <div className="text-3xl font-bold text-primary mb-8">
              ₹{product.price}
              {product.discountPrice && (
                <span className="ml-3 text-xl text-muted-foreground line-through decoration-destructive">₹{product.discountPrice}</span>
              )}
            </div>

            <p className="text-muted-foreground leading-relaxed mb-8 border-b border-border pb-8">
              {product.description}
            </p>

            {/* Selectors */}
            <div className="space-y-6 mb-8">
              {product.colors && product.colors.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-3">Color</label>
                  <div className="flex gap-3">
                    {product.colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${selectedColor === color ? "border-primary scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: color.toLowerCase() === 'white' ? '#f0f0f0' : color.toLowerCase() }}
                        title={color}
                      >
                        {selectedColor === color && <div className="w-2 h-2 rounded-full bg-white shadow-sm" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium">Size</label>
                    <SizeGuideDialog />
                  </div>
                  <div className="flex gap-3">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`w-12 h-12 rounded-lg border flex items-center justify-center font-medium transition-all ${selectedSize === size ? "border-primary bg-primary text-white" : "border-border hover:border-primary/50"}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4 mb-8">
              <div className="flex items-center border border-border rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <Button
                size="lg"
                className="flex-1 bg-accent hover:bg-accent/90 text-white h-auto text-lg"
                onClick={handleAddToCart}
                disabled={addToCartMutation.isPending}
              >
                {addToCartMutation.isPending ? "Adding..." : "Add to Cart"}
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground bg-warm-beige/50 p-6 rounded-xl">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-primary" />
                <span>Free shipping over ₹2000</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <span>2 Year Warranty</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Reviews Section */}
        <div className="mt-16 border-t border-border pt-12">
          <h2 className="font-display text-2xl font-bold text-primary mb-8">Customer Reviews</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Write Review */}
            {user ? (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-medium mb-4">Write a Review</h3>
                <div className="mb-4">
                  <label className="block text-sm text-muted-foreground mb-2">Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className="p-1"
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${star <= reviewRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea
                  placeholder="Share your experience with this product..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="mb-4"
                  rows={4}
                />
                <Button
                  onClick={handleSubmitReview}
                  disabled={createReview.isPending}
                  className="w-full bg-accent text-white"
                >
                  {createReview.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                  ) : (
                    "Submit Review"
                  )}
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                <p className="text-muted-foreground mb-4">Login to write a review</p>
                <Link href="/auth">
                  <Button variant="outline">Login</Button>
                </Link>
              </div>
            )}

            {/* Reviews List */}
            <div className="lg:col-span-2 space-y-4">
              {!reviews || reviews.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl">
                  <Star className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
                </div>
              ) : (
                reviews.map((item: any) => (
                  <div key={item.review.id} className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary">
                          {item.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{item.user.name}</p>
                          <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < item.review.rating ? "fill-current" : "text-gray-300"}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {item.review.comment && (
                      <p className="text-muted-foreground">{item.review.comment}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        {/* Recently Viewed */}
        <RecentlyViewed excludeId={product.id} />
      </div>

      <PremiumFooter />
    </div>
  );
}
