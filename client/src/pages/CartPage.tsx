import { useCart, useUpdateCartItem, useRemoveFromCart } from "@/hooks/use-cart";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Minus, Plus, Trash2, ArrowRight } from "lucide-react";

export default function CartPage() {
  const { data: cartItems, isLoading } = useCart();
  const updateMutation = useUpdateCartItem();
  const removeMutation = useRemoveFromCart();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  const total = cartItems?.reduce((acc, item) => acc + (Number(item.product.price) * item.item.quantity), 0) || 0;

  return (
    <div className="min-h-screen bg-background font-body">
      <Navbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-display text-4xl font-bold text-primary mb-8">Shopping Bag</h1>

        {!cartItems || cartItems.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-border/50">
            <h2 className="text-2xl font-medium mb-4">Your bag is empty</h2>
            <p className="text-muted-foreground mb-8">Looks like you haven't added anything yet.</p>
            <Link href="/shop">
              <Button size="lg" className="bg-primary text-white">Continue Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              {cartItems.map((entry) => (
                <div key={entry.item.id} className="flex gap-6 p-6 bg-white rounded-xl shadow-sm border border-border/50">
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
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-border/50 sticky top-24">
                <h3 className="font-display text-xl font-bold mb-6">Order Summary</h3>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₹{total}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span>{total > 2000 ? "Free" : "₹100"}</span>
                  </div>
                  <div className="border-t border-dashed border-border pt-4 flex justify-between font-bold text-lg text-primary">
                    <span>Total</span>
                    <span>₹{total > 2000 ? total : total + 100}</span>
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

      <Footer />
    </div>
  );
}
