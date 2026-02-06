import { motion, AnimatePresence } from "framer-motion";
import { Link, useRoute } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCheckPermission } from "@/hooks/use-rbac";
import { useMemo } from "react";
import {
    LayoutDashboard,
    Users,
    Package,
    ShoppingCart,
    Megaphone,
    CircleDollarSign,
    Settings,
    ShieldAlert,
    ChevronLeft,
    LogOut,
    Store,
    Layers,
    Shield,
    Ticket,
    BarChart3,
    Truck,
    HelpCircle
} from "lucide-react";


interface AdminSidebarProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

interface NavItem {
    title: string;
    href: string;
    icon: React.ElementType;
    requiredPermission?: { domain: string; action: string };
}

const adminNavItems: NavItem[] = [
    {
        title: "Overview",
        href: "/admin",
        icon: LayoutDashboard,
        // No permission required - visible to all admin roles
    },
    {
        title: "Product Moderation",
        href: "/admin/products/moderation",
        icon: ShieldAlert,
        requiredPermission: { domain: "catalog", action: "approve" },
    },
    {
        title: "All Products",
        href: "/admin/products",
        icon: Package,
        requiredPermission: { domain: "catalog", action: "read" },
    },
    {
        title: "Orders",
        href: "/admin/orders",
        icon: ShoppingCart,
        requiredPermission: { domain: "orders", action: "read" },
    },
    {
        title: "Users",
        href: "/admin/users",
        icon: Users,
        requiredPermission: { domain: "users", action: "read" },
    },
    {
        title: "Sellers",
        href: "/admin/sellers",
        icon: Store,
        requiredPermission: { domain: "sellers", action: "read" },
    },
    {
        title: "Deliveries",
        href: "/admin/deliveries",
        icon: Truck,
        requiredPermission: { domain: "delivery", action: "manage" },
    },
    {
        title: "Campaigns",
        href: "/admin/campaigns",
        icon: Megaphone,
        requiredPermission: { domain: "system", action: "manage" },
    },
    {
        title: "Analytics",
        href: "/admin/analytics",
        icon: BarChart3,
        requiredPermission: { domain: "reports", action: "read" },
    },
    {
        title: "Payouts",
        href: "/admin/payouts",
        icon: CircleDollarSign,
        requiredPermission: { domain: "finance", action: "read" },
    },
    {
        title: "Coupons",
        href: "/admin/coupons",
        icon: Ticket,
        requiredPermission: { domain: "catalog", action: "update" },
    },
    {
        title: "Shipping Rules",
        href: "/admin/shipping",
        icon: Layers,
        requiredPermission: { domain: "shipping", action: "read" },
    },
    {
        title: "Access Control",
        href: "/admin/rbac",
        icon: Shield,
        requiredPermission: { domain: "roles", action: "manage" },
    },
    {
        title: "Settings",
        href: "/admin/settings",
        icon: Settings,
        requiredPermission: { domain: "system", action: "manage" },
    },
    {
        title: "Support",
        href: "/admin/support",
        icon: HelpCircle,
        // requiredPermission: { domain: "support", action: "read" }, // Permission check later
    },
];


export function AdminSidebar({ open, setOpen }: AdminSidebarProps) {
    const { checkPermission, isLoading } = useCheckPermission();

    // Filter nav items based on user's permissions
    const visibleNavItems = useMemo(() => {
        return adminNavItems.filter((item) => {
            // If no permission required, show to all
            if (!item.requiredPermission) return true;
            // Check if user has the required permission
            return checkPermission(item.requiredPermission.domain, item.requiredPermission.action);
        });
    }, [checkPermission]);

    return (
        <motion.aside
            initial={false}
            animate={{ width: open ? 260 : 80 }}
            className={cn(
                "fixed left-0 top-0 z-40 h-screen bg-white dark:bg-background border-r border-border hidden lg:flex flex-col",
                "transition-shadow duration-300"
            )}
        >
            {/* Logo Area */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                <AnimatePresence mode="wait">
                    {open && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-3"
                        >
                            <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-100 rounded-lg flex items-center justify-center">
                                <ShieldAlert className="w-5 h-5 text-zinc-100 dark:text-zinc-900" />
                            </div>
                            <span className="font-display font-bold text-lg">Admin Panel</span>
                        </motion.div>
                    )}
                </AnimatePresence>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpen(!open)}
                    className="shrink-0"
                >
                    <ChevronLeft className={cn("w-5 h-5 transition-transform", !open && "rotate-180")} />
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {visibleNavItems.map((item) => (
                    <SidebarItem
                        key={item.href}
                        href={item.href}
                        icon={item.icon}
                        label={item.title}
                        collapsed={!open}
                    />
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-border space-y-1">
                <Link href="/">
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600",
                            !open && "justify-center"
                        )}
                    >
                        <LogOut className="w-5 h-5" />
                        {open && <span>Exit Admin</span>}
                    </Button>
                </Link>
            </div>
        </motion.aside>
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
    // Only exact match for root /admin, otherwise partial match
    const checkActive = () => {
        const path = window.location.pathname;
        if (href === "/admin") return path === "/admin";
        return path.startsWith(href);
    };

    const isActive = checkActive();

    return (
        <Link href={href} onClick={onClick}>
            <motion.div
                whileHover={{ x: collapsed ? 0 : 4 }}
                className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                    isActive
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    collapsed && "justify-center px-2"
                )}
            >
                <Icon className={cn("w-5 h-5 shrink-0", isActive && "text-current")} />
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
