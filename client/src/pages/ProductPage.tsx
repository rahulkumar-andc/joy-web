import { useProduct } from "@/hooks/use-products";
import { useProductReviews, useProductRating, useCreateReview } from "@/hooks/use-reviews";
import { cn } from "@/lib/utils";
import { useAddToWishlist, useRemoveFromWishlist, useIsInWishlist } from "@/hooks/use-wishlist";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useAuth } from "@/hooks/use-auth";
import { PremiumHeader, PremiumFooter } from "@/components/layout";
import { SizeGuideDialog } from "@/components/SizeGuideDialog";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { useRoute, useLocation } from "wouter";
import { X, Heart, ShoppingBag, Truck, ShieldCheck, Share2, Ruler, Star, ChevronRight, Home } from "lucide-react";
import { RelatedProducts } from "@/components/RelatedProducts";
import { ImageGallery } from "@/components/ImageGallery";
import { AvailableOffers } from "@/components/AvailableOffers";
import { RatingHistogram } from "@/components/RatingHistogram";
import { BoughtTogether } from "@/components/BoughtTogether";
import { PincodeCheck } from "@/components/PincodeCheck";
import { CustomerImages } from "@/components/CustomerImages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAddToCart } from "@/hooks/use-cart";
import { useState, useEffect } from "react";
import { Minus, Plus, ArrowLeft, Loader2, Zap, ShoppingCart } from "lucide-react";
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
      <div className="min-h-screen bg-flipkart-bg flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-flipkart-blue" />
        <p className="mt-4 text-gray-500 font-medium">Loading details...</p>
      </div>
    );
  }

  // Calculate discount percentage
  const discountPercentage = product.salePrice
    ? Math.round(((Number(product.mrp) - Number(product.salePrice)) / Number(product.mrp)) * 100)
    : 0;

  const avgRating = ratingData?.avgRating || 0;
  const reviewCount = ratingData?.totalRatings || 0;
  const ratingDistribution = ratingData?.distribution;

  return (
    <div className="min-h-screen bg-flipkart-bg font-body">
      <SEO title={product.name} description={product.description} />
      <PremiumHeader />

      <div className="container mx-auto px-2 lg:px-4 py-4">
        <div className="bg-white shadow-sm rounded-[2px] p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[80vh]">

          {/* LEFT COLUMN: Gallery & Buttons (5 Columns) */}
          <div className="lg:col-span-5 flex flex-col gap-4 relative">
            <ImageGallery images={product.images} productName={product.name} />

            {/* Action Buttons - Sticky/Fixed logic could be added here or kept simple */}
            <div className="flex gap-3 mt-4 lg:mt-6">
              <Button
                className="flex-1 bg-[#ff9f00] hover:bg-[#f39400] text-white h-[56px] text-[16px] font-bold uppercase rounded-[2px] shadow-sm"
                onClick={() => addToCartMutation.mutate({ productId: product.id, quantity })}
                disabled={addToCartMutation.isPending}
              >
                {addToCartMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5 mr-2 fill-white" />}
                Add to Cart
              </Button>
              <Button
                className="flex-1 bg-[#fb641b] hover:bg-[#f05c17] text-white h-[56px] text-[16px] font-bold uppercase rounded-[2px] shadow-sm"
                onClick={() => {
                  addToCartMutation.mutate({ productId: product.id, quantity });
                  navigate("/cart");
                }}
              >
                <Zap className="w-5 h-5 mr-2 fill-white" />
                Buy Now
              </Button>
              {/* Wishlist Toggle Button */}
              <Button
                variant="outline"
                className={cn(
                  "h-[56px] w-[56px] p-0 rounded-[2px] border-2 transition-all duration-200",
                  wishlistStatus?.inWishlist
                    ? "bg-red-50 border-red-400 hover:bg-red-100"
                    : "border-gray-300 hover:border-red-400 hover:bg-red-50"
                )}
                onClick={() => {
                  if (wishlistStatus?.inWishlist) {
                    removeFromWishlist.mutate(product.id);
                  } else {
                    addToWishlist.mutate(product.id);
                  }
                }}
                disabled={addToWishlist.isPending || removeFromWishlist.isPending}
              >
                {addToWishlist.isPending || removeFromWishlist.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                ) : (
                  <Heart
                    className={cn(
                      "w-6 h-6 transition-colors",
                      wishlistStatus?.inWishlist ? "fill-red-500 text-red-500" : "text-gray-400"
                    )}
                  />
                )}
              </Button>
            </div>
          </div>

          {/* RIGHT COLUMN: Details (7 Columns) */}
          <div className="lg:col-span-7 flex flex-col gap-2">
            {/* Breadcrumbs (Mock for now) */}
            <div className="text-[12px] text-gray-500 mb-2 flex items-center gap-1">
              <span className="hover:text-flipkart-blue cursor-pointer">Home</span>
              <span className="text-gray-400">›</span>
              <span className="hover:text-flipkart-blue cursor-pointer capitalize">{product.categoryId ? "Category" : "General"}</span>
            </div>

            {/* Title */}
            <h1 className="text-[18px] lg:text-[20px] font-normal text-gray-900 leading-snug">
              {product.name}
            </h1>

            {/* Ratings Badge - Premium Custom Design */}
            <div className="flex items-center gap-3 mt-2">
              {avgRating > 0 ? (
                <>
                  <div className="flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[13px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                    {avgRating.toFixed(1)} <Star className="w-3 h-3 fill-white" />
                  </div>
                  <span className="text-gray-600 text-[14px] font-medium">{reviewCount.toLocaleString()} Ratings & Reviews</span>
                </>
              ) : (
                <span className="text-gray-400 text-[14px] italic">Be the first to rate this product</span>
              )}
              {/* Quality Assurance Badge */}
              <div className="ml-2 flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span className="text-[11px] font-semibold text-blue-700">Quality Assured</span>
              </div>
            </div>

            {/* Price Section */}
            <div className="flex items-baseline gap-3 mt-3">
              <div className="text-[28px] font-medium text-[#212121]">
                ₹{(product.salePrice || product.mrp).toLocaleString()}
              </div>
              {product.salePrice && (
                <>
                  <div className="text-[16px] text-[#878787] line-through">
                    ₹{product.mrp.toLocaleString()}
                  </div>
                  <div className="text-[16px] font-medium text-[#388e3c]">
                    {discountPercentage}% off
                  </div>
                </>
              )}
            </div>

            {/* Offers */}
            <AvailableOffers offers={product.offers as any[]} />

            {/* Warranty / Seller / Description */}
            <div className="grid grid-cols-[110px_1fr] gap-y-4 text-[14px] mt-4 mb-6">
              {product.warranty && (
                <>
                  <div className="text-[#878787] font-medium">Warranty</div>
                  <div>{product.warranty}</div>
                </>
              )}

              <div className="text-[#878787] font-medium">Seller</div>
              <div className="flex flex-col">
                <div className="text-flipkart-blue font-medium cursor-pointer">{product.sellerName || "RetailNet"}</div>
                <div className="flex items-center gap-1 mt-1 text-[12px]">
                  {product.sellerRating && (
                    <span className="bg-flipkart-blue text-white px-1.5 rounded-[2px] leading-tight flex items-center gap-0.5">
                      {String(product.sellerRating)} <Star className="w-2 h-2 fill-white" />
                    </span>
                  )}
                  <span className="text-gray-500">{product.returnPolicyDays ? `${product.returnPolicyDays} Days Return Policy` : "No Returns"}</span>
                </div>
              </div>

              <div className="text-[#878787] font-medium">Description</div>
              <div className="text-gray-900 leading-relaxed">
                {product.description}
              </div>
            </div>

            {/* Pincode Check */}
            <PincodeCheck />

            {/* Size Selector (if applicable) */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="grid grid-cols-[110px_1fr] gap-y-4 text-[14px] mb-6">
                <div className="text-[#878787] font-medium pt-2">Size</div>
                <div className="flex gap-2 flex-wrap">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={cn(
                        "min-w-[40px] h-[36px] px-2 border rounded-[2px] font-medium text-[14px] transition-colors relative",
                        selectedSize === s
                          ? "border-flipkart-blue text-flipkart-blue bg-blue-50"
                          : "border-gray-300 text-gray-900 hover:border-flipkart-blue"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Full Specifications Section */}
            <div className="border rounded-[2px] p-4 mt-4">
              <h3 className="text-[20px] font-medium text-gray-900 mb-4">Product Details</h3>
              <div className="text-[#878787] text-sm grid grid-cols-1 gap-y-2">
                {product.brand && (
                  <div className="grid grid-cols-[110px_1fr]">
                    <span className="font-medium">Brand</span>
                    <span className="text-black">{product.brand}</span>
                  </div>
                )}
                {product.material && (
                  <div className="grid grid-cols-[110px_1fr]">
                    <span className="font-medium">Material</span>
                    <span className="text-black">{product.material}</span>
                  </div>
                )}
                {product.pattern && (
                  <div className="grid grid-cols-[110px_1fr]">
                    <span className="font-medium">Pattern</span>
                    <span className="text-black">{product.pattern}</span>
                  </div>
                )}
                {product.countryOfOrigin && (
                  <div className="grid grid-cols-[110px_1fr]">
                    <span className="font-medium">Country</span>
                    <span className="text-black">{product.countryOfOrigin}</span>
                  </div>
                )}

                {product.specifications && Object.entries(product.specifications as Record<string, any>).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[110px_1fr]">
                    <span className="font-medium capitalize">{key}</span>
                    <span className="text-black">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Highlights Section */}
            {product.highlights && (
              <div className="border rounded-[2px] p-4 mt-4">
                <h3 className="text-[20px] font-medium text-gray-900 mb-4">Highlights</h3>
                <ul className="list-disc pl-5 text-[14px] space-y-2 text-gray-900">
                  {Array.isArray(product.highlights) && product.highlights.map((h: string, i: number) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ratings & Reviews Section */}
            <div className="border rounded-[2px] p-4 mt-6">
              <h3 className="text-[20px] font-medium text-gray-900 mb-4 flex items-center justify-between">
                Ratings & Reviews
                <Button variant="outline" className="shadow-md h-auto py-2 text-sm">Rate Product</Button>
              </h3>

              <RatingHistogram totalRatings={reviewCount} avgRating={avgRating} distribution={ratingDistribution} />

              {/* Customer Images Gallery */}
              <CustomerImages images={reviews?.filter((r: any) => r.images?.length).flatMap((r: any) => r.images) || []} />

              {/* Simplified Reviews Display */}
              <div className="space-y-4 pt-6 mt-6 border-t">
                {!reviews || reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
                  </div>
                ) : (
                  reviews.map((item: any) => (
                    <div key={item.review.id} className="border-b last:border-0 pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1 bg-green-700 text-white text-[12px] font-bold px-1.5 py-[2px] rounded-[3px] w-fit">
                          {item.review.rating} <Star className="w-2.5 h-2.5 fill-white" />
                        </div>
                        <span className="font-medium text-sm text-gray-900">{item.user.name}</span>
                      </div>
                      <p className="text-gray-700 text-sm">{item.review.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Similar Products Carousel would go here */}
        <div className="mt-4 bg-white p-4 shadow-sm" >
          <div className="flex justify-between items-center border-b pb-3 mb-4">
            <h2 className="text-[20px] font-bold text-gray-900">Similar Products</h2>
            <Button className="bg-flipkart-blue text-white hover:bg-blue-700 h-8 text-sm">VIEW ALL</Button>
          </div>
          <RelatedProducts currentProductId={product.id} category={String(product.categoryId)} />
        </div>

        {/* Bought Together Section */}
        <BoughtTogether currentProductId={product.id} currentProduct={product} />

        <RecentlyViewed excludeId={product.id} />

      </div>
      <PremiumFooter />
    </div>
  );
}
