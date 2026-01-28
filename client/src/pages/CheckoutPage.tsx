import { useCart, useCreateOrder } from "@/hooks/use-cart";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLocation } from "wouter";

const shippingSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  zipCode: z.string().min(3, "Zip code is required"),
  country: z.string().min(2, "Country is required"),
});

export default function CheckoutPage() {
  const { data: cartItems } = useCart();
  const createOrderMutation = useCreateOrder();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof shippingSchema>>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      fullName: "",
      address: "",
      city: "",
      zipCode: "",
      country: "",
    },
  });

  const onSubmit = (data: z.infer<typeof shippingSchema>) => {
    createOrderMutation.mutate({ shippingAddress: data }, {
      onSuccess: () => {
        setLocation("/"); // Redirect home after success
      }
    });
  };

  const total = cartItems?.reduce((acc, item) => acc + (Number(item.product.price) * item.item.quantity), 0) || 0;

  return (
    <div className="min-h-screen bg-background font-body">
      <Navbar />
      
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="font-display text-4xl font-bold text-primary mb-8 text-center">Checkout</h1>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Form */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-border/50">
            <h2 className="text-xl font-bold mb-6">Shipping Information</h2>
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
                  name="address"
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
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code</FormLabel>
                        <FormControl><Input placeholder="10001" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                
                <div className="pt-6">
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-lg"
                    disabled={createOrderMutation.isPending}
                  >
                    {createOrderMutation.isPending ? "Processing..." : `Pay ₹${total > 2000 ? total : total + 100}`}
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
            
            <div className="border-t border-primary/10 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                 <span>Subtotal</span>
                 <span>₹{total}</span>
              </div>
              <div className="flex justify-between text-sm">
                 <span>Shipping</span>
                 <span>{total > 2000 ? "Free" : "₹100"}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-primary pt-2">
                 <span>Total</span>
                 <span>₹{total > 2000 ? total : total + 100}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
