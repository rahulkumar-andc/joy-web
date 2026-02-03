import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { Bell, Moon, Sun, Search, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";

interface AdminHeaderProps {
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
    onMenuClick: () => void;
}

export function AdminHeader({ title, subtitle, actions, onMenuClick }: AdminHeaderProps) {
    const { resolvedTheme, setTheme } = useTheme();

    return (
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-background border-b border-border sticky top-0 z-30">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
                    <Menu className="w-5 h-5" />
                </Button>
                <div>
                    {title && <h1 className="font-display text-xl font-bold">{title}</h1>}
                    {subtitle && <p className="text-sm text-muted-foreground hidden md:block">{subtitle}</p>}
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Global Search - Optional */}
                <div className="hidden md:flex relative w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search..."
                        className="pl-9 h-9 bg-muted/50 border-none focus-visible:ring-1"
                    />
                </div>

                <div className="flex items-center gap-2">
                    {actions}
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-background"></span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    >
                        {resolvedTheme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </Button>
                </div>
            </div>
        </header>
    );
}
