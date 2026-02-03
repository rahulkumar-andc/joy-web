import { useState } from "react";
import { useCart, useUpdateCartItem, useRemoveFromCart } from "@/hooks/use-cart";
import { useValidateCoupon } from "@/hooks/use-coupons";
import { useShipping } from "@/hooks/use-shipping";
import { PremiumHeader, PremiumFooter } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Minus, Plus, Trash2, ArrowRight, Tag, CheckCircle, XCircle, Loader2, ShoppingBag, Package, Truck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/animations";

export default function CartPage() {
  const { data: cartItems, isLoading } = useCart();
  const updateMutation = useUpdateCartItem();
  const removeMutation = useRemoveFromCart();
  const validateCoupon = useValidateCoupon();

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    message?: string;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  const subtotal = cartItems?.reduce((acc, item) => {
    const price = Number(item.product.discountPrice) > 0
      ? Number(item.product.discountPrice)
      : Number(item.product.price);
    return acc + (price * item.item.quantity);
  }, 0) || 0;
  // Shipping Calculation
  const { data: shippingData, isLoading: isShippingLoading, isError: isShippingError } = useShipping(subtotal);
  const shipping = shippingData?.shippingCost ?? 0;

  const discount = appliedCoupon?.discount || 0;
  // Make sure total calculation waits for shipping or handles defaults
  const total = Math.max(0, subtotal + shipping - discount);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setCouponError(null);
    setAppliedCoupon(null);

    try {
      const result = await validateCoupon.mutateAsync({
        code: couponCode.trim(),
        orderAmount: subtotal,
      });

      if (result.valid) {
        setAppliedCoupon({
          code: couponCode.trim().toUpperCase(),
          discount: result.discount,
        });
        setCouponCode("");
      } else {
        setCouponError(result.message || "Invalid coupon");
      }
    } catch {
      setCouponError("Failed to validate coupon");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  return (
    <div className="min-h-screen bg-background font-body">
      <PremiumHeader />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-display text-4xl font-bold text-primary mb-8">Shopping Bag</h1>

        {!cartItems || cartItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-white rounded-2xl shadow-sm border border-border/50"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center"
            >
              <ShoppingBag className="w-12 h-12 text-muted-foreground" />
            </motion.div>
            <h2 className="text-2xl font-display font-medium mb-4">Your bag is empty</h2>
            <p className="text-muted-foreground mb-8">Looks like you haven't added anything yet.</p>
            <Link href="/shop">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-white">
                Continue Shopping
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Progress bar */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent rounded-xl p-4 mb-6"
              >
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 text-accent">
                    <Package className="w-4 h-4" />
                    <span className="font-medium">{cartItems.length} items</span>
                  </div>
                  {shipping === 0 && subtotal > 0 && (
                    <div className="flex items-center gap-2 text-green-600">
                      <Truck className="w-4 h-4" />
                      <span>Free shipping!</span>
                    </div>
                  )}
                </div>
              </motion.div>

              <AnimatePresence mode="popLayout">
                {cartItems.map((entry, index) => (
                  <motion.div
                    key={entry.item.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex gap-6 p-6 bg-white rounded-xl shadow-sm border border-border/50 hover:shadow-md transition-shadow"
                  >
                    <Link href={`/product/${entry.product.id}`} className="w-24 h-32 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={entry.product.images[0]}
                        alt={entry.product.name}
                        className="w-full h-full object-cover"
                      />
                    </Link>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-display text-lg font-bold text-primary">
                            <Link href={`/product/${entry.product.id}`}>{entry.product.name}</Link>
                          </h3>
                          <span className="font-bold">₹{Number(entry.product.price) * entry.item.quantity}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{entry.product.brand}</p>
                        <div className="text-xs text-muted-foreground space-x-3">
                          {entry.item.size && <span>Size: {entry.item.size}</span>}
                          {entry.item.color && <span>Color: {entry.item.color}</span>}
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center border border-border rounded-lg h-9">
                          <button
                            onClick={() => updateMutation.mutate({ id: entry.item.id, quantity: Math.max(1, entry.item.quantity - 1) })}
                            className="px-3 hover:bg-muted/50 h-full flex items-center justify-center transition-colors"
                            disabled={entry.item.quantity <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{entry.item.quantity}</span>
                          <button
                            onClick={() => updateMutation.mutate({ id: entry.item.id, quantity: entry.item.quantity + 1 })}
                            className="px-3 hover:bg-muted/50 h-full flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeMutation.mutate(entry.item.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-border/50 sticky top-24">
                <h3 className="font-display text-xl font-bold mb-6">Order Summary</h3>

                {/* Coupon Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    <Tag className="w-4 h-4 inline mr-1" /> Discount Code
                  </label>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-700">{appliedCoupon.code}</span>
                        <span className="text-green-600 text-sm">-₹{appliedCoupon.discount.toFixed(2)}</span>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-green-600 hover:text-green-800"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={handleApplyCoupon}
                        disabled={validateCoupon.isPending || !couponCode.trim()}
                      >
                        {validateCoupon.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Apply"
                        )}
                      </Button>
                    </div>
                  )}
                  {couponError && (
                    <p className="text-xs text-destructive mt-2">{couponError}</p>
                  )}
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span>
                      {isShippingLoading
                        ? <Loader2 className="h-4 w-4 animate-spin inline" />
                        : isShippingError
                          ? <span className="text-destructive text-xs">Error calculating</span>
                          : (shipping === 0 ? "Free" : `₹${shipping}`)}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-dashed border-border pt-4 flex justify-between font-bold text-lg text-primary">
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
                <Link href="/checkout">
                  <Button size="lg" className="w-full bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/20">
                    Proceed to Checkout <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <div className="mt-6 text-center">
                  <p className="text-xs text-muted-foreground">Secure Checkout • Money-back Guarantee</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <PremiumFooter />
    </div >
  );
}
