import { Router, Request, Response } from 'express';
import { featureFlagService } from '../services/featureFlagService';
import { catchAsync } from '../utils/catchAsync';

const router = Router();

/**
 * GET /api/feature-flags
 * Get feature flags for current user
 * Returns map of flagName => isEnabled
 */
router.get(
    '/',
    catchAsync(async (req: Request, res: Response) => {
        const userId = (req.user as any)?.id;
        const userRole = (req.user as any)?.role;

        const flags = await featureFlagService.getClientFlags(userId, userRole);
        res.json(flags);
    })
);

export default router;
