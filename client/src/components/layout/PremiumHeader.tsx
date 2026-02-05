import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useTheme } from "@/hooks/use-theme";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import {
    ShoppingBag,
    User as UserIcon,
    LogOut,
    Menu,
    X,
    Search,
    Heart,
    Package,
    Sun,
    Moon,
    Store,
    LayoutDashboard,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { CartSheet } from "@/components/CartSheet";

interface PremiumHeaderProps {
    /**
     * When true, header is hidden initially and reveals on scroll (landing page behavior)
     * When false, header is always visible with blur effect on scroll (default)
     */
    isLandingPage?: boolean;
}

export function PremiumHeader({ isLandingPage = false }: PremiumHeaderProps) {
    const { user, logoutMutation } = useAuth();
    if (user) console.log("HEADER USER DEBUG:", user, "Roles:", (user as any).rbacRoles);
    const { data: cartItems } = useCart();
    const { resolvedTheme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [location] = useLocation();

    const { hasScrolled, isAtTop } = useScrollPosition(10);

    const cartCount = cartItems?.reduce((acc, item) => acc + item.item.quantity, 0) || 0;

    const navLinks = [
        { href: "/", label: "Home" },
        { href: "/shop", label: "Shop" },
        { href: "/seller", label: "Sell" },
    ];

    // Determine header visibility for landing page
    const isVisible = isLandingPage ? hasScrolled : true;

    // Background styles based on scroll state
    const headerBg = hasScrolled
        ? "bg-white/95 dark:bg-background/95 backdrop-blur-md border-border/40 shadow-sm"
        : "bg-transparent border-transparent";

    return (
        <>
            <AnimatePresence>
                {isVisible && (
                    <motion.header
                        initial={isLandingPage ? { y: -100, opacity: 0 } : false}
                        animate={{ y: 0, opacity: 1 }}
                        exit={isLandingPage ? { y: -100, opacity: 0 } : undefined}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${headerBg}`}
                    >
                        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex justify-between items-center h-20">
                                {/* Logo - Left */}
                                <Link href="/" className="flex items-center gap-2 min-w-[180px]">
                                    <img
                                        src="/logo.png"
                                        alt="Steal the Deal"
                                        className="h-10 w-10 object-contain"
                                    />
                                    <span className="font-display text-xl font-bold tracking-tight text-primary">
                                        Steal the Deal
                                    </span>
                                </Link>

                                {/* Navigation - Center */}
                                <nav className="hidden md:flex items-center justify-center gap-8 flex-1">
                                    {navLinks.map((link) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className={`text-sm font-medium tracking-wide uppercase transition-colors hover:text-accent ${location === link.href
                                                ? "text-accent"
                                                : "text-muted-foreground"
                                                }`}
                                        >
                                            {link.label}
                                        </Link>
                                    ))}
                                </nav>

                                {/* Actions - Right */}
                                <div className="flex items-center gap-1 min-w-[180px] justify-end">
                                    {/* Search */}
                                    <div className="hidden md:flex items-center">
                                        {showSearch ? (
                                            <div className="flex items-center relative">
                                                <div className="w-64">
                                                    <SearchAutocomplete
                                                        onClose={() => setShowSearch(false)}
                                                        className="w-full"
                                                    />
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-9 w-9 ml-1"
                                                    onClick={() => setShowSearch(false)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setShowSearch(true)}
                                                className="hover:bg-accent/10"
                                            >
                                                <Search className="w-5 h-5 text-muted-foreground" />
                                            </Button>
                                        )}
                                    </div>

                                    {/* Theme Toggle */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                                        className="hidden md:flex hover:bg-accent/10"
                                    >
                                        {resolvedTheme === "dark" ? (
                                            <Sun className="w-5 h-5" />
                                        ) : (
                                            <Moon className="w-5 h-5" />
                                        )}
                                    </Button>

                                    {/* Wishlist */}
                                    <Link
                                        href="/wishlist"
                                        className="hidden md:flex p-2 text-muted-foreground hover:text-accent transition-colors"
                                    >
                                        <Heart className="w-5 h-5" />
                                    </Link>

                                    {/* Cart */}
                                    <button
                                        onClick={() => setIsCartOpen(true)}
                                        className="relative p-2 text-muted-foreground hover:text-accent transition-colors"
                                    >
                                        <ShoppingBag className="w-5 h-5" />
                                        {cartCount > 0 && (
                                            <motion.span
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-accent rounded-full"
                                            >
                                                {cartCount > 99 ? "99+" : cartCount}
                                            </motion.span>
                                        )}
                                    </button>
                                    <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />

                                    {/* User Menu */}
                                    {user ? (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="rounded-full hover:bg-accent/10"
                                                >
                                                    <UserIcon className="w-5 h-5 text-muted-foreground" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56 font-body">
                                                <div className="flex items-center gap-2 p-2">
                                                    <div className="flex flex-col space-y-1 leading-none">
                                                        <p className="font-medium">{user.name}</p>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem asChild>
                                                    <Link href="/profile" className="flex items-center cursor-pointer">
                                                        <UserIcon className="mr-2 h-4 w-4" />
                                                        <span>My Profile</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href="/orders" className="flex items-center cursor-pointer">
                                                        <Package className="mr-2 h-4 w-4" />
                                                        <span>My Orders</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href="/wishlist" className="flex items-center cursor-pointer">
                                                        <Heart className="mr-2 h-4 w-4" />
                                                        <span>Wishlist</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                                {(user.role === "seller" || (user as any).rbacRoles?.some((r: string) => ["SELLER_ADMIN", "SELLER_MANAGER"].includes(r))) && (
                                                    <DropdownMenuItem asChild>
                                                        <Link href="/seller/dashboard" className="flex items-center cursor-pointer">
                                                            <Store className="mr-2 h-4 w-4" />
                                                            <span>Seller Dashboard</span>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                )}
                                                {/* Courier Dashboard for DELIVERY_PARTNER role */}
                                                {(user as any).rbacRoles?.includes("DELIVERY_PARTNER") && (
                                                    <DropdownMenuItem asChild>
                                                        <Link href="/courier/dashboard" className="flex items-center cursor-pointer">
                                                            <Package className="mr-2 h-4 w-4" />
                                                            <span>Courier Dashboard</span>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                )}
                                                {/* OPS Dashboard for OPS roles */}
                                                {(user as any).rbacRoles?.some((r: string) => ["OPS_ADMIN", "OPS_MANAGER"].includes(r)) && (
                                                    <DropdownMenuItem asChild>
                                                        <Link href="/ops/dashboard" className="flex items-center cursor-pointer">
                                                            <LayoutDashboard className="mr-2 h-4 w-4" />
                                                            <span>OPS Dashboard</span>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                )}
                                                {/* Support Dashboard for Support roles */}
                                                {(user as any).rbacRoles?.some((r: string) => ["SUPPORT_ADMIN", "SUPPORT_AGENT"].includes(r)) && (
                                                    <DropdownMenuItem asChild>
                                                        <Link href="/support/dashboard" className="flex items-center cursor-pointer">
                                                            <LayoutDashboard className="mr-2 h-4 w-4" />
                                                            <span>Support Dashboard</span>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                )}
                                                {/* Business Dashboard for Business roles */}
                                                {(user as any).rbacRoles?.some((r: string) => ["BUSINESS_ADMIN", "CATEGORY_MANAGER"].includes(r)) && (
                                                    <DropdownMenuItem asChild>
                                                        <Link href="/business/dashboard" className="flex items-center cursor-pointer">
                                                            <LayoutDashboard className="mr-2 h-4 w-4" />
                                                            <span>Business Dashboard</span>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                )}
                                                {/* Admin Dashboard for Super Admin */}
                                                {(user.role === "admin" || (user as any).rbacRoles?.includes("SUPER_ADMIN")) && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem asChild>
                                                            <Link href="/admin" className="flex items-center cursor-pointer">
                                                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                                                <span>Admin Dashboard</span>
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => logoutMutation.mutate()}
                                                    className="text-destructive cursor-pointer"
                                                >
                                                    <LogOut className="mr-2 h-4 w-4" />
                                                    <span>Log out</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    ) : (
                                        <Link href="/auth">
                                            <Button
                                                variant="outline"
                                                className="hidden md:flex border-accent text-accent hover:bg-accent hover:text-white transition-colors"
                                            >
                                                Login
                                            </Button>
                                            <span className="md:hidden p-2 text-muted-foreground">
                                                <UserIcon className="w-5 h-5" />
                                            </span>
                                        </Link>
                                    )}

                                    {/* Mobile Menu Button */}
                                    <button
                                        className="md:hidden p-2 text-muted-foreground"
                                        onClick={() => setIsOpen(!isOpen)}
                                    >
                                        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Nav */}
                        <AnimatePresence>
                            {isOpen && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="md:hidden bg-white dark:bg-background border-b border-border overflow-hidden"
                                >
                                    <div className="px-4 pt-2 pb-6 space-y-1">
                                        {navLinks.map((link) => (
                                            <Link
                                                key={link.href}
                                                href={link.href}
                                                className="block px-3 py-3 text-base font-medium text-muted-foreground hover:text-accent hover:bg-muted/30 rounded-lg transition-colors"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                {link.label}
                                            </Link>
                                        ))}
                                        <div className="pt-4 border-t border-border mt-4">
                                            <Link
                                                href="/wishlist"
                                                className="flex items-center gap-3 px-3 py-3 text-base font-medium text-muted-foreground hover:text-accent hover:bg-muted/30 rounded-lg transition-colors"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                <Heart className="w-5 h-5" />
                                                Wishlist
                                            </Link>
                                            {!user && (
                                                <Link
                                                    href="/auth"
                                                    className="block px-3 py-3 text-base font-medium text-accent hover:bg-muted/30 rounded-lg transition-colors"
                                                    onClick={() => setIsOpen(false)}
                                                >
                                                    Login / Register
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.header>
                )}
            </AnimatePresence>

            {/* Spacer for non-landing pages to prevent content from going under fixed header */}
            {!isLandingPage && <div className="h-20" />}
        </>
    );
}
