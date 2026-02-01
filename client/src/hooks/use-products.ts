import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertProduct, type Product } from "@shared/schema";
import { z } from "zod";
import { getCookie } from "@/lib/utils";

// List Products (Legacy/Simple)
export function useProducts(filters?: { category?: string; search?: string; sort?: string }) {
  // Filter out undefined values to prevent sending "undefined" as string
  const cleanFilters = filters ? Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  ) : {};
  const queryString = Object.keys(cleanFilters).length > 0
    ? `?${new URLSearchParams(cleanFilters as Record<string, string>).toString()}`
    : "";

  return useQuery({
    queryKey: [api.products.list.path, filters],
    queryFn: async () => {
      const res = await fetch(api.products.list.path + queryString, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      // New API returns { products, total }, but this hook initially returned Product[]
      // We'll return just products to maintain compatibility for now
      const data = (await res.json()) as { products: Product[]; total: number };
      return data.products;
    },
  });
}

// Infinite Scroll Products
export function useInfiniteProducts(filters?: { category?: string; search?: string; sort?: string }) {
  const cleanFilters = filters ? Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  ) : {};

  return useInfiniteQuery({
    queryKey: [api.products.list.path, "infinite", filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        ...(cleanFilters as Record<string, string>),
        page: pageParam.toString(),
        limit: "12" // Load 12 products per page
      });

      const res = await fetch(`${api.products.list.path}?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      return await res.json();
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedProducts = allPages.flatMap(p => p.products).length;
      if (loadedProducts < lastPage.total) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1
  });
}

// Get Single Product
export function useProduct(id: number) {
  return useQuery({
    queryKey: [api.products.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.products.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch product");
      return api.products.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// Get Categories
export function useCategories() {
  return useQuery({
    queryKey: [api.categories.list.path],
    queryFn: async () => {
      const res = await fetch(api.categories.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch categories");
      return api.categories.list.responses[200].parse(await res.json());
    },
  });
}

// Get Homepage Data
export function useHomepage() {
  return useQuery({
    queryKey: [api.homepage.get.path],
    queryFn: async () => {
      const res = await fetch(api.homepage.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch homepage data");
      return api.homepage.get.responses[200].parse(await res.json());
    },
  });
}

// Create Product (Admin)
export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertProduct) => {
      const validated = api.products.create.input.parse(data);
      const res = await fetch(api.products.create.path, {
        method: api.products.create.method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
        },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.products.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create product");
      }
      return api.products.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    },
  });
}

// Delete Product (Admin)
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.products.delete.path, { id });
      const res = await fetch(url, {
        method: api.products.delete.method,
        headers: {
          "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete product");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    },
  });
}

// Update Product (Admin)
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertProduct> }) => {
      const url = buildUrl(api.products.update.path, { id });
      const res = await fetch(url, {
        method: api.products.update.method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update product");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    },
  });
}
