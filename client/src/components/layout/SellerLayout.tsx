import { ReactNode, useState } from "react";
import { Link, useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Wallet,
    BarChart3,
    Settings,
    Store,
    ChevronLeft,
    Menu,
    Bell,
    Sun,
    Moon,
    LogOut,
    HelpCircle,
    RotateCcw,
} from "lucide-react";

interface SellerLayoutProps {
    children: ReactNode;
    title?: string;
    subtitle?: string;
    actions?: ReactNode;
}

const sidebarItems = [
    {
        title: "Dashboard",
        href: "/seller/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Products",
        href: "/seller/products",
        icon: Package,
    },
    {
        title: "Orders",
        href: "/seller/orders",
        icon: ShoppingCart,
    },
    {
        title: "Returns",
        href: "/seller/returns",
        icon: RotateCcw,
    },
    {
        title: "Earnings",
        href: "/seller/wallet",
        icon: BarChart3,
    },
    {
        title: "Payouts",
        href: "/seller/payouts",
        icon: Wallet,
    },
    {
        title: "Shop Settings",
        href: "/seller/profile",
        icon: Store,
    },
];

export function SellerLayout({ children, title, subtitle, actions }: SellerLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { resolvedTheme, setTheme } = useTheme();

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Desktop Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: sidebarOpen ? 260 : 80 }}
                className={cn(
                    "fixed left-0 top-0 z-40 h-screen bg-white dark:bg-background border-r border-border hidden lg:flex flex-col",
                    "transition-shadow duration-300"
                )}
            >
                {/* Logo Area */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                    <AnimatePresence mode="wait">
                        {sidebarOpen && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-3"
                            >
                                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                                    <Store className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-display font-bold text-lg">Seller Hub</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="shrink-0"
                    >
                        <ChevronLeft className={cn("w-5 h-5 transition-transform", !sidebarOpen && "rotate-180")} />
                    </Button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {sidebarItems.map((item) => (
                        <SidebarItem
                            key={item.href}
                            href={item.href}
                            icon={item.icon}
                            label={item.title}
                            collapsed={!sidebarOpen}
                        />
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-border space-y-1">
                    <SidebarItem
                        href="/help-center"
                        icon={HelpCircle}
                        label="Help Center"
                        collapsed={!sidebarOpen}
                    />
                    <Link href="/">
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full justify-start gap-3 text-muted-foreground hover:text-foreground",
                                !sidebarOpen && "justify-center"
                            )}
                        >
                            <LogOut className="w-5 h-5" />
                            {sidebarOpen && <span>Back to Store</span>}
                        </Button>
                    </Link>
                </div>
            </motion.aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-white dark:bg-background border-b border-border flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
                        <Menu className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                            <Store className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-display font-bold">Seller Hub</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                        <Bell className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    >
                        {resolvedTheme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </Button>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed left-0 top-0 z-50 h-screen w-72 bg-white dark:bg-background border-r border-border flex flex-col lg:hidden"
                        >
                            {/* Logo */}
                            <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                                        <Store className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="font-display font-bold text-lg">Seller Hub</span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                                    <ChevronLeft className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Nav */}
                            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                                {sidebarItems.map((item) => (
                                    <SidebarItem
                                        key={item.href}
                                        href={item.href}
                                        icon={item.icon}
                                        label={item.title}
                                        collapsed={false}
                                        onClick={() => setMobileMenuOpen(false)}
                                    />
                                ))}
                            </nav>

                            {/* Footer */}
                            <div className="p-4 border-t border-border space-y-1">
                                <SidebarItem
                                    href="/help-center"
                                    icon={HelpCircle}
                                    label="Help Center"
                                    collapsed={false}
                                    onClick={() => setMobileMenuOpen(false)}
                                />
                                <Link href="/">
                                    <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
                                        <LogOut className="w-5 h-5" />
                                        <span>Back to Store</span>
                                    </Button>
                                </Link>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main
                className={cn(
                    "transition-all duration-300",
                    "lg:ml-[260px] pt-16 lg:pt-0",
                    !sidebarOpen && "lg:ml-[80px]"
                )}
            >
                {/* Top Bar (Desktop) */}
                <header className="hidden lg:flex h-16 items-center justify-between px-6 bg-white dark:bg-background border-b border-border sticky top-0 z-30">
                    <div>
                        {title && <h1 className="font-display text-xl font-bold">{title}</h1>}
                        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                        {actions}
                        <Button variant="ghost" size="icon">
                            <Bell className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                        >
                            {resolvedTheme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </Button>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}

interface SidebarItemProps {
    href: string;
    icon: React.ElementType;
    label: string;
    collapsed?: boolean;
    onClick?: () => void;
}

function SidebarItem({ href, icon: Icon, label, collapsed, onClick }: SidebarItemProps) {
    const [isActive] = useRoute(href + "*");

    return (
        <Link href={href} onClick={onClick}>
            <motion.div
                whileHover={{ x: collapsed ? 0 : 4 }}
                className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                    isActive
                        ? "bg-accent/10 text-accent"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    collapsed && "justify-center px-2"
                )}
            >
                <Icon className={cn("w-5 h-5 shrink-0", isActive && "text-accent")} />
                <AnimatePresence mode="wait">
                    {!collapsed && (
                        <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            className="whitespace-nowrap overflow-hidden"
                        >
                            {label}
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.div>
        </Link>
    );
}

export default SellerLayout;
