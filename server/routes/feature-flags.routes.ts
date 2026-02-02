import { Router, Request, Response } from 'express';
import { featureFlagService } from '../services/featureFlagService';
import { requirePermission } from '../middleware/rbac';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';

const router = Router();

/**
 * GET /api/admin/feature-flags
 * List all feature flags
 */
router.get(
    '/',
    requirePermission('feature_flags', 'read'),
    catchAsync(async (req: Request, res: Response) => {
        const flags = await featureFlagService.getAllFlags();
        res.json(flags);
    })
);

/**
 * GET /api/admin/feature-flags/:id
 * Get single feature flag
 */
router.get(
    '/:id',
    requirePermission('feature_flags', 'read'),
    catchAsync(async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const flag = await featureFlagService.getFlagById(parseInt(id));
        if (!flag) {
            throw new AppError('Feature flag not found', 404);
        }
        res.json(flag);
    })
);

/**
 * POST /api/admin/feature-flags
 * Create new feature flag
 */
router.post(
    '/',
    requirePermission('feature_flags', 'create'),
    catchAsync(async (req: Request, res: Response) => {
        const userId = (req.user as any).id;
        const flag = await featureFlagService.createFlag({
            ...req.body,
            createdBy: userId,
            updatedBy: userId,
        });
        res.status(201).json(flag);
    })
);

/**
 * PUT /api/admin/feature-flags/:id
 * Update feature flag
 */
router.put(
    '/:id',
    requirePermission('feature_flags', 'update'),
    catchAsync(async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const userId = (req.user as any).id;
        const flag = await featureFlagService.updateFlag(parseInt(id), {
            ...req.body,
            updatedBy: userId,
        });
        res.json(flag);
    })
);

/**
 * DELETE /api/admin/feature-flags/:id
 * Delete feature flag
 */
router.delete(
    '/:id',
    requirePermission('feature_flags', 'delete'),
    catchAsync(async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await featureFlagService.deleteFlag(parseInt(id));
        res.status(204).send();
    })
);

export default router;
