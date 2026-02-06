import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types matching backend schema
export interface Ticket {
    id: number;
    ticketId: string;
    userId: number;
    orderId?: number;
    productId?: number;
    issueType: string;
    subject: string;
    description: string;
    status: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "WAITING_FOR_CUSTOMER" | "ESCALATED" | "RESOLVED" | "CLOSED";
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    assignedTo?: number;
    assignedTeam: string;
    slaDeadline?: string;
    slaBreached: boolean;
    createdAt: string;
    updatedAt: string;
    user?: { name: string; email: string };
    order?: { publicOrderId: string };
    assignedAgent?: { name: string };
}

export interface TicketMessage {
    id: number;
    ticketId: number;
    senderType: "user" | "agent" | "admin" | "system";
    senderId?: number;
    message: string;
    attachments?: string[];
    isInternal: boolean;
    createdAt: string;
    sender?: { name: string };
}

// === USER HOOKS ===

export function useMyTickets() {
    return useQuery<Ticket[]>({
        queryKey: ["my-tickets"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/support/tickets");
            return res.json().then((d) => d.data);
        },
    });
}

export function useTicketDetails(id: number) {
    return useQuery<Ticket & { messages: TicketMessage[] }>({
        queryKey: ["ticket", id],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/support/tickets/${id}`);
            return res.json().then((d) => d.data);
        },
        enabled: !!id,
        refetchInterval: 5000, // Poll for new messages every 5s
    });
}

export function useCreateTicket() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/support/tickets", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
            toast({ title: "Ticket Created", description: "Support team will respond shortly." });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}

export function useReplyTicket() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: any }) => {
            const res = await apiRequest("POST", `/api/support/tickets/${id}/reply`, data);
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["ticket", variables.id] });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}

// === ADMIN HOOKS ===

export function useAdminTickets(filters?: any) {
    return useQuery<{ tickets: Ticket[]; total: number }>({
        queryKey: ["admin-tickets", filters],
        queryFn: async () => {
            const queryParams = new URLSearchParams(filters).toString();
            const res = await apiRequest("GET", `/api/admin/support/tickets?${queryParams}`);
            return res.json(); // returns { success: true, tickets: [], total: 0 }
        },
    });
}

export function useAdminTicketAudit(id: number) {
    return useQuery<any[]>({
        queryKey: ["ticket-audit", id],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/admin/support/tickets/${id}/audit`);
            return res.json().then(d => d.data);
        },
        enabled: !!id
    });
}

export function useUpdateTicketStatus() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, status }: { id: number; status: string }) => {
            const res = await apiRequest("PATCH", `/api/admin/support/tickets/${id}/status`, { status });
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["ticket", variables.id] });
            queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
            toast({ title: "Status Updated" });
        },
    });
}

export function useAssignTicket() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, agentId }: { id: number; agentId: number }) => {
            const res = await apiRequest("PATCH", `/api/admin/support/tickets/${id}/assign`, { agentId });
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["ticket", variables.id] });
            queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
            toast({ title: "Ticket Assigned" });
        },
    });
}

export function useEscalateTicket() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
            const res = await apiRequest("POST", `/api/admin/support/tickets/${id}/escalate`, { reason });
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["ticket", variables.id] });
            queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
            toast({ title: "Ticket Escalated", variant: "destructive" });
        },
    });
}
