import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

import { getCookie } from "@/lib/utils";

export function useCart() {
  return useQuery({
    queryKey: [api.cart.get.path],
    queryFn: async () => {
      const res = await fetch(api.cart.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch cart");
      return api.cart.get.responses[200].parse(await res.json());
    },
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { productId: number; quantity?: number; size?: string; color?: string }) => {
      const res = await fetch(api.cart.add.path, {
        method: api.cart.add.method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add to cart");
      return api.cart.add.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.cart.get.path] });
      toast({
        title: "Added to cart",
        description: "The item has been added to your bag.",
        className: "bg-white border-none shadow-lg",
      });
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quantity }: { id: number; quantity: number }) => {
      const url = buildUrl(api.cart.update.path, { id });
      const res = await fetch(url, {
        method: api.cart.update.method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
        },
        body: JSON.stringify({ quantity }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update cart");
      return api.cart.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.cart.get.path] });
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.cart.remove.path, { id });
      const res = await fetch(url, {
        method: api.cart.remove.method,
        headers: {
          "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove from cart");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.cart.get.path] });
      toast({
        title: "Removed from cart",
        description: "Item has been removed from your bag.",
      });
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { shippingAddress: any; couponCode?: string }) => {
      const res = await fetch(api.orders.create.path, {
        method: api.orders.create.method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create order");
      return api.orders.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.cart.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      toast({
        title: "Order placed!",
        description: "Thank you for shopping with us.",
        variant: "default",
      });
    },
  });
}
