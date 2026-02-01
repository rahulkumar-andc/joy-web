import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useWishlist() {
    return useQuery({
        queryKey: [api.wishlist.get.path],
        queryFn: async () => {
            const res = await fetch(api.wishlist.get.path, { credentials: "include" });
            if (!res.ok) return [];
            return await res.json();
        },
    });
}

import { getCookie } from "@/lib/utils";

export function useAddToWishlist() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (productId: number) => {
            const res = await fetch(api.wishlist.add.path, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
                },
                body: JSON.stringify({ productId }),
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to add to wishlist");
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.wishlist.get.path] });
            toast({
                title: "Added to wishlist",
                description: "Item saved to your wishlist.",
            });
        },
    });
}

export function useRemoveFromWishlist() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (productId: number) => {
            const res = await fetch(`/api/wishlist/${productId}`, {
                method: "DELETE",
                headers: {
                    "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
                },
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to remove from wishlist");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.wishlist.get.path] });
            toast({
                title: "Removed from wishlist",
                description: "Item removed from your wishlist.",
            });
        },
    });
}

export function useIsInWishlist(productId: number) {
    return useQuery({
        queryKey: ["/api/wishlist/check", productId],
        queryFn: async () => {
            const res = await fetch(`/api/wishlist/check/${productId}`, { credentials: "include" });
            if (!res.ok) return { inWishlist: false };
            return await res.json();
        },
        enabled: !!productId,
    });
}
