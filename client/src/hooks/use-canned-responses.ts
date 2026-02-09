import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CannedResponse, InsertCannedResponse } from "@shared/schema";

export function useCannedResponses() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: responses, isLoading } = useQuery<CannedResponse[]>({
        queryKey: ["canned-responses"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/admin/canned-responses");
            return res.json();
        },
    });

    const createResponse = useMutation({
        mutationFn: async (data: InsertCannedResponse) => {
            const res = await apiRequest("POST", "/api/admin/canned-responses", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["canned-responses"] });
            toast({
                title: "Success",
                description: "Canned response created successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const deleteResponse = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/admin/canned-responses/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["canned-responses"] });
            toast({
                title: "Success",
                description: "Canned response deleted",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    return {
        responses: responses || [],
        isLoading,
        createResponse,
        deleteResponse,
    };
}
