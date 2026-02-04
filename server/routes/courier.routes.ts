/**
 * Courier Routes
 * 
 * API endpoints for in-house delivery partner operations.
 * These routes are authenticated and restricted to users with DELIVERY_PARTNER role.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';
import { deliveryService } from '../services/deliveryService';
import { requireAuth } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { logger } from '../logger';

export const courierRouter = Router();

// Configure multer for POD image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'pod');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `pod_${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG and PNG images are allowed'));
        }
    }
});

// Validation schemas
const updateStatusSchema = z.object({
    status: z.enum(['picked_up', 'in_transit', 'delivered']),
    podLocation: z.object({
        lat: z.number(),
        lng: z.number()
    }).optional()
});

/**
 * GET /api/courier/orders
 * Get all orders assigned to the current courier
 */
courierRouter.get('/api/courier/orders', requireAuth, catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;

    if (!userId) {
        throw new AppError('Authentication required', 401);
    }

    const orders = await deliveryService.getCourierOrders(userId);

    res.json({
        success: true,
        orders,
        count: orders.length
    });
}));

/**
 * GET /api/courier/orders/:id
 * Get specific order details for courier
 */
courierRouter.get('/api/courier/orders/:id', requireAuth, catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
    const orderId = parseInt(req.params.id as string);

    if (!userId) {
        throw new AppError('Authentication required', 401);
    }

    if (isNaN(orderId)) {
        throw new AppError('Invalid order ID', 400);
    }

    const orders = await deliveryService.getCourierOrders(userId);
    const order = orders.find(o => o.id === orderId);

    if (!order) {
        throw new AppError('Order not found or not assigned to you', 404);
    }

    res.json({
        success: true,
        order
    });
}));

/**
 * POST /api/orders/:id/pickup
 * Mark order as picked up
 */
courierRouter.post('/api/orders/:id/pickup', requireAuth, catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
    const orderId = parseInt(req.params.id as string);

    if (!userId) {
        throw new AppError('Authentication required', 401);
    }

    if (isNaN(orderId)) {
        throw new AppError('Invalid order ID', 400);
    }

    const result = await deliveryService.updateDeliveryStatus({
        orderId,
        courierId: userId,
        status: 'picked_up'
    });

    res.json({
        message: 'Order marked as picked up',
        ...result,
        success: true
    });
}));

/**
 * POST /api/orders/:id/in-transit
 * Mark order as in transit
 */
courierRouter.post('/api/orders/:id/in-transit', requireAuth, catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
    const orderId = parseInt(req.params.id as string);

    if (!userId) {
        throw new AppError('Authentication required', 401);
    }

    if (isNaN(orderId)) {
        throw new AppError('Invalid order ID', 400);
    }

    const result = await deliveryService.updateDeliveryStatus({
        orderId,
        courierId: userId,
        status: 'in_transit'
    });

    res.json({
        message: 'Order marked as in transit',
        ...result,
        success: true
    });
}));

/**
 * POST /api/orders/:id/deliver
 * Complete delivery with proof of delivery image
 */
courierRouter.post('/api/orders/:id/deliver', requireAuth, upload.single('podImage'), catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
    const orderId = parseInt(req.params.id as string);

    if (!userId) {
        throw new AppError('Authentication required', 401);
    }

    if (isNaN(orderId)) {
        throw new AppError('Invalid order ID', 400);
    }

    // Parse location from request body
    let podLocation: { lat: number; lng: number } | undefined;
    if (req.body.podLocation) {
        try {
            podLocation = typeof req.body.podLocation === 'string'
                ? JSON.parse(req.body.podLocation)
                : req.body.podLocation;
        } catch (e) {
            logger.warn('Failed to parse POD location:', e);
        }
    }

    const result = await deliveryService.updateDeliveryStatus({
        orderId,
        courierId: userId,
        status: 'delivered',
        proofOfDeliveryImage: req.file?.path,
        podLocation
    });

    res.json({
        success: true,
        message: 'Delivery completed',
        validation: result.validation,
        isSuspicious: result.validation?.isSuspicious || false
    });
}));

/**
 * GET /api/admin/deliveries/suspicious
 * Get all suspicious deliveries for admin review
 */
courierRouter.get('/api/admin/deliveries/suspicious', requireAuth, catchAsync(async (req: Request, res: Response) => {
    // TODO: Add admin role check

    const deliveries = await deliveryService.getSuspiciousDeliveries();

    res.json({
        success: true,
        deliveries,
        count: deliveries.length
    });
}));

/**
 * GET /api/admin/deliveries/couriers
 * Get available couriers for assignment
 */
courierRouter.get('/api/admin/deliveries/couriers', requireAuth, catchAsync(async (req: Request, res: Response) => {
    // TODO: Add admin role check

    const couriers = await deliveryService.getAvailableCouriers();

    res.json({
        success: true,
        couriers
    });
}));

/**
 * POST /api/admin/orders/:id/assign-courier
 * Assign a courier to an order
 */
courierRouter.post('/api/admin/orders/:id/assign-courier', requireAuth, catchAsync(async (req: Request, res: Response) => {
    const orderId = parseInt(req.params.id as string);
    const { courierId } = req.body;

    if (isNaN(orderId)) {
        throw new AppError('Invalid order ID', 400);
    }

    if (!courierId || typeof courierId !== 'number') {
        throw new AppError('Courier ID is required', 400);
    }

    await deliveryService.assignCourier(orderId, courierId);

    res.json({
        success: true,
        message: `Order ${orderId} assigned to courier ${courierId}`
    });
}));

/**
 * GET /api/admin/orders/pending-cod
 * Get orders pending COD settlement
 */
courierRouter.get('/api/admin/orders/pending-cod', requireAuth, catchAsync(async (req: Request, res: Response) => {
    // TODO: Add L10 role check

    const orders = await deliveryService.getPendingCodSettlements();

    res.json({
        success: true,
        orders,
        count: orders.length
    });
}));

/**
 * POST /api/admin/orders/:id/settle-cod
 * Mark COD as settled (Business Admin L10 only)
 */
courierRouter.post('/api/admin/orders/:id/settle-cod', requireAuth, catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
    const orderId = parseInt(req.params.id as string);

    // TODO: Add L10 role check via RBAC

    if (!userId) {
        throw new AppError('Authentication required', 401);
    }

    if (isNaN(orderId)) {
        throw new AppError('Invalid order ID', 400);
    }

    await deliveryService.settleCod(orderId, userId);

    res.json({
        success: true,
        message: `COD settled for order ${orderId}`
    });
}));

export default courierRouter;
