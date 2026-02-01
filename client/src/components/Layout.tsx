import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Search, Menu, X, User as UserIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const { data: cartItems } = useCart();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const cartCount = cartItems?.reduce((acc, item) => acc + item.item.quantity, 0) || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Announcement Bar */}
      <div className="bg-primary px-4 py-2 text-center text-xs font-medium uppercase tracking-widest text-primary-foreground">
        Free Shipping on Orders Over $150
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Mobile Menu Trigger */}
            <div className="flex items-center lg:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px]">
                  <nav className="flex flex-col gap-4 mt-8">
                    <Link href="/" className="text-lg font-medium" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                    <Link href="/shop" className="text-lg font-medium" onClick={() => setIsMobileMenuOpen(false)}>Shop</Link>
                    <Link href="/shop?category=women" className="text-lg font-medium" onClick={() => setIsMobileMenuOpen(false)}>Women</Link>
                    <Link href="/shop?category=men" className="text-lg font-medium" onClick={() => setIsMobileMenuOpen(false)}>Men</Link>
                    {user?.role === "admin" && (
                      <Link href="/admin" className="text-lg font-medium text-primary" onClick={() => setIsMobileMenuOpen(false)}>Admin</Link>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex gap-8">
              <Link href="/shop" className="text-sm font-medium uppercase tracking-wide hover:text-primary/70 transition-colors">Shop All</Link>
              <Link href="/shop?category=new" className="text-sm font-medium uppercase tracking-wide hover:text-primary/70 transition-colors">New Arrivals</Link>
              <Link href="/shop?category=collections" className="text-sm font-medium uppercase tracking-wide hover:text-primary/70 transition-colors">Collections</Link>
            </nav>

            {/* Logo */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <Link href="/" className="flex items-center gap-2">
                <img src="/logo.png" alt="Steal the Deal" className="h-10 w-10 object-contain" />
                <span className="font-display text-xl font-bold tracking-tighter">Steal the Deal</span>
              </Link>
            </div>

            {/* Icons */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Search className="h-5 w-5" />
              </Button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <UserIcon className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>Profile</DropdownMenuItem>
                    <DropdownMenuItem disabled>Orders</DropdownMenuItem>
                    {user.role === "admin" && (
                      <Link href="/admin">
                        <DropdownMenuItem className="cursor-pointer">Admin Dashboard</DropdownMenuItem>
                      </Link>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logoutMutation.mutate()} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" /> Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/auth">
                  <Button variant="ghost" size="icon">
                    <UserIcon className="h-5 w-5" />
                  </Button>
                </Link>
              )}

              <Link href="/cart">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingBag className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">{children}</main>

      <footer className="border-t bg-secondary/30 pt-16 pb-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Steal the Deal" className="h-10 w-10 object-contain" />
                <h3 className="font-display text-lg font-bold">Steal the Deal</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your one-stop destination for unbeatable deals on quality products.
              </p>
            </div>
            <div>
              <h4 className="font-bold uppercase tracking-wider text-xs mb-4">Shop</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/shop" className="hover:text-primary">All Products</Link></li>
                <li><Link href="/shop?category=new" className="hover:text-primary">New Arrivals</Link></li>
                <li><Link href="/shop?category=featured" className="hover:text-primary">Featured</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold uppercase tracking-wider text-xs mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">About Us</a></li>
                <li><a href="#" className="hover:text-primary">Sustainability</a></li>
                <li><a href="#" className="hover:text-primary">Terms & Conditions</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold uppercase tracking-wider text-xs mb-4">Newsletter</h4>
              <p className="text-sm text-muted-foreground mb-4">Subscribe to receive updates, access to exclusive deals, and more.</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full bg-background border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button size="sm">Subscribe</Button>
              </div>
            </div>
          </div>
          <div className="mt-16 border-t pt-8 text-center text-xs text-muted-foreground">
            © 2024 Steal the Deal. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
