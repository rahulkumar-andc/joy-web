import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
export interface Role {
    id: number;
    name: string;
    displayName: string;
    description: string | null;
    hierarchyLevel: number;
    scopeType: string;
    isSystemRole: boolean;
    isActive: boolean;
}

export interface Permission {
    id: number;
    domain: string;
    action: string;
    resource: string | null;
    description: string | null;
}

export interface UserRole {
    assignmentId: number;
    roleId: number;
    roleName: string;
    displayName: string;
    scopeType: string;
    scopeValue: string | null;
    grantedAt: string;
    expiresAt: string | null;
    isActive: boolean;
}

export interface ApprovalRequest {
    id: number;
    requesterId: number;
    action: string;
    domain: string;
    resourceType: string | null;
    resourceId: string | null;
    payload: any;
    status: string;
    createdAt: string;
    requesterName?: string;
    requesterEmail?: string;
}

export interface MyPermissions {
    roles: string[];
    permissions: string[];
    scopes: { type: string; value: string | null }[];
}

export interface Elevation {
    id: number;
    roleId: number;
    roleName: string;
    displayName: string;
    scopeType: string;
    scopeValue: string | null;
    grantedAt: string;
    expiresAt: string;
}

// Helper to get cookie by name (for CSRF token)
function getCookie(name: string): string | undefined {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return undefined;
}

// API helpers
async function fetchWithAuth(url: string, options?: RequestInit) {
    const res = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": getCookie("CSRF-TOKEN") || "",
            ...options?.headers,
        },
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || "Request failed");
    }
    return res.json();
}


// Hooks
export function useRoles() {
    return useQuery<{ roles: Role[] }>({
        queryKey: ["rbac-roles"],
        queryFn: () => fetchWithAuth("/api/admin/rbac/roles"),
    });
}

export function usePermissions() {
    return useQuery<{ permissions: Record<string, Permission[]> }>({
        queryKey: ["rbac-permissions"],
        queryFn: () => fetchWithAuth("/api/admin/rbac/permissions"),
    });
}

export function useUserRoles(userId: number) {
    return useQuery<{ roles: UserRole[] }>({
        queryKey: ["rbac-user-roles", userId],
        queryFn: () => fetchWithAuth(`/api/admin/rbac/users/${userId}/roles`),
        enabled: !!userId,
    });
}

export function useMyPermissions() {
    return useQuery<MyPermissions>({
        queryKey: ["rbac-my-permissions"],
        queryFn: () => fetchWithAuth("/api/admin/rbac/me/permissions"),
    });
}

export function usePendingApprovals() {
    return useQuery<{ approvals: ApprovalRequest[] }>({
        queryKey: ["rbac-approvals"],
        queryFn: () => fetchWithAuth("/api/admin/rbac/approvals"),
    });
}

export function useUserElevations(userId: number) {
    return useQuery<{ elevations: Elevation[] }>({
        queryKey: ["rbac-elevations", userId],
        queryFn: () => fetchWithAuth(`/api/admin/rbac/users/${userId}/elevations`),
        enabled: !!userId,
    });
}

// Mutations
export function useAssignRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, roleId, scopeType, scopeValue, expiresAt }: {
            userId: number;
            roleId: number;
            scopeType?: string;
            scopeValue?: string;
            expiresAt?: string;
        }) => {
            return fetchWithAuth(`/api/admin/rbac/users/${userId}/roles`, {
                method: "POST",
                body: JSON.stringify({ roleId, scopeType, scopeValue, expiresAt }),
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["rbac-user-roles", variables.userId] });
        },
    });
}

export function useRevokeRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, roleId }: { userId: number; roleId: number }) => {
            return fetchWithAuth(`/api/admin/rbac/users/${userId}/roles/${roleId}`, {
                method: "DELETE",
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["rbac-user-roles", variables.userId] });
        },
    });
}

export function useApproveRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (approvalId: number) => {
            return fetchWithAuth(`/api/admin/rbac/approvals/${approvalId}/approve`, {
                method: "POST",
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rbac-approvals"] });
        },
    });
}

