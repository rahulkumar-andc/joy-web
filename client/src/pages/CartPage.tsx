import { Layout } from "@/components/Layout";
import { useCart, useRemoveCartItem, useUpdateCartItem } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Trash2, Minus, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function CartPage() {
  const { data: items, isLoading } = useCart();
  const removeItem = useRemoveCartItem();
  const updateItem = useUpdateCartItem();

  const subtotal = items?.reduce((sum, { item, product }) => 
    sum + (Number(product.price) * item.quantity), 0) || 0;

  const shipping = subtotal > 150 ? 0 : 15;
  const total = subtotal + shipping;

  if (isLoading) return <div className="p-20 text-center">Loading cart...</div>;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <h1 className="font-display text-4xl mb-12 text-center">Shopping Bag</h1>

        {!items?.length ? (
          <div className="text-center py-20 bg-secondary/30">
            <p className="text-lg text-muted-foreground mb-6">Your bag is empty.</p>
            <Link href="/shop">
              <Button variant="outline" className="rounded-none uppercase tracking-widest px-8">Continue Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-8">
              {items.map(({ item, product }) => (
                <div key={item.id} className="flex gap-6">
                  <Link href={`/product/${product.id}`} className="block w-24 sm:w-32 aspect-[3/4] bg-secondary flex-shrink-0">
                    <img 
                      src={product.images?.[0]} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-lg">
                          <Link href={`/product/${product.id}`}>{product.name}</Link>
                        </h3>
                        <p className="font-medium">${Number(product.price) * item.quantity}</p>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 space-y-1">
                        {item.size && <p>Size: {item.size}</p>}
                        {item.color && <p>Color: {item.color}</p>}
                      </div>
                    </div>

                    <div className="flex justify-between items-end">
                      <div className="flex items-center border">
                        <button 
                          className="p-2 hover:bg-secondary"
                          onClick={() => updateItem.mutate({ id: item.id, quantity: Math.max(1, item.quantity - 1) })}
                          disabled={updateItem.isPending}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button 
                          className="p-2 hover:bg-secondary"
                          onClick={() => updateItem.mutate({ id: item.id, quantity: item.quantity + 1 })}
                          disabled={updateItem.isPending}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button 
                        onClick={() => removeItem.mutate(item.id)}
                        className="text-sm text-muted-foreground underline hover:text-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-secondary/30 p-8 sticky top-24">
                <h2 className="font-display text-2xl mb-6">Summary</h2>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
                <Link href="/checkout">
                  <Button className="w-full rounded-none h-12 uppercase tracking-widest text-sm">
                    Checkout
                  </Button>
                </Link>
                <div className="mt-4 text-xs text-center text-muted-foreground">
                  Secure Checkout
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
