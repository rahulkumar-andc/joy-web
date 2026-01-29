import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useValidateCoupon() {
    return useMutation({
        mutationFn: async ({ code, orderAmount }: { code: string; orderAmount: number }) => {
            const res = await fetch(api.coupons.validate.path, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, orderAmount }),
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to validate coupon");
            return await res.json() as { valid: boolean; discount: number; message?: string };
        },
    });
}