export function useRejectRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ approvalId, reason }: { approvalId: number; reason: string }) => {
            return fetchWithAuth(`/api/admin/rbac/approvals/${approvalId}/reject`, {
                method: "POST",
                body: JSON.stringify({ reason }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rbac-approvals"] });
        },
    });
}

export function useRequestElevation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            userId: number;
            roleId: number;
            reason: string;
            durationHours: number;
            scopeType?: string;
            scopeValue?: string;
        }) => {
            return fetchWithAuth("/api/admin/rbac/elevations", {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["rbac-elevations", variables.userId] });
            queryClient.invalidateQueries({ queryKey: ["rbac-approvals"] });
        },
    });
}

export function useRevokeElevation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ elevationId, reason }: { elevationId: number; reason?: string }) => {
            return fetchWithAuth(`/api/admin/rbac/elevations/${elevationId}`, {
                method: "DELETE",
                body: JSON.stringify({ reason }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rbac-elevations"] });
        },
    });
}

// Audit Logs Types
export interface AuditLog {
    id: number;
    actorId: number | null;
    actorRole: string | null;
    action: string;
    domain: string;
    resourceType: string | null;
    resourceId: string | null;
    status: "success" | "denied" | "error";
    errorMessage: string | null;
    metadata: any;
    createdAt: string;
}

export interface AuditLogsResponse {
    logs: AuditLog[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface AuditStats {
    statusCounts: Record<string, number>;
    domainCounts: Record<string, number>;
    recentDenied: AuditLog[];
}

export interface RBACStats {
    roles: number;
    permissions: number;
    activeAssignments: number;
    pendingApprovals: number;
    activeElevations: number;
}

export interface SearchUser {
    id: number;
    email: string;
    name: string;
    role: string;
    isVerified: boolean;
    createdAt: string;
}

// Audit Logs Hook
export function useAuditLogs(params: {
    domain?: string;
    action?: string;
    status?: string;
    userId?: number;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}) {
    const queryParams = new URLSearchParams();
    if (params.domain) queryParams.set("domain", params.domain);
    if (params.action) queryParams.set("action", params.action);
    if (params.status) queryParams.set("status", params.status);
    if (params.userId) queryParams.set("userId", String(params.userId));
    if (params.startDate) queryParams.set("startDate", params.startDate);
    if (params.endDate) queryParams.set("endDate", params.endDate);
    if (params.page) queryParams.set("page", String(params.page));
    if (params.limit) queryParams.set("limit", String(params.limit));

    return useQuery<AuditLogsResponse>({
        queryKey: ["rbac-audit-logs", params],
        queryFn: () => fetchWithAuth(`/api/admin/rbac/audit-logs?${queryParams.toString()}`),
    });
}

// Audit Stats Hook
export function useAuditStats() {
    return useQuery<AuditStats>({
        queryKey: ["rbac-audit-stats"],
        queryFn: () => fetchWithAuth("/api/admin/rbac/audit-logs/stats"),
    });
}

// RBAC Stats Hook
export function useRBACStats() {
    return useQuery<RBACStats>({
        queryKey: ["rbac-stats"],
        queryFn: () => fetchWithAuth("/api/admin/rbac/stats"),
    });
}

// User Search Hook
export function useUserSearch(query: string) {
    return useQuery<{ users: SearchUser[] }>({
        queryKey: ["rbac-user-search", query],
        queryFn: () => fetchWithAuth(`/api/admin/rbac/users/search?q=${encodeURIComponent(query)}`),
        enabled: query.length >= 2,
    });
}


export interface RolePermissionDetails {
    permissionId: number;
    domain: string;
    action: string;
    resource: string | null;
    description: string | null;
    constraintValue: string | null;
    requiresApproval: boolean;
}

export function useRolePermissions(roleId: number) {
    return useQuery<{ permissions: RolePermissionDetails[] }>({
        queryKey: ["rbac-role-permissions", roleId],
        queryFn: () => fetchWithAuth(`/api/admin/rbac/roles/${roleId}/permissions`),
        enabled: !!roleId,
    });
}

// Role Mutations
export function useCreateRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Partial<Role>) => {
            return fetchWithAuth("/api/admin/rbac/roles", {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rbac-roles"] });
            queryClient.invalidateQueries({ queryKey: ["rbac-stats"] });
        },
    });
}

