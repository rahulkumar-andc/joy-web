import { Router, Request, Response } from 'express';
import { auditLogAnalyticsService } from '../services/auditLogAnalyticsService';
import { suspiciousActivityAlertService } from '../services/suspiciousActivityAlertService';
import { auditLogDashboardService } from '../services/auditLogDashboardService';
import { restrictTo } from '../middleware/rbac';
import { catchAsync } from '../utils/catchAsync';

export const auditAnalyticsRouter = Router();

/**
 * GET /api/audit/analytics
 * Get audit log analytics for a date range
 */
auditAnalyticsRouter.get(
    '/api/audit/analytics',
    restrictTo('admin', 'manager'),
    catchAsync(async (req: Request, res: Response) => {
        const { startDate, endDate, userId, action, entityType } = req.query;

        const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate as string) : new Date();

        const analytics = await auditLogAnalyticsService.getAnalytics(start, end, {
            userId: userId ? parseInt(userId as string) : undefined,
            action: action as string | undefined,
            entityType: entityType as string | undefined
        });

        res.json({
            success: true,
            data: analytics,
            period: {
                start: start.toISOString(),
                end: end.toISOString()
            }
        });
    })
);

/**
 * GET /api/audit/suspicious-activity
 * Detect suspicious activity patterns
 */
auditAnalyticsRouter.get(
    '/api/audit/suspicious-activity',
    restrictTo('admin'),
    catchAsync(async (req: Request, res: Response) => {
        const { hours = '24' } = req.query;

        const since = new Date();
        since.setHours(since.getHours() - parseInt(hours as string));

        const patterns = await auditLogAnalyticsService.detectSuspiciousActivity(since);

        res.json({
            success: true,
            data: patterns,
            since: since.toISOString(),
            count: patterns.length
        });
    })
);

/**
 * POST /api/audit/monitor
 * Trigger manual suspicious activity scan and alert
 */
auditAnalyticsRouter.post(
    '/api/audit/monitor',
    restrictTo('admin'),
    catchAsync(async (req: Request, res: Response) => {
        await suspiciousActivityAlertService.monitorAndAlert();

        res.json({
            success: true,
            message: 'Monitoring task initiated'
        });
    })
);

/**
 * GET /api/audit/user/:userId
 * Get user activity summary
 */
auditAnalyticsRouter.get(
    '/api/audit/user/:userId',
    restrictTo('admin', 'manager'),
    catchAsync(async (req: Request, res: Response) => {
        const userId = parseInt(req.params.userId as string);
        const daysParam = req.query.days as string | undefined;
        const days = daysParam ? parseInt(daysParam) : 30;

        const activity = await auditLogAnalyticsService.getUserActivity(userId, days);

        res.json({
            success: true,
            data: activity
        });
    })
);

/**
 * GET /api/audit/export
 * Export audit logs to CSV
 */
auditAnalyticsRouter.get(
    '/api/audit/export',
    restrictTo('admin'),
    catchAsync(async (req: Request, res: Response) => {
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate as string) : new Date();

        const csv = await auditLogAnalyticsService.exportToCSV(start, end);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv"`);
        res.send(csv);
    })
);

/**
 * GET /api/audit/dashboard/stats
 * Get real-time dashboard statistics
 */
auditAnalyticsRouter.get(
    '/api/audit/dashboard/stats',
    restrictTo('admin', 'manager'),
    catchAsync(async (req: Request, res: Response) => {
        const stats = auditLogDashboardService.getStats();

        res.json({
            success: true,
            data: stats
        });
    })
);

export default auditAnalyticsRouter;
