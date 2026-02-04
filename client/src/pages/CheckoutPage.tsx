import { useState } from "react";
import { useCart, useCreateOrder } from "@/hooks/use-cart";
import { getCookie } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Address } from "@shared/schema";
import { PremiumHeader, PremiumFooter } from "@/components/layout";
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
import { Loader2, MapPin, CreditCard, CheckCircle, Shield, Truck } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const shippingSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  addressLine1: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(3, "Zip code is required"),
  country: z.string().min(2, "Country is required"),
});

const steps = [
  { id: 1, name: "Address", icon: MapPin },
  { id: 2, name: "Payment", icon: CreditCard },
  { id: 3, name: "Review", icon: CheckCircle },
];

export default function CheckoutPage() {
  const { data: cartItems } = useCart();
  const createOrderMutation = useCreateOrder();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

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
  const [paymentMode, setPaymentMode] = useState<"online" | "cod">("online");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
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
        name: "Steal the Deal",
        description: "Premium Shopping Experience",
        image: "/logo.png",
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
        method: {
          upi: paymentOrder.paymentOptions?.upi !== false,
          card: paymentOrder.paymentOptions?.card !== false,
          netbanking: paymentOrder.paymentOptions?.netbanking !== false,
          wallet: paymentOrder.paymentOptions?.wallet !== false,
          emi: paymentOrder.paymentOptions?.emi || false,
          ...(paymentOrder.paymentOptions?.preferred_apps && {
            preferred_apps: paymentOrder.paymentOptions.preferred_apps
          })
        },
        theme: { color: "#000000" },
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

    // COD Order Flow
    if (paymentMode === 'cod') {
      createOrderMutation.mutate(
        {
          shippingAddress: data,
          couponCode: appliedCoupon || undefined,
        },
        {
          onSuccess: (orderData) => {
            setLocation(`/order-success?orderId=${orderData.id}&method=cod`);
          },
          onError: (error: Error) => {
            setIsProcessing(false);
            toast({
              title: "Order Failed",
              description: error.message || "Failed to place your order. Please try again.",
              variant: "destructive",
            });
          }
        }
      );
      return;
    }

    // Online Payment Flow
    createOrderMutation.mutate({ shippingAddress: data, couponCode: appliedCoupon || undefined }, {
      onSuccess: async (orderData) => {
        try {
          if (finalTotal <= 0 || orderData.paymentStatus === "paid" || Number(orderData.totalAmount) <= 0) {
            setLocation("/order-success");
            return;
          }

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
          window.location.href = session.url;

        } catch (error) {
          console.error("Payment error:", error);
          setIsProcessing(false);
          setLocation("/order-failure");
        }
      },
      onError: (error: Error) => {
        setIsProcessing(false);
        toast({
          title: "Order Failed",
          description: error.message || "Failed to place your order. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  const subTotal = cartItems?.reduce((acc, item) => {
    const price = Number(item.product.salePrice) > 0
      ? Number(item.product.salePrice)
      : Number(item.product.mrp);
    return acc + (price * item.item.quantity);
  }, 0) || 0;

  // Check if cart is empty
  const isCartEmpty = !cartItems || cartItems.length === 0;

  const { data: shippingData, isLoading: isShippingLoading, isError: isShippingError } = useShipping(subTotal);
  const shippingCharge = shippingData?.shippingCost ?? 0;
  const finalTotal = Math.max(0, subTotal + shippingCharge - discount);

  const handleNextStep = async () => {
    if (currentStep === 1) {
      const isValid = await form.trigger();
      if (isValid) setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  return (
    <div className="min-h-screen bg-background font-body">
      <PremiumHeader />

      <div className="container mx-auto px-4 py-8 md:py-16 max-w-5xl">
        {/* Step Progress Indicator */}
        <div className="mb-10">
          <div className="flex items-center justify-center">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex flex-col items-center"
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isCompleted
                        ? "bg-green-500 text-white"
                        : isActive
                          ? "bg-accent text-white ring-4 ring-accent/20"
                          : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`text-xs mt-2 font-medium ${isActive ? "text-accent" : isCompleted ? "text-green-600" : "text-muted-foreground"}`}>
                      {step.name}
                    </span>
                  </motion.div>

                  {index < steps.length - 1 && (
                    <div className={`w-16 md:w-24 h-1 mx-2 rounded transition-all duration-300 ${currentStep > step.id ? "bg-green-500" : "bg-muted"
                      }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Form Area */}
          <div className="md:col-span-2 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-border/50">
            {/* Step 1: Address */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-accent" />
                  Shipping Address
                </h2>

                {savedAddresses && savedAddresses.length > 0 && (
                  <div className="mb-6">
                    <label className="text-sm font-medium mb-3 block">Saved Addresses</label>
                    <div className="grid grid-cols-1 gap-3 mb-4">
                      {savedAddresses.map((addr) => (
                        <div
                          key={addr.id}
                          onClick={() => handleSelectAddress(addr)}
                          className={`p-3 rounded-lg border cursor-pointer hover:border-primary/50 transition-all ${selectedAddressId === addr.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"}`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-sm">{addr.label}</span>
                            {selectedAddressId === addr.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{addr.fullName}, {addr.addressLine1}, {addr.city}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Form {...form}>
                  <form className="space-y-4">
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
                          <FormControl><Input placeholder="123 Main St" {...field} /></FormControl>
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
                            <FormControl><Input placeholder="Mumbai" {...field} /></FormControl>
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
                            <FormControl><Input placeholder="Maharashtra" {...field} /></FormControl>
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
                            <FormControl><Input placeholder="400001" {...field} /></FormControl>
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
                            <FormControl><Input placeholder="India" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="button" onClick={handleNextStep} className="w-full mt-6 bg-accent hover:bg-accent/90 text-white">
                      Continue to Payment
                    </Button>
                  </form>
                </Form>
              </motion.div>
            )}

            {/* Step 2: Payment */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-accent" />
                  Payment Method
                </h2>

                <div className="space-y-4">
                  {/* Online Payment */}
                  <div
                    onClick={() => setPaymentMode('online')}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${paymentMode === 'online' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
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

                  {/* COD */}
                  <div
                    onClick={() => setPaymentMode('cod')}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${paymentMode === 'cod' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
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

                  {paymentMode === 'online' && (
                    <PaymentMethodSelector
                      selectedMethod={selectedPaymentMethod}
                      onSelect={setSelectedPaymentMethod}
                    />
                  )}

                  {paymentMode === 'cod' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                      <p className="text-sm font-medium mb-2">💵 COD Instructions</p>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        <li>• Keep exact change of ₹{finalTotal}</li>
                        <li>• Verify order before payment</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 mt-6">
                  <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handleNextStep} className="flex-1 bg-accent hover:bg-accent/90 text-white">
                    Review Order
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-accent" />
                  Review & Place Order
                </h2>

                {/* Address Summary */}
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Delivery Address
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {form.getValues("fullName")}<br />
                    {form.getValues("addressLine1")}<br />
                    {form.getValues("city")}, {form.getValues("state")} {form.getValues("zipCode")}<br />
                    {form.getValues("country")}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="mt-2 text-accent">
                    Edit Address
                  </Button>
                </div>

                {/* Payment Summary */}
                <div className="bg-muted/50 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Payment Method
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {paymentMode === 'online' ? `Online Payment (${selectedPaymentMethod.toUpperCase()})` : 'Cash on Delivery'}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)} className="mt-2 text-accent">
                    Change Payment
                  </Button>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    {isCartEmpty ? (
                      <div className="space-y-3">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                          <p className="text-sm font-medium text-yellow-800 mb-2">🛒 Your cart is empty</p>
                          <p className="text-xs text-yellow-700">Add items to cart before checkout</p>
                        </div>
                        <Button
                          type="button"
                          onClick={() => setLocation("/shop")}
                          className="w-full bg-accent hover:bg-accent/90 text-white h-12 text-lg"
                        >
                          Browse Products
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="submit"
                        className="w-full bg-accent hover:bg-accent/90 text-white h-12 text-lg"
                        disabled={createOrderMutation.isPending || isProcessing || (paymentMode === 'cod' && finalTotal > 10000)}
                      >
                        {isProcessing
                          ? "Processing..."
                          : paymentMode === 'cod'
                            ? finalTotal > 10000 ? "COD Not Available" : `Place COD Order (₹${finalTotal})`
                            : finalTotal > 0 ? `Pay ₹${finalTotal}` : "Place Order"}
                      </Button>
                    )}
                  </form>
                </Form>

                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure Payment</span>
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Free Returns</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="bg-warm-beige p-6 rounded-2xl border border-border/50 h-fit sticky top-24">
            <h2 className="text-lg font-bold mb-4">Order Summary</h2>
            <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
              {cartItems?.map((entry) => (
                <div key={entry.item.id} className="flex gap-3">
                  <img
                    src={entry.product.images[0]}
                    alt={entry.product.name}
                    className="w-14 h-16 object-cover rounded-md bg-white"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-primary line-clamp-2">{entry.product.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {entry.item.quantity}</p>
                    <p className="text-sm font-bold">
                      ₹{(Number(entry.product.salePrice) > 0
                        ? Number(entry.product.salePrice)
                        : Number(entry.product.mrp)) * entry.item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Have a coupon?</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={!!appliedCoupon}
                  className="text-sm"
                />
                {appliedCoupon ? (
                  <Button
                    variant="destructive"
                    size="sm"
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
                  <Button size="sm" onClick={handleValidateCoupon} disabled={!couponCode || isValidatingCoupon}>
                    {isValidatingCoupon ? "..." : "Apply"}
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
                      ? <span className="text-destructive text-xs">Error</span>
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
      <PremiumFooter />
    </div>
  );
}
