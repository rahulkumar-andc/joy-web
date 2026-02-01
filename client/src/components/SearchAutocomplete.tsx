import { useState, useEffect, useRef } from "react";
import { useProducts } from "@/hooks/use-products";
import { useLocation } from "wouter";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type Product } from "@shared/schema";

interface SearchAutocompleteProps {
    onClose?: () => void;
    className?: string;
}

export function SearchAutocomplete({ onClose, className }: SearchAutocompleteProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 300);
    const [location, navigate] = useLocation();
    const inputRef = useRef<HTMLInputElement>(null);

    // Determine if we should search
    const shouldSearch = debouncedQuery.length > 0;

    const { data: products, isLoading } = useProducts({
        search: shouldSearch ? debouncedQuery : undefined,
        // Limit results for autocomplete
        // Note: Our API route currently handles limit, but useProducts hook safety check might need adjustment if it doesn't support 'limit' param explicitly in filters yet, 
        // but the hook spreads filters so it should pass through if we cast it or update hook type.
        // For now, let's just rely on standard search and map top 5 client-side if needed, 
        // or assume backend default limit handles it well enough (default is 12).
    });

    const handleSelect = (productId: number) => {
        navigate(`/product/${productId}`);
        setOpen(false);
        setQuery("");
        onClose?.();
    };

    useEffect(() => {
        if (open && inputRef.current) {
            inputRef.current.focus();
        }
    }, [open]);

    const handleSearchSubmit = (e: React.FormEvent | React.MouseEvent) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
            setOpen(false);
            setQuery("");
            onClose?.();
        }
    };

    // Close dropdown when input is cleared
    useEffect(() => {
        if (query.length === 0) {
            setOpen(false);
        } else {
            setOpen(true);
        }
    }, [query]);

    return (
        <div className={`relative ${className}`}>
            <form onSubmit={handleSearchSubmit} className="relative w-full">
                <Input
                    ref={inputRef}
                    autoFocus
                    placeholder="Search products..."
                    className="w-full pr-10"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                        if (query.length > 0) setOpen(true);
                    }}
                />
                <Button
                    type="submit"
                    size="icon"
                    variant="ghost"
                    className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-primary"
                >
                    <Search className="h-4 w-4" />
                </Button>
            </form>

            {open && query.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-md border border-border shadow-lg z-50 overflow-hidden">
                    {isLoading ? (
                        <div className="p-4 flex justify-center items-center text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Searching...
                        </div>
                    ) : products && products.length > 0 ? (
                        <div className="py-1 max-h-[300px] overflow-y-auto">
                            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Products
                            </div>
                            {products.slice(0, 5).map((product: Product) => (
                                <div
                                    key={product.id}
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-muted cursor-pointer transition-colors"
                                    onClick={() => handleSelect(product.id)}
                                >
                                    <div className="h-8 w-8 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                                        <img
                                            src={product.images[0]}
                                            alt={product.name}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">₹{product.price}</p>
                                    </div>
                                </div>
                            ))}

                            <div
                                className="border-t border-border mt-1 p-2 bg-gray-50 text-center cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={handleSearchSubmit}
                            >
                                <span className="text-xs font-medium text-primary">View all results for "{query}"</span>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No products found.
                        </div>
                    )}

                    {/* Click outside backdrop roughly handled by Navbar logic or just native blur? 
                Actually for a true modal-like overlay we often use a fixed backdrop, 
                but here it's a simple dropdown. 
                We might need a click-away listener, but Navbar usually handles its own state. 
             */}
                </div>
            )}

            {/* Overlay to close on click outside if desired, strictly local */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setOpen(false)}
                    aria-hidden="true"
                />
            )}
        </div>
    );
}
