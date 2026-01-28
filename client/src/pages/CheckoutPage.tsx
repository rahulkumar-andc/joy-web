import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/use-cart";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const checkoutSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  cardName: z.string().min(1, "Card name is required"),
  cardNumber: z.string().min(16, "Invalid card number"),
  expiry: z.string().min(4, "Invalid expiry"),
  cvc: z.string().min(3, "Invalid CVC"),
});

export default function CheckoutPage() {
  const { data: cartItems } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const subtotal = cartItems?.reduce((sum, { item, product }) => 
    sum + (Number(product.price) * item.quantity), 0) || 0;
  const shipping = subtotal > 150 ? 0 : 15;
  const total = subtotal + shipping;

  const createOrder = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.orders.create.path, {
        method: api.orders.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingAddress: data }),
      });
      if (!res.ok) throw new Error("Order failed");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.cart.get.path] });
      toast({ title: "Order Confirmed", description: "Thank you for your purchase!" });
      setLocation("/");
    },
    onError: () => {
      toast({ title: "Error", description: "Payment failed. Please try again.", variant: "destructive" });
    }
  });

  const form = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: "", address: "", city: "", postalCode: "", country: "",
      cardName: "", cardNumber: "", expiry: "", cvc: ""
    }
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <h1 className="font-display text-3xl mb-12 text-center">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createOrder.mutate(data))} className="space-y-8">
                
                {/* Shipping Info */}
                <div className="space-y-4">
                  <h2 className="font-medium text-lg uppercase tracking-wide border-b pb-2">Shipping Address</h2>
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input {...field} className="rounded-none h-11" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl><Input {...field} className="rounded-none h-11" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl><Input {...field} className="rounded-none h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="postalCode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl><Input {...field} className="rounded-none h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl><Input {...field} className="rounded-none h-11" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Payment Info */}
                <div className="space-y-4">
                  <h2 className="font-medium text-lg uppercase tracking-wide border-b pb-2">Payment Details</h2>
                  <FormField control={form.control} name="cardName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name on Card</FormLabel>
                      <FormControl><Input {...field} className="rounded-none h-11" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cardNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Number</FormLabel>
                      <FormControl><Input {...field} className="rounded-none h-11" placeholder="0000 0000 0000 0000" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="expiry" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiry</FormLabel>
                        <FormControl><Input {...field} className="rounded-none h-11" placeholder="MM/YY" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="cvc" render={({ field }) => (
                      <FormItem>
                        <FormLabel>CVC</FormLabel>
                        <FormControl><Input {...field} className="rounded-none h-11" placeholder="123" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                <Button type="submit" className="w-full h-14 rounded-none uppercase tracking-widest text-base" disabled={createOrder.isPending}>
                  {createOrder.isPending ? "Processing..." : `Pay $${total.toFixed(2)}`}
                </Button>
              </form>
            </Form>
          </div>

          {/* Order Review */}
          <div className="lg:col-span-1">
            <div className="bg-secondary/30 p-8 sticky top-24">
              <h2 className="font-display text-2xl mb-6">Order Summary</h2>
              <div className="space-y-4 mb-6 max-h-60 overflow-y-auto">
                {cartItems?.map(({ item, product }) => (
                  <div key={item.id} className="flex gap-4">
                    <img src={product.images?.[0]} className="w-16 h-20 object-cover" alt="" />
                    <div className="text-sm">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-muted-foreground">Qty: {item.quantity}</p>
                      <p>${Number(product.price) * item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span>${shipping.toFixed(2)}</span></div>
                <div className="flex justify-between font-medium text-lg pt-2 border-t"><span>Total</span><span>${total.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
