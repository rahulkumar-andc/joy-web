import { Router, Request, Response } from 'express';
import { pushNotificationService } from '../services/pushNotificationService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';

const pushRouter = Router();

/**
 * GET /api/push/vapid-key
 * Get VAPID public key for client-side subscription
 */
pushRouter.get('/api/push/vapid-key', (req: Request, res: Response) => {
    const publicKey = pushNotificationService.getVapidPublicKey();

    if (!publicKey) {
        throw new AppError('Push notifications not configured', 503);
    }

    res.json({ publicKey });
});

/**
 * POST /api/push/subscribe
 * Subscribe user to push notifications
 */
pushRouter.post('/api/push/subscribe', catchAsync(async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
        throw new AppError('Authentication required', 401);
    }

    const userId = (req.user as any).id;
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
        throw new AppError('Invalid subscription data', 400);
    }

    const success = await pushNotificationService.subscribeBrowser(userId, {
        endpoint,
        keys,
    });

    if (!success) {
        throw new AppError('Failed to save subscription', 500);
    }

    res.json({ success: true, message: 'Subscribed successfully' });
}));

/**
 * POST /api/push/unsubscribe
 * Unsubscribe from push notifications
 */
pushRouter.post('/api/push/unsubscribe', catchAsync(async (req: Request, res: Response) => {
    const { endpoint } = req.body;

    if (!endpoint) {
        throw new AppError('Endpoint required', 400);
    }

    const success = await pushNotificationService.unsubscribeBrowser(endpoint);

    res.json({ success, message: success ? 'Unsubscribed successfully' : 'Failed to unsubscribe' });
}));

export default pushRouter;
