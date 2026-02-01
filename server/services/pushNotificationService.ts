/**
 * Push Notification Service
 * 
 * Sends push notifications via Firebase Cloud Messaging (FCM)
 */

import { logger } from '../logger';

interface PushNotification {
    title: string;
    body: string;
    data?: Record<string, string>;
}

interface PushResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

export class PushNotificationService {
    private enabled: boolean;

    constructor() {
        // Check if FCM is configured
        this.enabled = !!process.env.FCM_SERVER_KEY;

        if (!this.enabled) {
            logger.warn('Push notification service not configured');
        }
    }

    /**
     * Send push notification to a device
     */
    async sendToDevice(deviceToken: string, notification: PushNotification): Promise<PushResult> {
        if (!this.enabled) {
            logger.info('Push notifications disabled, skipping', { deviceToken });
            return { success: false, error: 'FCM not configured' };
        }

        try {
            logger.info('Sending push notification', { deviceToken, notification });

            // In production, use Firebase Admin SDK:
            /*
            const admin = require('firebase-admin');
            
            const message = {
                notification: {
                    title: notification.title,
                    body: notification.body
                },
                data: notification.data || {},
                token: deviceToken
            };

            const response = await admin.messaging().send(message);
            return { success: true, messageId: response };
            */

            // For now, just log
            logger.info('Push notification would be sent in production', notification);

            return { success: true, messageId: 'mock-' + Date.now() };
        } catch (error) {
            logger.error('Failed to send push notification', { error });
            return { success: false, error: String(error) };
        }
    }

    /**
     * Send push notification to multiple devices
     */
    async sendToDevices(deviceTokens: string[], notification: PushNotification): Promise<{
        successful: number;
        failed: number;
        results: PushResult[];
    }> {
        const results: PushResult[] = [];
        let successful = 0;
        let failed = 0;

        for (const token of deviceTokens) {
            const result = await this.sendToDevice(token, notification);
            results.push(result);

            if (result.success) {
                successful++;
            } else {
                failed++;
            }
        }

        return { successful, failed, results };
    }

    /**
     * Send order status push notification
     */
    async sendOrderUpdate(
        deviceToken: string,
        orderId: number,
        status: string
    ): Promise<PushResult> {
        const statusMessages: Record<string, string> = {
            'confirmed': '🎉 Your order has been confirmed!',
            'shipped': '📦 Your order is on its way!',
            'delivered': '✅ Your order has been delivered!'
        };

        return this.sendToDevice(deviceToken, {
            title: 'Order Update',
            body: statusMessages[status] || `Order #${orderId} status: ${status}`,
            data: {
                orderId: orderId.toString(),
                status,
                type: 'order_update'
            }
        });
    }

    /**
     * Send promotional push notification
     */
    async sendPromotion(
        deviceToken: string,
        title: string,
        message: string,
        link?: string
    ): Promise<PushResult> {
        return this.sendToDevice(deviceToken, {
            title,
            body: message,
            data: link ? { link, type: 'promotion' } : { type: 'promotion' }
        });
    }
}

export const pushNotificationService = new PushNotificationService();
