import { Router, Request, Response } from 'express';
import { imagekitService } from '../services/imagekitService';
import { imageMigrationService } from '../services/imageMigrationService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';
import { requireAuth, requireAdmin } from '../middleware/auth';
import multer from 'multer';

export const imageRouter = Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
        }
    }
});

/**
 * POST /api/images/upload
 * Upload image to ImageKit
 */
imageRouter.post(
    '/api/images/upload',
    requireAuth,
    requireAdmin,
    upload.single('image'),
    catchAsync(async (req: Request, res: Response) => {
        if (!req.file) {
            throw new AppError('No image file provided', 400);
        }

        const folder = req.body.folder || '/products';
        const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

        const result = await imagekitService.uploadImage({
            file: req.file.buffer,
            fileName: req.file.originalname,
            folder,
            tags
        });

        res.status(201).json(result);
    })
);

/**
 * POST /api/images/upload-multiple
 * Upload multiple images to ImageKit
 */
imageRouter.post(
    '/api/images/upload-multiple',
    requireAuth,
    requireAdmin,
    upload.array('images', 10), // Max 10 images
    catchAsync(async (req: Request, res: Response) => {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            throw new AppError('No image files provided', 400);
        }

        const folder = req.body.folder || '/products';
        const results = [];

        for (const file of files) {
            const result = await imagekitService.uploadImage({
                file: file.buffer,
                fileName: file.originalname,
                folder
            });
            results.push(result);
        }

        res.status(201).json(results);
    })
);

/**
 * DELETE /api/images/:fileId
 * Delete image from ImageKit
 */
imageRouter.delete(
    '/api/images/:fileId',
    requireAuth,
    requireAdmin,
    catchAsync(async (req: Request, res: Response) => {
        const fileId = req.params.fileId as string;
        await imagekitService.deleteImage(fileId);
        res.status(204).send();
    })
);

/**
 * POST /api/images/migrate
 * Migrate all product images to ImageKit
 */
imageRouter.post(
    '/api/images/migrate',
    requireAuth,
    requireAdmin,
    catchAsync(async (req: Request, res: Response) => {
        const result = await imageMigrationService.migrateAllProducts();
        res.json(result);
    })
);

/**
 * GET /api/images/migration-status
 * Get migration status
 */
imageRouter.get(
    '/api/images/migration-status',
    requireAuth,
    requireAdmin,
    catchAsync(async (req: Request, res: Response) => {
        const status = await imageMigrationService.getMigrationStatus();
        res.json(status);
    })
);

export default imageRouter;
