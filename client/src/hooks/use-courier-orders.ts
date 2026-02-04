import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface CourierOrder {
    id: number;
    userId: number;
    totalAmount: string;
    status: string;
    deliveryStatus: string | null;
    shippingAddress: {
        fullName: string;
        addressLine1: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
        phone?: string;
    };
    codAmount: string | null;
    codCollected: boolean | null;
    isSuspiciousDelivery: boolean | null;
    createdAt: string;
    estimatedDeliveryDate: string | null;
    customerName?: string;
    customerPhone?: string;
}

interface CourierOrdersResponse {
    success: boolean;
    orders: CourierOrder[];
    count: number;
}

interface DeliveryResult {
    success: boolean;
    message: string;
    validation?: {
        isValid: boolean;
        isSuspicious: boolean;
        distance: number | null;
        reason: string;
    };
}

// Fetch courier's assigned orders
export function useCourierOrders() {
    return useQuery<CourierOrdersResponse>({
        queryKey: ["courier-orders"],
        queryFn: async () => {
            const res = await fetch("/api/courier/orders", {
                credentials: "include",
            });
            if (!res.ok) {
                throw new Error("Failed to fetch orders");
            }
            return res.json();
        },
        refetchInterval: 30000, // Refresh every 30 seconds
    });
}

// Get single order details
export function useCourierOrder(orderId: number) {
    return useQuery<{ success: boolean; order: CourierOrder }>({
        queryKey: ["courier-order", orderId],
        queryFn: async () => {
            const res = await fetch(`/api/courier/orders/${orderId}`, {
                credentials: "include",
            });
            if (!res.ok) {
                throw new Error("Failed to fetch order");
            }
            return res.json();
        },
        enabled: !!orderId,
    });
}

// Mark order as picked up
export function usePickupOrder() {
    const queryClient = useQueryClient();

    return useMutation<DeliveryResult, Error, number>({
        mutationFn: async (orderId: number) => {
            const csrfToken = document.cookie
                .split("; ")
                .find((row) => row.startsWith("CSRF-TOKEN="))
                ?.split("=")[1];

            const res = await fetch(`/api/orders/${orderId}/pickup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrfToken || "",
                },
                credentials: "include",
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to mark as picked up");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["courier-orders"] });
        },
    });
}

// Mark order as in transit
export function useInTransitOrder() {
    const queryClient = useQueryClient();

    return useMutation<DeliveryResult, Error, number>({
        mutationFn: async (orderId: number) => {
            const csrfToken = document.cookie
                .split("; ")
                .find((row) => row.startsWith("CSRF-TOKEN="))
                ?.split("=")[1];

            const res = await fetch(`/api/orders/${orderId}/in-transit`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrfToken || "",
                },
                credentials: "include",
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to mark as in transit");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["courier-orders"] });
        },
    });
}

// Complete delivery with POD
export function useDeliverOrder() {
    const queryClient = useQueryClient();

    return useMutation<
        DeliveryResult,
        Error,
        { orderId: number; podImage: File; location?: GeolocationCoordinates }
    >({
        mutationFn: async ({ orderId, podImage, location }) => {
            const csrfToken = document.cookie
                .split("; ")
                .find((row) => row.startsWith("CSRF-TOKEN="))
                ?.split("=")[1];

            const formData = new FormData();
            formData.append("podImage", podImage);
            if (location) {
                formData.append(
                    "podLocation",
                    JSON.stringify({
                        lat: location.latitude,
                        lng: location.longitude,
                    })
                );
            }

            const res = await fetch(`/api/orders/${orderId}/deliver`, {
                method: "POST",
                headers: {
                    "X-CSRF-Token": csrfToken || "",
                },
                credentials: "include",
                body: formData,
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to complete delivery");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["courier-orders"] });
        },
    });
}

export type { CourierOrder, CourierOrdersResponse, DeliveryResult };
