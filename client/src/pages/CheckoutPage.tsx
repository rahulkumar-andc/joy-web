import { useState } from "react";
import { useCart, useCreateOrder } from "@/hooks/use-cart";
import { getCookie } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Address } from "@shared/schema";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLocation } from "wouter";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import { usePayment, loadRazorpayScript } from "@/hooks/use-payment";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useShipping } from "@/hooks/use-shipping";
import { Loader2 } from "lucide-react";

const shippingSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  addressLine1: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(3, "Zip code is required"),
  country: z.string().min(2, "Country is required"),
});

export default function CheckoutPage() {
  const { data: cartItems } = useCart();
  const createOrderMutation = useCreateOrder();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  const { data: savedAddresses } = useQuery<Address[]>({
    queryKey: ["/api/user/addresses"],
  });

  const form = useForm<z.infer<typeof shippingSchema>>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      fullName: "",
      addressLine1: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
  });

  const handleSelectAddress = (addr: Address) => {
    setSelectedAddressId(addr.id);
    form.setValue("fullName", addr.fullName);
    form.setValue("addressLine1", addr.addressLine1);
    form.setValue("city", addr.city);
    form.setValue("state", addr.state);
    form.setValue("zipCode", addr.zipCode);
    form.setValue("country", addr.country);
  };

  const { createPaymentOrder, verifyPayment } = usePayment();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [paymentMode, setPaymentMode] = useState<"online" | "cod">("online"); // COD support
  const [deliveryInstructions, setDeliveryInstructions] = useState(""); // COD delivery instructions
  const [isProcessing, setIsProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const handleDisplayRazorpay = async (orderData: any) => {
    try {
      const paymentOrder = await createPaymentOrder({ orderId: orderData.id });

      const options = {
        key: paymentOrder.key,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: "Villen Music",
        description: "Premium Fashion & Lifestyle",
        image: "/logo.png", // Ensure this exists or use a placeholder
        order_id: paymentOrder.razorpayOrderId,
        handler: async (response: any) => {
          try {
            await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setLocation("/order-success");
          } catch (error) {
            console.error("Payment verification failed", error);
            setLocation("/order-failure");
          }
        },
        prefill: {
          name: form.getValues("fullName"),
          email: user?.email || "customer@example.com",
          contact: user?.phone || "",
        },
        // ⚠️ CONVERSION: Mobile payment options
        method: {
          upi: paymentOrder.paymentOptions?.upi !== false,
          card: paymentOrder.paymentOptions?.card !== false,
          netbanking: paymentOrder.paymentOptions?.netbanking !== false,
          wallet: paymentOrder.paymentOptions?.wallet !== false,
          emi: paymentOrder.paymentOptions?.emi || false,
          // Preferred UPI apps (GPay, PhonePe, Paytm)
          ...(paymentOrder.paymentOptions?.preferred_apps && {
            preferred_apps: paymentOrder.paymentOptions.preferred_apps
          })
        },
        theme: {
          color: "#000000",
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          }
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error("Payment flow failed", error);
      setIsProcessing(false);
      setLocation("/order-failure");
    }
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsValidatingCoupon(true);
    setCouponMessage(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
        },
        body: JSON.stringify({ code: couponCode, orderAmount: subTotal })
      });

      const data = await res.json();

      if (data.valid) {
        setDiscount(data.discount);
        setAppliedCoupon(couponCode);
        setCouponMessage({ type: "success", text: `Coupon applied! You saved ₹${data.discount}` });
      } else {
        setDiscount(0);
        setAppliedCoupon(null);
        setCouponMessage({ type: "error", text: data.message || "Invalid coupon" });
      }
    } catch (error) {
      console.error("Coupon validation error", error);
      setCouponMessage({ type: "error", text: "Failed to validate coupon" });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const onSubmit = (data: z.infer<typeof shippingSchema>) => {
    setIsProcessing(true);

    // COD Order Flow: Skip Razorpay payment gateway
    if (paymentMode === 'cod') {
      createOrderMutation.mutate(
        {
          shippingAddress: data,
          couponCode: appliedCoupon || undefined,
          paymentMethod: 'cod',
          deliveryInstructions: deliveryInstructions || undefined
        },
        {
          onSuccess: (orderData) => {
            // COD orders are confirmed immediately
            setLocation(`/order-success?orderId=${orderData.id}&method=cod`);
          },
          onError: () => {
            setIsProcessing(false);
          }
        }
      );
      return;
    }

    // Online Payment Flow (existing Razorpay flow)
    createOrderMutation.mutate({ shippingAddress: data, couponCode: appliedCoupon || undefined }, {
      onSuccess: async (orderData) => {
        try {
          // ⚠️ ZERO AMOUNT ORDER HANDLING
          // If total is 0, backend marks it as PAID immediately.
          // Skip payment gateway and redirect to success.
          if (finalTotal <= 0 || orderData.paymentStatus === "paid" || Number(orderData.totalAmount) <= 0) {
            setLocation("/order-success");
            return;
          }

          // Initiate Stripe Checkout
          const res = await fetch("/api/payments/create-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
            },
            body: JSON.stringify({
              orderId: orderData.id,
              amount: finalTotal.toString()
            })
          });

          if (!res.ok) throw new Error("Payment initiation failed");

          const session = await res.json();
          // Redirect to Stripe Checkout
          window.location.href = session.url;

        } catch (error) {
          console.error("Payment error:", error);
          setIsProcessing(false);
          // location hook is from wouter
          setLocation("/order-failure");
        }
      },
      onError: () => {
        setIsProcessing(false);
      }
    });
  };

  const subTotal = cartItems?.reduce((acc, item) => {
    const price = Number(item.product.discountPrice) > 0
      ? Number(item.product.discountPrice)
      : Number(item.product.price);
    return acc + (price * item.item.quantity);
  }, 0) || 0;

  // Shipping Calculation
  const { data: shippingData, isLoading: isShippingLoading, isError: isShippingError } = useShipping(subTotal);
  const shippingCharge = shippingData?.shippingCost ?? 0;

  const finalTotal = Math.max(0, subTotal + shippingCharge - discount);

  return (
    <div className="min-h-screen bg-background font-body">
      <Navbar />

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="font-display text-4xl font-bold text-primary mb-8 text-center">Checkout</h1>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Form */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-border/50">
            <h2 className="text-xl font-bold mb-6">Shipping Information</h2>

            {/* Address Selection */}
            {savedAddresses && savedAddresses.length > 0 && (
              <div className="mb-8">
                <label className="text-sm font-medium mb-3 block">Saved Addresses</label>
                <div className="grid grid-cols-1 gap-3 mb-4">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => handleSelectAddress(addr)}
                      className={`p-3 rounded-lg border cursor-pointer hover:border-primary/50 transition-all ${selectedAddressId === addr.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                        }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-sm">{addr.label}</span>
                        {selectedAddressId === addr.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{addr.fullName}, {addr.addressLine1}, {addr.city}</p>
                    </div>
                  ))}
                  <div
                    onClick={() => { setSelectedAddressId(null); form.reset({ fullName: "", addressLine1: "", city: "", state: "", zipCode: "", country: "" }); }}
                    className={`p-3 rounded-lg border cursor-pointer hover:border-primary/50 transition-all flex items-center justify-center gap-2 ${selectedAddressId === null ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                      }`}
                  >
                    <span className="text-sm font-medium">Use New Address</span>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">Or enter details</span></div>
                </div>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl><Input placeholder="123 Fashion St" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl><Input placeholder="New York" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl><Input placeholder="NY" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code</FormLabel>
                        <FormControl><Input placeholder="10001" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl><Input placeholder="United States" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Payment Method Selection */}
                <div className="pt-4">
                  <label className="text-sm font-medium mb-3 block">Payment Method</label>
                  <div className="space-y-3">
                    {/* Online Payment */}
                    <div
                      onClick={() => setPaymentMode('online')}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${paymentMode === 'online'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:border-primary/50'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                            {paymentMode === 'online' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                          </div>
                          <div>
                            <p className="font-semibold">Pay Online</p>
                            <p className="text-xs text-muted-foreground">UPI, Card, Net Banking, Wallets</p>
                          </div>
                        </div>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Secure</span>
                      </div>
                    </div>

                    {/* Cash on Delivery */}
                    <div
                      onClick={() => setPaymentMode('cod')}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${paymentMode === 'cod'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:border-primary/50'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                            {paymentMode === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                          </div>
                          <div>
                            <p className="font-semibold">💵 Cash on Delivery</p>
                            <p className="text-xs text-muted-foreground">Pay when you receive the order</p>
                          </div>
                        </div>
                        {finalTotal > 10000 && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Not available</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Online Payment Options */}
                {paymentMode === 'online' && (
                  <div className="pt-4">
                    <PaymentMethodSelector
                      selectedMethod={selectedPaymentMethod}
                      onSelect={setSelectedPaymentMethod}
                    />
                  </div>
                )}

                {/* COD Delivery Instructions */}
                {paymentMode === 'cod' && (
                  <div className="pt-4 space-y-3">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-sm mb-2">💵 COD Instructions</h4>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Payment accepted in cash only</li>
                        <li>• Please keep exact change of ₹{finalTotal}</li>
                        <li>• Verify your order before making payment</li>
                        {finalTotal > 10000 && <li className="text-destructive">• COD not available for orders above ₹10,000</li>}
                      </ul>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Delivery Instructions (Optional)</label>
                      <textarea
                        value={deliveryInstructions}
                        onChange={(e) => setDeliveryInstructions(e.target.value)}
                        placeholder="E.g., Ring the bell twice, Leave at the door, etc."
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none focus:ring-1 focus:ring-primary focus:border-primary"
                        rows={3}
                        maxLength={200}
                      />
                      <p className="text-xs text-muted-foreground mt-1">{deliveryInstructions.length}/200</p>
                    </div>
                  </div>
                )}

                <div className="pt-6">
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-lg"
                    disabled={createOrderMutation.isPending || (paymentMode === 'cod' && finalTotal > 10000)}
                  >
                    {isProcessing
                      ? "Processing..."
                      : paymentMode === 'cod'
                        ? finalTotal > 10000
                          ? "COD Not Available"
                          : `Place COD Order (₹${finalTotal})`
                        : finalTotal > 0
                          ? `Pay ₹${finalTotal}`
                          : "Place Order"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Order Summary */}
          <div className="bg-warm-beige p-8 rounded-2xl border border-border/50 h-fit">
            <h2 className="text-xl font-bold mb-6">Order Summary</h2>
            <div className="space-y-4 max-h-80 overflow-y-auto mb-6 pr-2">
              {cartItems?.map((entry) => (
                <div key={entry.item.id} className="flex gap-4">
                  <img
                    src={entry.product.images[0]}
                    alt={entry.product.name}
                    className="w-16 h-20 object-cover rounded-md bg-white"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-primary line-clamp-2">{entry.product.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {entry.item.quantity}</p>
                    <p className="text-sm font-bold">₹{Number(entry.product.price) * entry.item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon Input */}
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">Have a coupon?</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={!!appliedCoupon}
                />
                {appliedCoupon ? (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setDiscount(0);
                      setCouponMessage(null);
                      setCouponCode("");
                    }}
                  >
                    Remove
                  </Button>
                ) : (
                  <Button
                    onClick={handleValidateCoupon}
                    disabled={!couponCode || isValidatingCoupon}
                  >
                    {isValidatingCoupon ? "Checking..." : "Apply"}
                  </Button>
                )}
              </div>
              {couponMessage && (
                <p className={`text-xs mt-2 ${couponMessage.type === "success" ? "text-green-600" : "text-destructive"}`}>
                  {couponMessage.text}
                </p>
              )}
            </div>

            <div className="border-t border-primary/10 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{subTotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span>
                  {isShippingLoading
                    ? <Loader2 className="h-4 w-4 animate-spin inline" />
                    : isShippingError
                      ? <span className="text-destructive text-xs">Error calculating</span>
                      : (shippingCharge === 0 ? "Free" : `₹${shippingCharge}`)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg text-primary pt-2">
                <span>Total</span>
                <span>₹{finalTotal}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
