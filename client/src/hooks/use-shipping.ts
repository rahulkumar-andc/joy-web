
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface ShippingCalculation {
    shippingCost: number;
    isFree: boolean;
    reason: string;
    appliedThreshold?: number;
}

export function useShipping(orderTotal: number) {
    return useQuery<ShippingCalculation>({
        queryKey: ["shipping-calculation", orderTotal],
        queryFn: async () => {
            const res = await api.post("/api/shipping/calculate", { orderTotal });
            return res.data;
        },
        // Don't fetch for 0 total to avoid unnecessary calls
        enabled: orderTotal >= 0,
        staleTime: 60000, // 1 minute stale time to reduce flickering
        retry: 2,
    });
}
