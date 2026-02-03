import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldAlert, ChevronLeft, LogOut, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
    children: ReactNode;
    title?: string;
    subtitle?: string;
    actions?: ReactNode;
}

export function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background/50">
            {/* Desktop Sidebar */}
            <AdminSidebar open={sidebarOpen} setOpen={setSidebarOpen} />

            {/* Mobile Menu Overlay & Drawer is generic enough to arguably be reusable, 
                but for simplicity embedding it here similar to SellerLayout 
                to avoid complex prop drilling for MobileNav components 
            */}
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
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed left-0 top-0 z-50 h-screen w-72 bg-white dark:bg-background border-r border-border flex flex-col lg:hidden"
                        >
                            {/* Logo */}
                            <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                                        <ShieldAlert className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="font-display font-bold text-lg">Admin Panel</span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                                    <ChevronLeft className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Re-use sidebar content logic or simple duplication for independence */}
                            <div className="p-4">
                                <p className="text-sm text-muted-foreground">Mobile navigation...</p>
                                {/* In a real DRY scenario we'd extract the nav items list to a config file */}
                            </div>

                            <div className="mt-auto p-4 border-t border-border">
                                <Link href="/">
                                    <Button variant="ghost" className="w-full justify-start gap-3">
                                        <LogOut className="w-5 h-5" />
                                        Back to Store
                                    </Button>
                                </Link>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main
                className={cn(
                    "transition-all duration-300",
                    "lg:ml-[260px]", // Default open width
                    !sidebarOpen && "lg:ml-[80px]" // Collapsed width
                )}
            >
                <AdminHeader
                    title={title}
                    subtitle={subtitle}
                    actions={actions}
                    onMenuClick={() => setMobileMenuOpen(true)}
                />

                <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
