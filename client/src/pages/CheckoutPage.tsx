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
    createOrderMutation.mutate({ shippingAddress: data, couponCode: appliedCoupon || undefined }, {
      onSuccess: async (orderData) => {
        try {
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

  const subTotal = cartItems?.reduce((acc, item) => acc + (Number(item.product.price) * item.item.quantity), 0) || 0;
  const shippingCharge = subTotal > 2000 ? 0 : 100;
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

                <div className="pt-4">
                  <PaymentMethodSelector
                    selectedMethod={selectedPaymentMethod}
                    onSelect={setSelectedPaymentMethod}
                  />
                </div>

                <div className="pt-6">
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-lg"
                    disabled={createOrderMutation.isPending}
                  >
                    {isProcessing ? "Processing..." : `Pay ₹${finalTotal}`}
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
                <span>{shippingCharge === 0 ? "Free" : `₹${shippingCharge}`}</span>
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
