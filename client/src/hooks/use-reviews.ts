import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useProductReviews(productId: number) {
    return useQuery({
        queryKey: ["/api/products", productId, "reviews"],
        queryFn: async () => {
            const res = await fetch(`/api/products/${productId}/reviews`);
            if (!res.ok) return [];
            return await res.json();
        },
        enabled: !!productId,
    });
}

export function useProductRating(productId: number) {
    return useQuery({
        queryKey: ["/api/products", productId, "rating"],
        queryFn: async () => {
            const res = await fetch(`/api/products/${productId}/rating`);
            if (!res.ok) return { avgRating: 0, totalRatings: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
            const data = await res.json();
            // Handle both old format { rating, count } and new format { avgRating, totalRatings, distribution }
            return {
                avgRating: data.avgRating ?? data.rating ?? 0,
                totalRatings: data.totalRatings ?? data.count ?? 0,
                distribution: data.distribution ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            };
        },
        enabled: !!productId,
    });
}

import { getCookie } from "@/lib/utils";

export function useCreateReview() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ productId, rating, comment }: { productId: number; rating: number; comment?: string }) => {
            const res = await fetch(`/api/products/${productId}/reviews`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
                },
                body: JSON.stringify({ rating, comment }),
                credentials: "include",
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to submit review");
            }
            return await res.json();
        },
        onSuccess: (_, { productId }) => {
            queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "reviews"] });
            queryClient.invalidateQueries({ queryKey: ["/api/products", productId, "rating"] });
            toast({
                title: "Review submitted",
                description: "Thank you for your feedback!",
            });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });
}
