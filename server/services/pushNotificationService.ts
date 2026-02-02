/**
 * Push Notification Service
 * 
 * Sends push notifications via:
 * 1. Web Push (browser notifications)
 * 2. Firebase Cloud Messaging (mobile - future)
 */

import { logger } from '../logger';
import webPush from 'web-push';
import { db } from '../db';
import { pushSubscriptions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { createCircuitBreaker, CIRCUIT_OPTIONS } from "../config/circuit-breakers";
import CircuitBreaker from "opossum";

interface PushNotification {
    title: string;
    body: string;
    data?: Record<string, string>;
}

interface PushResult {
    success: boolean;
    messageId?: string;
    error?: string;
    _fallback?: boolean;
}

// VAPID Keys for Web Push
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@stealthedeal.com';

export class PushNotificationService {
    private webPushEnabled: boolean;
    private fcmEnabled: boolean;
    private sendPushBreaker: CircuitBreaker<[number, PushNotification], PushResult>;

    constructor() {
        // Check if Web Push is configured
        this.webPushEnabled = !!VAPID_PUBLIC_KEY && !!VAPID_PRIVATE_KEY;

        if (this.webPushEnabled) {
            webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
            logger.info('📲 Web Push enabled');
        } else {
            logger.warn('⚠️ Web Push not configured (VAPID keys missing)');
        }

        // Check if FCM is configured (for future mobile support)
        this.fcmEnabled = !!process.env.FCM_SERVER_KEY;
        if (!this.fcmEnabled) {
            logger.info('Firebase Cloud Messaging not configured');
        }

        // Initialize circuit breaker
        this.sendPushBreaker = createCircuitBreaker(
            this.sendToUserRaw.bind(this),
            CIRCUIT_OPTIONS.PUSH,
            async (userId, notification) => {
                // Fallback: Log and skip (push is non-critical)
                logger.warn('Push notification circuit open - skipping', { userId });
                return { success: false, _fallback: true, error: 'Circuit open' };
            }
        );
    }

    /**
     * Get VAPID public key for client-side subscription
     */
    getVapidPublicKey(): string {
        return VAPID_PUBLIC_KEY;
    }

    /**
     * Save browser push subscription
     */
    async subscribeBrowser(userId: number, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<boolean> {
        try {
            // Check if subscription already exists
            const existing = await db
                .select()
                .from(pushSubscriptions)
                .where(eq(pushSubscriptions.endpoint, subscription.endpoint));

            if (existing.length > 0) {
                logger.info('Subscription already exists');
                return true;
            }

            await db.insert(pushSubscriptions).values({
                userId,
                endpoint: subscription.endpoint,
                keys: subscription.keys,
            });

            logger.info(`✅ Browser push subscription saved for user ${userId}`);
            return true;
        } catch (error) {
            logger.error('Error saving push subscription:', error);
            return false;
        }
    }

    /**
     * Remove browser push subscription
     */
    async unsubscribeBrowser(endpoint: string): Promise<boolean> {
        try {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
            logger.info('Subscription removed');
            return true;
        } catch (error) {
            logger.error('Error removing push subscription:', error);
            return false;
        }
    }

    /**
     * Raw send to user (without circuit breaker)
     */
    private async sendToUserRaw(userId: number, notification: PushNotification): Promise<PushResult> {
        if (!this.webPushEnabled) {
            logger.warn('Web Push disabled, notification not sent');
            return { success: false, error: 'Web Push not configured' };
        }

        try {
            // Get all browser subscriptions for this user
            const subscriptions = await db
                .select()
                .from(pushSubscriptions)
                .where(eq(pushSubscriptions.userId, userId));

            if (subscriptions.length === 0) {
                logger.info(`No push subscriptions found for user ${userId}`);
                return { success: false, error: 'No subscriptions' };
            }

            const payload = JSON.stringify({
                title: notification.title,
                body: notification.body,
                icon: '/logo.png',
                badge: '/badge.png',
                data: notification.data || {},
                timestamp: Date.now(),
            });

            let sent = 0;
            let failed = 0;

            // Send to all subscriptions
            for (const sub of subscriptions) {
                try {
                    const subscription = {
                        endpoint: sub.endpoint,
                        keys: sub.keys as { p256dh: string; auth: string },
                    };

                    await webPush.sendNotification(subscription, payload);
                    sent++;
                    logger.info(`✅ Push sent to user ${userId}`);
                } catch (error: any) {
                    // Remove invalid/expired subscriptions
                    if (error.statusCode === 410) {
                        logger.info(`Removing invalid subscription for user ${userId}`);
                        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
                    } else {
                        logger.error('Failed to send push:', error);
                    }
                    failed++;
                }
            }

            return { success: sent > 0, messageId: `sent-${sent}-failed-${failed}` };
        } catch (error) {
            logger.error('Error sending push notification:', error);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Send browser push notification to a user (with circuit breaker)
     */
    async sendToUser(userId: number, notification: PushNotification): Promise<PushResult> {
        return this.sendPushBreaker.fire(userId, notification);
    }

    /**
     * Send order status push notification
     */
    async sendOrderUpdate(userId: number, orderId: number, status: string): Promise<PushResult> {
        const statusMessages: Record<string, string> = {
            'paid': '🎉 Payment confirmed!',
            'packed': '📦 Your order is being packed',
            'shipped': '🚚 Your order is on the way!',
            'out_for_delivery': '🚗 Out for delivery!',
            'delivered': '✅ Your order has been delivered!',
            'cancelled': '❌ Order cancelled',
        };

        return this.sendToUser(userId, {
            title: `Order #${orderId}`,
            body: statusMessages[status] || `Status: ${status}`,
            data: {
                orderId: orderId.toString(),
                status,
                type: 'order_update',
                url: `/orders/${orderId}/track`,
            },
        });
    }

    /**
     * Legacy FCM method (for future mobile support)
     */
    async sendToDevice(deviceToken: string, notification: PushNotification): Promise<PushResult> {
        if (!this.fcmEnabled) {
            logger.info('FCM disabled, skipping');
            return { success: false, error: 'FCM not configured' };
        }

        // Implement FCM logic here when mobile app is ready
        logger.info('FCM would be sent in production', notification);
        return { success: true, messageId: 'mock-' + Date.now() };
    }

    // Expose breaker for monitoring
    get breaker() {
        return this.sendPushBreaker;
    }
}

export const pushNotificationService = new PushNotificationService();
