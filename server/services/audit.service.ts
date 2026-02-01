import { db } from "../db";
import { rbacAuditLogs, InsertRbacAuditLog } from "@shared/rbac-schema";
import { type Request } from "express";
import { randomUUID } from "crypto";


// ============================================================================
// AUDIT SERVICE - Immutable action logging
// ============================================================================

type AuditContext = {
    actorId: number | null;
    actorRole: string | null;
    domain: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    status: "success" | "denied" | "error";
    errorMessage?: string;
    approvalId?: number;
    metadata?: Record<string, unknown>;
};

class AuditService {
    /**
     * Log an action (async, non-blocking)
     */
    async log(ctx: AuditContext): Promise<void> {
        try {
            const logEntry: InsertRbacAuditLog = {
                actorId: ctx.actorId,
                actorRole: ctx.actorRole,
                action: ctx.action,
                domain: ctx.domain,
                resourceType: ctx.resourceType || null,
                resourceId: ctx.resourceId || null,
                oldValue: ctx.oldValue as any,
                newValue: ctx.newValue as any,
                metadata: ctx.metadata as any,
                approvalId: ctx.approvalId || null,
                status: ctx.status,
                errorMessage: ctx.errorMessage || null,
            };

            // Non-blocking insert
            setImmediate(async () => {
                try {
                    await db.insert(rbacAuditLogs).values(logEntry);
                } catch (err) {
                    console.error("[AuditService] Failed to write audit log:", err);
                }
            });
        } catch (err) {
            console.error("[AuditService] Error preparing audit log:", err);
        }
    }

    /**
     * Extract metadata from Express request
     */
    extractRequestMetadata(req: Request): Record<string, unknown> {
        return {
            ip: req.ip || req.socket.remoteAddress,
            userAgent: req.get("user-agent"),
            requestId: req.get("x-request-id") || randomUUID(),
            method: req.method,
            path: req.path,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Log a successful action
     */
    async logSuccess(
        req: Request,
        domain: string,
        action: string,
        options?: {
            resourceType?: string;
            resourceId?: string;
            oldValue?: unknown;
            newValue?: unknown;
            metadata?: Record<string, unknown>;
        }
    ): Promise<void> {
        const user = req.user as { id: number; role?: string } | undefined;

        await this.log({
            actorId: user?.id || null,
            actorRole: user?.role || null,
            domain,
            action,
            resourceType: options?.resourceType,
            resourceId: options?.resourceId,
            oldValue: options?.oldValue,
            newValue: options?.newValue,
            status: "success",
            metadata: {
                ...this.extractRequestMetadata(req),
                ...(options?.metadata || {}),
            },
        });
    }

    /**
     * Log a denied action (permission check failed)
     */
    async logDenied(
        req: Request,
        domain: string,
        action: string,
        reason: string,
        options?: {
            resourceType?: string;
            resourceId?: string;
        }
    ): Promise<void> {
        const user = req.user as { id: number; role?: string } | undefined;

        await this.log({
            actorId: user?.id || null,
            actorRole: user?.role || null,
            domain,
            action,
            resourceType: options?.resourceType,
            resourceId: options?.resourceId,
            status: "denied",
            errorMessage: reason,
            metadata: this.extractRequestMetadata(req),
        });
    }

    /**
     * Log an error during action execution
     */
    async logError(
        req: Request,
        domain: string,
        action: string,
        error: Error,
        options?: {
            resourceType?: string;
            resourceId?: string;
        }
    ): Promise<void> {
        const user = req.user as { id: number; role?: string } | undefined;

        await this.log({
            actorId: user?.id || null,
            actorRole: user?.role || null,
            domain,
            action,
            resourceType: options?.resourceType,
            resourceId: options?.resourceId,
            status: "error",
            errorMessage: error.message,
            metadata: {
                ...this.extractRequestMetadata(req),
                stack: error.stack,
            },
        });
    }
}

export const auditService = new AuditService();
