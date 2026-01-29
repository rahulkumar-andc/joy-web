import { useState, useEffect, useCallback } from "react";
import { useProducts } from "@/hooks/use-products";

const STORAGE_KEY = "recently_viewed";
const MAX_ITEMS = 10;

export function useRecentlyViewed() {
    const [recentIds, setRecentIds] = useState<number[]>([]);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setRecentIds(JSON.parse(stored));
            }
        } catch {
            // Ignore parsing errors
        }
    }, []);

    // Add product to recently viewed
    const addToRecent = useCallback((productId: number) => {
        setRecentIds((prev) => {
            // Remove if already exists, add to front
            const filtered = prev.filter((id) => id !== productId);
            const updated = [productId, ...filtered].slice(0, MAX_ITEMS);

            // Save to localStorage
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch {
                // Ignore storage errors
            }

            return updated;
        });
    }, []);

    // Clear all recently viewed
    const clearRecent = useCallback(() => {
        setRecentIds([]);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // Ignore storage errors
        }
    }, []);

    return {
        recentIds,
        addToRecent,
        clearRecent,
    };
}

// Hook to get recently viewed products with full data
export function useRecentlyViewedProducts() {
    const { recentIds, addToRecent, clearRecent } = useRecentlyViewed();
    const { data: allProducts } = useProducts();

    // Filter products by recent IDs and maintain order
    const products = recentIds
        .map((id) => allProducts?.find((p: any) => p.id === id))
        .filter(Boolean);

    return {
        products,
        recentIds,
        addToRecent,
        clearRecent,
        hasRecent: recentIds.length > 0,
    };
}