export function useUpdateRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<Role> & { id: number }) => {
            return fetchWithAuth(`/api/admin/rbac/roles/${id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rbac-roles"] });
        },
    });
}

export function useDeleteRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            return fetchWithAuth(`/api/admin/rbac/roles/${id}`, {
                method: "DELETE",
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rbac-roles"] });
            queryClient.invalidateQueries({ queryKey: ["rbac-stats"] });
        },
    });
}

export function useCloneRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (roleId: number) => {
            return fetchWithAuth(`/api/admin/rbac/roles/${roleId}/clone`, {
                method: "POST",
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rbac-roles"] });
            queryClient.invalidateQueries({ queryKey: ["rbac-stats"] });
        },
    });
}

export function useBulkAssignRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ roleId, userIds }: { roleId: number; userIds: number[] }) => {
            return fetchWithAuth(`/api/admin/rbac/roles/${roleId}/assignments`, {
                method: "POST",
                body: JSON.stringify({ userIds }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rbac-roles"] });
            queryClient.invalidateQueries({ queryKey: ["rbac-stats"] });
            queryClient.invalidateQueries({ queryKey: ["rbac-user-roles"] });
        },
    });
}

export function useApplyTemplate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ roleId, templateId }: { roleId: number; templateId: string }) => {
            return fetchWithAuth(`/api/admin/rbac/roles/${roleId}/templates`, {
                method: "POST",
                body: JSON.stringify({ templateId }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rbac-role-permissions"] });
            queryClient.invalidateQueries({ queryKey: ["rbac-stats"] });
        },
    });
}

// Permission Editor Mutations
export function useCreatePermission() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Omit<Permission, "id">) => {
            return fetchWithAuth("/api/admin/rbac/permissions", {
                method: "POST",
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rbac-permissions"] });
            queryClient.invalidateQueries({ queryKey: ["rbac-stats"] });
        },
    });
}

export function useUpdatePermission() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: Permission) => {
            return fetchWithAuth(`/api/admin/rbac/permissions/${id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rbac-permissions"] });
        },
    });
}

export function useDeletePermission() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            return fetchWithAuth(`/api/admin/rbac/permissions/${id}`, {
                method: "DELETE",
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rbac-permissions"] });
            queryClient.invalidateQueries({ queryKey: ["rbac-stats"] });
        },
    });
}

export function useAssignRolePermission() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ roleId, permissionId, requiresApproval, approvalRoleId, constraintValue }: {
            roleId: number;
            permissionId: number;
            requiresApproval?: boolean;
            approvalRoleId?: number;
            constraintValue?: string;
        }) => {
            return fetchWithAuth(`/api/admin/rbac/roles/${roleId}/permissions`, {
                method: "POST",
                body: JSON.stringify({ permissionId, requiresApproval, approvalRoleId, constraintValue }),
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["rbac-role-permissions", variables.roleId] });
            queryClient.invalidateQueries({ queryKey: ["rbac-stats"] });
        },
    });
}

export function useRemoveRolePermission() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ roleId, permissionId }: { roleId: number; permissionId: number }) => {
            return fetchWithAuth(`/api/admin/rbac/roles/${roleId}/permissions/${permissionId}`, {
                method: "DELETE",
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["rbac-role-permissions", variables.roleId] });
            queryClient.invalidateQueries({ queryKey: ["rbac-stats"] });
        },
    });
}

export function useUpdateRoleHierarchy() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (roleIds: number[]) => {
            return fetchWithAuth("/api/admin/rbac/roles/hierarchy", {
                method: "PUT",
                body: JSON.stringify({ roleIds }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rbac-roles"] });
        },
    });
}
