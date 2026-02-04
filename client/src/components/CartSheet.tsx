
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
    SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useCart, useUpdateCartItem, useRemoveFromCart } from "@/hooks/use-cart";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

interface CartSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
    const { data: cartItems, isLoading } = useCart();
    const updateMutation = useUpdateCartItem();
    const removeMutation = useRemoveFromCart();

    const subtotal = cartItems?.reduce((acc, item) => acc + ((Number(item.product.salePrice) > 0 ? Number(item.product.salePrice) : Number(item.product.mrp)) * item.item.quantity), 0) || 0;
    const itemCount = cartItems?.reduce((acc, item) => acc + item.item.quantity, 0) || 0;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col w-full sm:max-w-lg">
                <SheetHeader className="border-b pb-4">
                    <SheetTitle className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5" />
                        Shopping Bag ({itemCount})
                    </SheetTitle>
                </SheetHeader>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : !cartItems || cartItems.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                        <ShoppingBag className="w-16 h-16 text-muted-foreground/30" />
                        <div className="space-y-1">
                            <h3 className="font-medium text-lg">Your bag is empty</h3>
                            <p className="text-muted-foreground text-sm">Looks like you haven't added anything yet.</p>
                        </div>
                        <SheetClose asChild>
                            <Link href="/shop">
                                <Button>Start Shopping</Button>
                            </Link>
                        </SheetClose>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="flex-1 -mx-6 px-6">
                            <div className="space-y-6 py-6">
                                {cartItems.map((entry) => (
                                    <div key={entry.item.id} className="flex gap-4">
                                        <div className="w-20 h-24 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                                            <img
                                                src={entry.product.images[0]}
                                                alt={entry.product.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <h4 className="font-medium text-sm line-clamp-1">
                                                    <Link href={`/product/${entry.product.id}`} onClick={() => onOpenChange(false)} className="hover:text-accent transition-colors">
                                                        {entry.product.name}
                                                    </Link>
                                                </h4>
                                                <p className="text-xs text-muted-foreground mt-1">₹{entry.product.salePrice || entry.product.mrp}</p>
                                                <div className="text-xs text-muted-foreground mt-1 space-x-2">
                                                    {entry.item.size && <span>{entry.item.size}</span>}
                                                    {entry.item.color && <span>{entry.item.color}</span>}
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center mt-2">
                                                <div className="flex items-center border border-border rounded h-8">
                                                    <button
                                                        onClick={() => updateMutation.mutate({ id: entry.item.id, quantity: Math.max(1, entry.item.quantity - 1) })}
                                                        className="px-2 h-full hover:bg-muted/50 transition-colors"
                                                        disabled={entry.item.quantity <= 1}
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className="w-8 text-center text-xs font-medium">{entry.item.quantity}</span>
                                                    <button
                                                        onClick={() => updateMutation.mutate({ id: entry.item.id, quantity: entry.item.quantity + 1 })}
                                                        className="px-2 h-full hover:bg-muted/50 transition-colors"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => removeMutation.mutate(entry.item.id)}
                                                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        <div className="border-t pt-4 space-y-4">
                            <div className="flex justify-between font-medium">
                                <span>Subtotal</span>
                                <span>₹{subtotal.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                                Shipping & taxes calculated at checkout
                            </p>
                            <SheetClose asChild>
                                <Link href="/checkout" className="w-full">
                                    <Button className="w-full bg-accent hover:bg-accent/90 text-white" size="lg">
                                        Checkout <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </Link>
                            </SheetClose>
                            <SheetClose asChild>
                                <Link href="/cart" className="w-full block text-center">
                                    <Button variant="outline" className="w-full">
                                        View Full Cart
                                    </Button>
                                </Link>
                            </SheetClose>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
