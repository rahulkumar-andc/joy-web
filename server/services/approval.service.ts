import { db } from "../db";
import { eq, and, or, desc } from "drizzle-orm";
import {
    approvalRequests,
    InsertApprovalRequest,
    ApprovalRequest,
    userRoles,
    roles,
    rolePermissions,
    permissions,
} from "@shared/rbac-schema";
import { users } from "@shared/schema";
import { auditService } from "./audit.service";
import { authorizationService } from "./authorization.service";

// ============================================================================
// APPROVAL SERVICE - Dual-approval for sensitive actions
// ============================================================================

type ApprovalContext = {
    requesterId: number;
    domain: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    payload: Record<string, unknown>;
    expiresInHours?: number;
};

type ApprovalResult = {
    success: boolean;
    approvalId?: number;
    message?: string;
    requiresApproval?: boolean;
};

class ApprovalService {
    /**
     * Create an approval request for an action requiring dual-approval
     */
    async createRequest(ctx: ApprovalContext): Promise<ApprovalResult> {
        // Calculate expiry (default: 24 hours)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (ctx.expiresInHours || 24));

        try {
            const [request] = await db.insert(approvalRequests).values({
                requesterId: ctx.requesterId,
                action: ctx.action,
                domain: ctx.domain,
                resourceType: ctx.resourceType || null,
                resourceId: ctx.resourceId || null,
                payload: ctx.payload,
                expiresAt,
            }).returning();

            return {
                success: true,
                approvalId: request.id,
                requiresApproval: true,
                message: "Action queued for approval",
            };
        } catch (error) {
            console.error("[ApprovalService] Failed to create request:", error);
            return {
                success: false,
                message: "Failed to create approval request",
            };
        }
    }

    /**
     * Get pending approvals for a user (based on their role permissions)
     */
    async getPendingApprovals(approverId: number): Promise<ApprovalRequest[]> {
        // Get approver's role hierarchy level
        const approverRole = await authorizationService.getPrimaryRole(approverId);
        if (!approverRole) {
            return [];
        }

        // Get role hierarchy level
        const [roleInfo] = await db.select({ hierarchyLevel: roles.hierarchyLevel })
            .from(roles)
            .where(eq(roles.name, approverRole));

        if (!roleInfo) {
            return [];
        }

        // Fetch pending requests from lower hierarchy users
        const pendingRequests = await db
            .select({
                id: approvalRequests.id,
                requesterId: approvalRequests.requesterId,
                action: approvalRequests.action,
                domain: approvalRequests.domain,
                resourceType: approvalRequests.resourceType,
                resourceId: approvalRequests.resourceId,
                payload: approvalRequests.payload,
                status: approvalRequests.status,
                approvedBy: approvalRequests.approvedBy,
                rejectionReason: approvalRequests.rejectionReason,
                expiresAt: approvalRequests.expiresAt,
                createdAt: approvalRequests.createdAt,
                resolvedAt: approvalRequests.resolvedAt,
                requesterName: users.name,
                requesterEmail: users.email,
            })
            .from(approvalRequests)
            .innerJoin(users, eq(approvalRequests.requesterId, users.id))
            .where(
                and(
                    eq(approvalRequests.status, "pending"),
                    or(
                        eq(approvalRequests.expiresAt, null as any),
                        // Only non-expired requests
                    )
                )
            )
            .orderBy(desc(approvalRequests.createdAt))
            .limit(100);

        return pendingRequests as unknown as ApprovalRequest[];
    }

    /**
     * Approve a pending request
     */
    async approveRequest(
        approvalId: number,
        approverId: number
    ): Promise<ApprovalResult> {
        // Verify approval exists and is pending
        const [request] = await db.select()
            .from(approvalRequests)
            .where(eq(approvalRequests.id, approvalId));

        if (!request) {
            return { success: false, message: "Approval request not found" };
        }

        if (request.status !== "pending") {
            return { success: false, message: `Request already ${request.status}` };
        }

        if (request.requesterId === approverId) {
            return { success: false, message: "Cannot approve your own request" };
        }

        // Check if expired
        if (request.expiresAt && new Date() > request.expiresAt) {
            await db.update(approvalRequests)
                .set({ status: "expired" })
                .where(eq(approvalRequests.id, approvalId));
            return { success: false, message: "Request has expired" };
        }

        // Verify approver has permission to approve this type of action
        const canApprove = await this.canApprove(approverId, request.domain, request.action);
        if (!canApprove) {
            return { success: false, message: "You do not have permission to approve this request" };
        }

        // Update request as approved
        await db.update(approvalRequests)
            .set({
                status: "approved",
                approvedBy: approverId,
                resolvedAt: new Date(),
            })
            .where(eq(approvalRequests.id, approvalId));

        return {
            success: true,
            approvalId,
            message: "Request approved",
        };
    }

    /**
     * Reject a pending request
     */
    async rejectRequest(
        approvalId: number,
        approverId: number,
        reason: string
    ): Promise<ApprovalResult> {
        const [request] = await db.select()
            .from(approvalRequests)
            .where(eq(approvalRequests.id, approvalId));

        if (!request) {
            return { success: false, message: "Approval request not found" };
        }

        if (request.status !== "pending") {
            return { success: false, message: `Request already ${request.status}` };
        }

        // Verify approver has permission
        const canApprove = await this.canApprove(approverId, request.domain, request.action);
        if (!canApprove) {
            return { success: false, message: "You do not have permission to reject this request" };
        }

        // Update request as rejected
        await db.update(approvalRequests)
            .set({
                status: "rejected",
                approvedBy: approverId,
                rejectionReason: reason,
                resolvedAt: new Date(),
            })
            .where(eq(approvalRequests.id, approvalId));

        return {
            success: true,
            approvalId,
            message: "Request rejected",
        };
    }

    /**
     * Check if user can approve a specific action type
     */
    private async canApprove(userId: number, domain: string, action: string): Promise<boolean> {
        const result = await authorizationService.checkPermission(userId, domain, "approve");
        return result.allowed;
    }

    /**
     * Get approval request by ID
     */
    async getRequest(approvalId: number): Promise<ApprovalRequest | null> {
        const [request] = await db.select()
            .from(approvalRequests)
            .where(eq(approvalRequests.id, approvalId));
        return request || null;
    }

    /**
     * Execute the approved action (to be called after approval)
     * Returns the payload so the caller can execute the actual action
     */
    async executeApproved(approvalId: number): Promise<{ success: boolean; payload?: any; message?: string }> {
        const [request] = await db.select()
            .from(approvalRequests)
            .where(eq(approvalRequests.id, approvalId));

        if (!request) {
            return { success: false, message: "Approval request not found" };
        }

        if (request.status !== "approved") {
            return { success: false, message: `Request is ${request.status}, not approved` };
        }

        return {
            success: true,
            payload: request.payload,
        };
    }
}

export const approvalService = new ApprovalService();
