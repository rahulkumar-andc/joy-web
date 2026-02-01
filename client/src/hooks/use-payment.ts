import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { getCookie } from "@/lib/utils";

interface CreatePaymentOrderParams {
    orderId: number;
}

interface VerifyPaymentParams {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}

export const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        if (document.getElementById("razorpay-script")) {
            resolve(true);
            return;
        }
        const script = document.createElement("script");
        script.id = "razorpay-script";
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export function usePayment() {
    const { toast } = useToast();


    const createPaymentOrderMutation = useMutation({
        mutationFn: async (data: CreatePaymentOrderParams) => {
            const res = await fetch("/api/payments/create-order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
                },
                body: JSON.stringify(data),
                credentials: "include",
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to create payment order");
            }
            return await res.json();
        },
        onError: (error: Error) => {
            toast({
                title: "Payment Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const verifyPaymentMutation = useMutation({
        mutationFn: async (data: VerifyPaymentParams) => {
            const res = await fetch("/api/payments/verify", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
                },
                body: JSON.stringify(data),
                credentials: "include",
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Payment verification failed");
            }
            return await res.json();
        },
        onError: (error: Error) => {
            toast({
                title: "Verification Failed",
                description: "Could not verify payment signature. Please contact support.",
                variant: "destructive",
            });
        },
    });

    return {
        createPaymentOrder: createPaymentOrderMutation.mutateAsync,
        verifyPayment: verifyPaymentMutation.mutateAsync,
        isCreatingOrder: createPaymentOrderMutation.isPending,
        isVerifying: verifyPaymentMutation.isPending,
    };
}
