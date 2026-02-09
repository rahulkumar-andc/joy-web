import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useUsers(filters?: { role?: string; search?: string; page?: number; limit?: number }) {
    return useQuery({
        queryKey: ["users", filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters?.role) params.append("role", filters.role);
            if (filters?.search) params.append("search", filters.search);
            if (filters?.page) params.append("page", String(filters.page));
            if (filters?.limit) params.append("limit", String(filters.limit));

            const res = await apiRequest("GET", `/api/admin/users?${params.toString()}`);
            return res.json();
        },
        enabled: !!filters // Only run if filters provided (optional, but good for mentions)
    });
}
