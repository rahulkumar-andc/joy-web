/**
 * Security Audit Service
 * 
 * Enhanced audit logging for security events (logins, admin access, etc.)
 */

import { AuditService } from './auditService';
import { Request } from 'express';
import { logger } from '../logger';

interface LoginAttempt {
    email: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
}

interface AdminAccessLog {
    userId: number;
    action: string;
    resource: string;
    resourceId?: number;
    ipAddress?: string;
    details?: object;
}

export class SecurityAuditService {
    /**
     * Log login attempt (success or failure)
     */
    static async logLoginAttempt(attempt: LoginAttempt, userId?: number): Promise<void> {
        const action = attempt.success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE';

        await AuditService.logAction(
            userId || null,
            action,
            'AUTH',
            null,
            {
                email: attempt.email,
                ipAddress: attempt.ipAddress,
                userAgent: attempt.userAgent,
                reason: attempt.reason
            }
        );

        logger.info('Login attempt logged', {
            email: attempt.email,
            success: attempt.success,
            ipAddress: attempt.ipAddress
        });
    }

    /**
     * Log admin access to sensitive endpoints
     */
    static async logAdminAccess(log: AdminAccessLog): Promise<void> {
        await AuditService.logAction(
            log.userId,
            `ADMIN_${log.action}`,
            log.resource,
            log.resourceId || null,
            {
                ipAddress: log.ipAddress,
                ...log.details
            }
        );

        logger.info('Admin access logged', log);
    }

    /**
     * Log data access (for sensitive user data)
     */
    static async logDataAccess(
        userId: number,
        accessedUserId: number,
        dataType: string,
        req: Request
    ): Promise<void> {
        await AuditService.logAction(
            userId,
            'DATA_ACCESS',
            dataType,
            accessedUserId,
            {
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }
        );
    }

    /**
     * Log permission changes
     */
    static async logPermissionChange(
        adminId: number,
        targetUserId: number,
        oldRole: string,
        newRole: string,
        req: Request
    ): Promise<void> {
        await AuditService.logAction(
            adminId,
            'PERMISSION_CHANGE',
            'USER',
            targetUserId,
            {
                oldRole,
                newRole,
                ipAddress: req.ip
            }
        );

        logger.warn('User permission changed', {
            adminId,
            targetUserId,
            oldRole,
            newRole
        });
    }

    /**
     * Log logout
     */
    static async logLogout(userId: number, ipAddress?: string): Promise<void> {
        await AuditService.logAction(
            userId,
            'LOGOUT',
            'AUTH',
            null,
            { ipAddress }
        );
    }

    /**
     * Log password change
     */
    static async logPasswordChange(userId: number, forced: boolean = false): Promise<void> {
        await AuditService.logAction(
            userId,
            forced ? 'PASSWORD_RESET_FORCED' : 'PASSWORD_CHANGE',
            'AUTH',
            userId,
            { forced }
        );

        logger.info('Password change logged', { userId, forced });
    }

    /**
     * Log account lockout
     */
    static async logAccountLockout(userId: number, reason: string): Promise<void> {
        await AuditService.logAction(
            userId,
            'ACCOUNT_LOCKOUT',
            'AUTH',
            userId,
            { reason }
        );

        logger.warn('Account locked out', { userId, reason });
    }

    /**
     * Log suspicious activity
     */
    static async logSuspiciousActivity(
        userId: number | null,
        activity: string,
        details: object
    ): Promise<void> {
        await AuditService.logAction(
            userId,
            'SUSPICIOUS_ACTIVITY',
            'SECURITY',
            null,
            { activity, ...details }
        );

        logger.warn('Suspicious activity detected', { userId, activity, details });
    }
}
