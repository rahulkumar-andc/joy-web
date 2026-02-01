/**
 * Data Retention Policy Service
 * 
 * Automatically cleans up old data based on retention policies
 */

import { db } from '../db';
import { auditLogs, session, stockReservations } from '@shared/schema';
import { sql, lt } from 'drizzle-orm';
import { logger } from '../logger';

interface RetentionConfig {
    auditLogDays: number;        // Default: 90 days
    sessionDays: number;          // Default: 30 days
    reservationDays: number;      // Default: 7 days
}

const DEFAULT_RETENTION: RetentionConfig = {
    auditLogDays: 90,
    sessionDays: 30,
    reservationDays: 7
};

export class DataRetentionService {
    private config: RetentionConfig;

    constructor(config: Partial<RetentionConfig> = {}) {
        this.config = { ...DEFAULT_RETENTION, ...config };
    }

    /**
     * Run all retention policies
     */
    async runRetentionPolicies(): Promise<{
        auditLogsDeleted: number;
        sessionsDeleted: number;
        reservationsDeleted: number;
    }> {
        logger.info('Starting data retention policy execution', { config: this.config });

        const auditLogsDeleted = await this.cleanupOldAuditLogs();
        const sessionsDeleted = await this.cleanupExpiredSessions();
        const reservationsDeleted = await this.cleanupOldReservations();

        logger.info('Data retention policy completed', {
            auditLogsDeleted,
            sessionsDeleted,
            reservationsDeleted
        });

        return {
            auditLogsDeleted,
            sessionsDeleted,
            reservationsDeleted
        };
    }

    /**
     * Delete audit logs older than retention period
     */
    async cleanupOldAuditLogs(): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.auditLogDays);

        try {
            const deleted = await db
                .delete(auditLogs)
                .where(lt(auditLogs.createdAt, cutoffDate))
                .returning();

            logger.info('Cleaned up old audit logs', {
                count: deleted.length,
                cutoffDate
            });

            return deleted.length;
        } catch (error) {
            logger.error('Failed to cleanup audit logs', error);
            return 0;
        }
    }

    /**
     * Delete expired sessions
     */
    async cleanupExpiredSessions(): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.sessionDays);

        try {
            const deleted = await db
                .delete(session)
                .where(lt(session.expire, cutoffDate))
                .returning();

            logger.info('Cleaned up expired sessions', {
                count: deleted.length,
                cutoffDate
            });

            return deleted.length;
        } catch (error) {
            logger.error('Failed to cleanup sessions', error);
            return 0;
        }
    }

    /**
     * Delete old stock reservations
     */
    async cleanupOldReservations(): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.reservationDays);

        try {
            const deleted = await db
                .delete(stockReservations)
                .where(lt(stockReservations.expiresAt, cutoffDate))
                .returning();

            logger.info('Cleaned up old stock reservations', {
                count: deleted.length,
                cutoffDate
            });

            return deleted.length;
        } catch (error) {
            logger.error('Failed to cleanup reservations', error);
            return 0;
        }
    }

    /**
     * Get retention statistics
     */
    async getRetentionStats(): Promise<{
        auditLogsCount: number;
        oldAuditLogs: number;
        sessionsCount: number;
        expiredSessions: number;
        reservationsCount: number;
        oldReservations: number;
    }> {
        const auditCutoff = new Date();
        auditCutoff.setDate(auditCutoff.getDate() - this.config.auditLogDays);

        const sessionCutoff = new Date();
        sessionCutoff.setDate(sessionCutoff.getDate() - this.config.sessionDays);

        const reservationCutoff = new Date();
        reservationCutoff.setDate(reservationCutoff.getDate() - this.config.reservationDays);

        const [auditStats] = await db
            .select({
                total: sql<number>`count(*)::int`,
                old: sql<number>`count(case when ${auditLogs.createdAt} < ${auditCutoff} then 1 end)::int`
            })
            .from(auditLogs);

        const [sessionStats] = await db
            .select({
                total: sql<number>`count(*)::int`,
                expired: sql<number>`count(case when ${session.expire} < ${sessionCutoff} then 1 end)::int`
            })
            .from(session);

        const [reservationStats] = await db
            .select({
                total: sql<number>`count(*)::int`,
                old: sql<number>`count(case when ${stockReservations.expiresAt} < ${reservationCutoff} then 1 end)::int`
            })
            .from(stockReservations);

        return {
            auditLogsCount: auditStats?.total || 0,
            oldAuditLogs: auditStats?.old || 0,
            sessionsCount: sessionStats?.total || 0,
            expiredSessions: sessionStats?.expired || 0,
            reservationsCount: reservationStats?.total || 0,
            oldReservations: reservationStats?.old || 0
        };
    }
}

export const dataRetentionService = new DataRetentionService();
