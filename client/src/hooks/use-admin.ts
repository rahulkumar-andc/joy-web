import { useQuery } from "@tanstack/react-query";

interface AdminStats {
    totalRevenue: number;
    totalOrders: number;
    totalUsers: number;
    lowStockCount: number;
}

export function useAdminStats() {
    return useQuery<AdminStats>({
        queryKey: ["admin-stats"],
        queryFn: async () => {
            const res = await fetch("/api/admin/stats");
            if (!res.ok) throw new Error("Failed to fetch admin stats");
            return res.json();
        },
    });
}
