import { db } from "../db";
import { auditLogs, type InsertAuditLog } from "@shared/schema";

export class AuditService {
    static async logAction(
        userId: number | null,
        action: string,
        entityType: string,
        entityId: string | number | null,
        details?: Record<string, any>,
        ipAddress?: string
    ) {
        try {
            const auditData: InsertAuditLog = {
                userId,
                action,
                entityType,
                entityId: entityId?.toString() || null,
                details: details as any,
                ipAddress
            };

            await db.insert(auditLogs).values(auditData);
            console.log(`[AUDIT] User ${userId} performed ${action} on ${entityType} #${entityId}`);
        } catch (error) {
            console.error("[AUDIT ERROR] Failed to log action:", error);
            // Don't throw, we don't want to break the main flow if logging fails
        }
    }
}
