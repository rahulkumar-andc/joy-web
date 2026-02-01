import { Router, Request, Response } from 'express';
import { couponAnalyticsService } from '../services/couponAnalyticsService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const couponAnalyticsRouter = Router();

/**
 * GET /api/admin/analytics/coupons/dashboard
 * Get coupon analytics dashboard summary (last 30 days)
 */
couponAnalyticsRouter.get(
    '/api/admin/analytics/coupons/dashboard',
    requireAuth,
    requireAdmin,
    catchAsync(async (req: Request, res: Response) => {
        const summary = await couponAnalyticsService.getDashboardSummary();
        res.json(summary);
    })
);

/**
 * GET /api/admin/analytics/coupons/:couponId
 * Get detailed statistics for a specific coupon
 */
couponAnalyticsRouter.get(
    '/api/admin/analytics/coupons/:couponId',
    requireAuth,
    requireAdmin,
    catchAsync(async (req: Request, res: Response) => {
        const couponId = parseInt(req.params.couponId as string);

        if (isNaN(couponId)) {
            throw new AppError('Invalid coupon ID', 400);
        }

        const stats = await couponAnalyticsService.getCouponStats(couponId);

        if (!stats) {
            throw new AppError('Coupon not found', 404);
        }

        res.json(stats);
    })
);

/**
 * GET /api/admin/analytics/coupons/:couponId/roi
 * Calculate ROI for a specific coupon
 */
couponAnalyticsRouter.get(
    '/api/admin/analytics/coupons/:couponId/roi',
    requireAuth,
    requireAdmin,
    catchAsync(async (req: Request, res: Response) => {
        const couponId = parseInt(req.params.couponId as string);

        if (isNaN(couponId)) {
            throw new AppError('Invalid coupon ID', 400);
        }

        const roi = await couponAnalyticsService.calculateCouponROI(couponId);
        res.json(roi);
    })
);

/**
 * GET /api/admin/analytics/coupons/:couponId/timeseries
 * Get time series data for coupon usage
 * Query params: startDate, endDate (ISO format)
 */
couponAnalyticsRouter.get(
    '/api/admin/analytics/coupons/:couponId/timeseries',
    requireAuth,
    requireAdmin,
    catchAsync(async (req: Request, res: Response) => {
        const couponId = parseInt(req.params.couponId as string);
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

        if (isNaN(couponId)) {
            throw new AppError('Invalid coupon ID', 400);
        }

        const timeSeries = await couponAnalyticsService.getCouponUsageTimeSeries(
            couponId,
            startDate,
            endDate
        );

        res.json({
            couponId,
            startDate,
            endDate,
            data: timeSeries
        });
    })
);

/**
 * GET /api/admin/analytics/coupons/top/usage
 * Get top coupons by usage count
 * Query params: limit (default: 10)
 */
couponAnalyticsRouter.get(
    '/api/admin/analytics/coupons/top/usage',
    requireAuth,
    requireAdmin,
    catchAsync(async (req: Request, res: Response) => {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        const topCoupons = await couponAnalyticsService.getTopCouponsByUsage(limit);
        res.json(topCoupons);
    })
);

/**
 * GET /api/admin/analytics/coupons/top/revenue
 * Get top coupons by revenue generated
 * Query params: limit (default: 10)
 */
couponAnalyticsRouter.get(
    '/api/admin/analytics/coupons/top/revenue',
    requireAuth,
    requireAdmin,
    catchAsync(async (req: Request, res: Response) => {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        const topCoupons = await couponAnalyticsService.getTopCouponsByRevenue(limit);
        res.json(topCoupons);
    })
);

/**
 * GET /api/admin/analytics/coupons/revenue-impact
 * Get overall revenue impact of coupons
 * Query params: startDate, endDate (optional, ISO format)
 */
couponAnalyticsRouter.get(
    '/api/admin/analytics/coupons/revenue-impact',
    requireAuth,
    requireAdmin,
    catchAsync(async (req: Request, res: Response) => {
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        const impact = await couponAnalyticsService.getRevenueImpact(startDate, endDate);
        res.json(impact);
    })
);

/**
 * GET /api/user/analytics/coupons/history
 * Get user's own coupon usage history
 */
couponAnalyticsRouter.get(
    '/api/user/analytics/coupons/history',
    requireAuth,
    catchAsync(async (req: Request, res: Response) => {
        const userId = (req.user as any).id;
        const history = await couponAnalyticsService.getUserCouponHistory(userId);
        res.json(history);
    })
);

export default couponAnalyticsRouter;
