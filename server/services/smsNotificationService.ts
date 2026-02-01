/**
 * SMS Notification Service
 * 
 * Sends SMS notifications for order updates
 * Uses AWS SNS or Twilio (configurable)
 */

import { logger } from '../logger';

interface SMSMessage {
    phone: string;
    message: string;
}

interface SMSResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

export class SMSNotificationService {
    private enabled: boolean;

    constructor() {
        // Check if SMS is configured
        this.enabled = !!(
            process.env.SMS_PROVIDER &&
            (process.env.TWILIO_ACCOUNT_SID || process.env.AWS_SNS_REGION)
        );

        if (!this.enabled) {
            logger.warn('SMS service not configured, notifications will be skipped');
        }
    }

    /**
     * Send SMS notification
     */
    async sendSMS(sms: SMSMessage): Promise<SMSResult> {
        if (!this.enabled) {
            logger.info('SMS service disabled, skipping notification', { phone: sms.phone });
            return { success: false, error: 'SMS service not configured' };
        }

        try {
            logger.info('Sending SMS', { phone: sms.phone });

            // In production, integrate with Twilio or AWS SNS
            // Example Twilio integration:
            /*
            const twilio = require('twilio');
            const client = twilio(
                process.env.TWILIO_ACCOUNT_SID,
                process.env.TWILIO_AUTH_TOKEN
            );

            const message = await client.messages.create({
                body: sms.message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: sms.phone
            });

            return { success: true, messageId: message.sid };
            */

            // For now, just log
            logger.info('SMS would be sent in production', sms);

            return { success: true, messageId: 'mock-' + Date.now() };
        } catch (error) {
            logger.error('Failed to send SMS', { phone: sms.phone, error });
            return { success: false, error: String(error) };
        }
    }

    /**
     * Send order confirmation SMS
     */
    async sendOrderConfirmation(phone: string, orderId: number, totalAmount: string): Promise<SMSResult> {
        const message = `Your order #${orderId} has been confirmed! Total: ₹${totalAmount}. Track your order at: https://yourstore.com/orders/${orderId}`;

        return this.sendSMS({ phone, message });
    }

    /**
     * Send order shipped SMS
     */
    async sendOrderShipped(phone: string, orderId: number, trackingUrl?: string): Promise<SMSResult> {
        const message = trackingUrl
            ? `Your order #${orderId} has been shipped! Track: ${trackingUrl}`
            : `Your order #${orderId} has been shipped! You'll receive it soon.`;

        return this.sendSMS({ phone, message });
    }

    /**
     * Send order delivered SMS
     */
    async sendOrderDelivered(phone: string, orderId: number): Promise<SMSResult> {
        const message = `Your order #${orderId} has been delivered! Thank you for shopping with us.`;

        return this.sendSMS({ phone, message });
    }

    /**
     * Send OTP SMS
     */
    async sendOTP(phone: string, otp: string): Promise<SMSResult> {
        const message = `Your verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;

        return this.sendSMS({ phone, message });
    }
}

export const smsNotificationService = new SMSNotificationService();
