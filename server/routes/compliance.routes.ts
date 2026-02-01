import { Router, Request, Response } from 'express';
import { gdprDataDeletionService } from '../services/gdprDataDeletionService';
import { dataRetentionService } from '../services/dataRetentionService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const complianceRouter = Router();

/**
 * DELETE /api/compliance/user/:id
 * Delete all user data (GDPR Right to Erasure)
 */
complianceRouter.delete(
    '/api/compliance/user/:id',
    requireAuth,
    requireAdmin,
    catchAsync(async (req: Request, res: Response) => {
        const userId = parseInt(req.params.id as string);
        const adminId = (req.user as any).id;
        const reason = req.body.reason || 'Admin requested deletion';

        if (isNaN(userId)) {
            throw new AppError('Invalid user ID', 400);
        }

        // Don't allow deleting self
        if (userId === adminId) {
            throw new AppError('Cannot delete your own account', 400);
        }

        const result = await gdprDataDeletionService.deleteUserData(
            userId,
            adminId,
            reason
        );

        res.json(result);
    })
);

/**
 * GET /api/compliance/user/:id/export
 * Export user data (GDPR Right to Data Portability)
 */
complianceRouter.get(
    '/api/compliance/user/:id/export',
    requireAuth,
    catchAsync(async (req: Request, res: Response) => {
        const userId = parseInt(req.params.id as string);
        const requesterId = (req.user as any).id;
        const isAdmin = (req.user as any).role === 'admin';

        if (isNaN(userId)) {
            throw new AppError('Invalid user ID', 400);
        }

        // Users can only export their own data unless admin
        if (!isAdmin && userId !== requesterId) {
            throw new AppError('Access denied', 403);
        }

        const data = await gdprDataDeletionService.exportUserData(userId);

        res.json(data);
    })
);

/**
 * POST /api/compliance/retention/run
 * Run data retention policies
 */
complianceRouter.post(
    '/api/compliance/retention/run',
    requireAuth,
    requireAdmin,
    catchAsync(async (req: Request, res: Response) => {
        const result = await dataRetentionService.runRetentionPolicies();
        res.json(result);
    })
);

/**
 * GET /api/compliance/retention/stats
 * Get retention statistics
 */
complianceRouter.get(
    '/api/compliance/retention/stats',
    requireAuth,
    requireAdmin,
    catchAsync(async (req: Request, res: Response) => {
        const stats = await dataRetentionService.getRetentionStats();
        res.json(stats);
    })
);

export default complianceRouter;
