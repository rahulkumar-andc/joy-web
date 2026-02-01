/**
 * Audit Log Analytics Service
 * 
 * Provides analytics and insights on audit logs
 */

import { db } from '../db';
import { auditLogs } from '@shared/schema';
import { eq, gte, lte, and, desc, sql, count } from 'drizzle-orm';
import { logger } from '../logger';

interface AuditAnalytics {
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsByUser: Array<{ userId: number; count: number; user?: string }>;
    actionsByEntity: Record<string, number>;
    timeline: Array<{ date: string; count: number }>;
    topUsers: Array<{ userId: number; actionCount: number }>;
}

interface SuspiciousActivityPattern {
    userId: number;
    pattern: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    count: number;
    details: any;
}

export class AuditLogAnalyticsService {
    /**
     * Get comprehensive analytics for a date range
     */
    async getAnalytics(
        startDate: Date,
        endDate: Date,
        filters?: {
            userId?: number;
            action?: string;
            entityType?: string;
        }
    ): Promise<AuditAnalytics> {
        try {
            const whereConditions = [
                gte(auditLogs.createdAt, startDate),
                lte(auditLogs.createdAt, endDate)
            ];

            if (filters?.userId) {
                whereConditions.push(eq(auditLogs.userId, filters.userId));
            }
            if (filters?.action) {
                whereConditions.push(eq(auditLogs.action, filters.action));
            }
            if (filters?.entityType) {
                whereConditions.push(eq(auditLogs.entityType, filters.entityType));
            }

            // Get all logs in range
            const logs = await db
                .select()
                .from(auditLogs)
                .where(and(...whereConditions))
                .orderBy(desc(auditLogs.createdAt));

            // Calculate analytics
            const totalActions = logs.length;

            // Actions by type
            const actionsByType: Record<string, number> = {};
            logs.forEach(log => {
                actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
            });

            // Actions by user
            const userActionMap: Record<string, number> = {};
            logs.forEach(log => {
                if (log.userId) {
                    const key = log.userId.toString();
                    userActionMap[key] = (userActionMap[key] || 0) + 1;
                }
            });

            const actionsByUser = Object.entries(userActionMap).map(([userId, count]) => ({
                userId: parseInt(userId),
                count
            }));

            // Actions by entity type
            const actionsByEntity: Record<string, number> = {};
            logs.forEach(log => {
                const entityType = log.entityType || 'UNKNOWN';
                actionsByEntity[entityType] = (actionsByEntity[entityType] || 0) + 1;
            });

            // Timeline (daily counts)
            const timeline = this.generateTimeline(logs, startDate, endDate);

            // Top users
            const topUsers = actionsByUser
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)
                .map(u => ({ userId: u.userId, actionCount: u.count }));

            return {
                totalActions,
                actionsByType,
                actionsByUser,
                actionsByEntity,
                timeline,
                topUsers
            };
        } catch (error) {
            logger.error('Failed to get audit analytics', { error });
            throw error;
        }
    }

    /**
     * Detect suspicious activity patterns
     */
    async detectSuspiciousActivity(
        sinceDate: Date
    ): Promise<SuspiciousActivityPattern[]> {
        const patterns: SuspiciousActivityPattern[] = [];

        try {
            const logs = await db
                .select()
                .from(auditLogs)
                .where(gte(auditLogs.createdAt, sinceDate));

            // Pattern 1: Excessive failed login attempts
            const failedLogins = logs.filter(log =>
                log.action === 'LOGIN_FAILURE'
            );

            const failedLoginsByUser: Record<number, number> = {};
            failedLogins.forEach(log => {
                if (log.userId) {
                    failedLoginsByUser[log.userId] = (failedLoginsByUser[log.userId] || 0) + 1;
                }
            });

            Object.entries(failedLoginsByUser).forEach(([userId, count]) => {
                if (count >= 5) {
                    patterns.push({
                        userId: parseInt(userId),
                        pattern: 'EXCESSIVE_FAILED_LOGINS',
                        severity: count >= 10 ? 'critical' : 'high',
                        count,
                        details: { failedAttempts: count }
                    });
                }
            });

            // Pattern 2: Unusual data access patterns
            const dataAccess = logs.filter(log =>
                log.action === 'DATA_ACCESS'
            );

            const accessByUser: Record<number, number> = {};
            dataAccess.forEach(log => {
                if (log.userId) {
                    accessByUser[log.userId] = (accessByUser[log.userId] || 0) + 1;
                }
            });

            Object.entries(accessByUser).forEach(([userId, count]) => {
                if (count >= 100) { // More than 100 data access in period
                    patterns.push({
                        userId: parseInt(userId),
                        pattern: 'EXCESSIVE_DATA_ACCESS',
                        severity: count >= 500 ? 'critical' : 'medium',
                        count,
                        details: { accessCount: count }
                    });
                }
            });

            // Pattern 3: Bulk delete operations
            const bulkDeletes = logs.filter(log =>
                log.action.includes('DELETE') || log.action.includes('BULK')
            );

            const deletesByUser: Record<number, number> = {};
            bulkDeletes.forEach(log => {
                if (log.userId) {
                    deletesByUser[log.userId] = (deletesByUser[log.userId] || 0) + 1;
                }
            });

            Object.entries(deletesByUser).forEach(([userId, count]) => {
                if (count >= 10) {
                    patterns.push({
                        userId: parseInt(userId),
                        pattern: 'BULK_DELETE_OPERATIONS',
                        severity: count >= 50 ? 'critical' : 'medium',
                        count,
                        details: { deleteCount: count }
                    });
                }
            });

            // Pattern 4: Permission escalation attempts
            const permissionChanges = logs.filter(log =>
                log.action === 'PERMISSION_CHANGE' || log.action === 'ROLE_CHANGE'
            );

            const permissionChangesByUser: Record<number, number> = {};
            permissionChanges.forEach(log => {
                if (log.userId) {
                    permissionChangesByUser[log.userId] = (permissionChangesByUser[log.userId] || 0) + 1;
                }
            });

            Object.entries(permissionChangesByUser).forEach(([userId, count]) => {
                if (count >= 5) {
                    patterns.push({
                        userId: parseInt(userId),
                        pattern: 'PERMISSION_ESCALATION_ATTEMPTS',
                        severity: 'high',
                        count,
                        details: { changeCount: count }
                    });
                }
            });

            return patterns;
        } catch (error) {
            logger.error('Failed to detect suspicious activity', { error });
            return [];
        }
    }

    /**
     * Get user activity summary
     */
    async getUserActivity(userId: number, days: number = 30): Promise<{
        totalActions: number;
        recentActions: Array<{
            action: string;
            entityType: string;
            timestamp: Date | null;
        }>;
        actionBreakdown: Record<string, number>;
    }> {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const logs = await db
            .select()
            .from(auditLogs)
            .where(and(
                eq(auditLogs.userId, userId),
                gte(auditLogs.createdAt, since)
            ))
            .orderBy(desc(auditLogs.createdAt))
            .limit(100);

        const actionBreakdown: Record<string, number> = {};
        logs.forEach(log => {
            actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;
        });

        return {
            totalActions: logs.length,
            recentActions: logs.slice(0, 20).map(log => ({
                action: log.action,
                entityType: log.entityType || 'UNKNOWN',
                timestamp: log.createdAt
            })),
            actionBreakdown
        };
    }

    /**
     * Generate timeline data
     */
    private generateTimeline(
        logs: any[],
        startDate: Date,
        endDate: Date
    ): Array<{ date: string; count: number }> {
        const timeline: Record<string, number> = {};

        // Initialize all dates in range
        const current = new Date(startDate);
        while (current <= endDate) {
            const dateKey = current.toISOString().split('T')[0];
            timeline[dateKey] = 0;
            current.setDate(current.getDate() + 1);
        }

        // Count logs by date
        logs.forEach(log => {
            if (log.createdAt) {
                const dateKey = new Date(log.createdAt).toISOString().split('T')[0];
                if (timeline[dateKey] !== undefined) {
                    timeline[dateKey]++;
                }
            }
        });

        return Object.entries(timeline)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * Export audit logs to CSV
     */
    async exportToCSV(startDate: Date, endDate: Date): Promise<string> {
        const logs = await db
            .select()
            .from(auditLogs)
            .where(and(
                gte(auditLogs.createdAt, startDate),
                lte(auditLogs.createdAt, endDate)
            ))
            .orderBy(desc(auditLogs.createdAt));

        const headers = ['ID', 'User ID', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Timestamp'];
        const rows = logs.map(log => [
            log.id,
            log.userId || 'SYSTEM',
            log.action,
            log.entityType,
            log.entityId || '',
            log.ipAddress || '',
            log.createdAt?.toISOString() || ''
        ]);

        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        return csv;
    }
}

export const auditLogAnalyticsService = new AuditLogAnalyticsService();
