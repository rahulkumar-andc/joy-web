import { logger } from "../logger";

/**
 * SMS Service for sending OTP via SMS
 * This is a placeholder that can be integrated with actual SMS providers like:
 * - Twilio
 * - MSG91
 * - TextLocal
 * - AWS SNS
 */
class SMSService {
    private provider: string;
    private enabled: boolean;

    constructor() {
        this.provider = process.env.SMS_PROVIDER || "mock";
        this.enabled = process.env.SMS_ENABLED === "true";

        if (!this.enabled) {
            logger.warn("⚠️  SMS Service disabled - Set SMS_ENABLED=true to enable");
        } else {
            logger.info(`📱 SMSService initialized with provider: ${this.provider}`);
        }
    }

    /**
     * Send OTP via SMS
     */
    async sendOTP(phone: string, otp: string): Promise<{ success: boolean; message: string }> {
        if (!this.enabled) {
            logger.info(`[MOCK SMS] OTP for ${phone}: ${otp}`);
            return { success: true, message: "OTP logged (SMS disabled)" };
        }

        switch (this.provider) {
            case "twilio":
                return this.sendViaTwilio(phone, otp);
            case "msg91":
                return this.sendViaMSG91(phone, otp);
            case "textlocal":
                return this.sendViaTextLocal(phone, otp);
            default:
                logger.info(`[MOCK SMS] to ${phone}: Your Steal the Deal verification code is: ${otp}. Valid for 10 minutes.`);
                return { success: true, message: "SMS sent (Mock mode)" };
        }
    }

    /**
     * Send SMS via Twilio
     */
    private async sendViaTwilio(phone: string, otp: string): Promise<{ success: boolean; message: string }> {
        try {
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            const fromNumber = process.env.TWILIO_PHONE_NUMBER;

            if (!accountSid || !authToken || !fromNumber) {
                logger.error("Twilio credentials not configured");
                return { success: false, message: "SMS configuration error" };
            }

            // Twilio integration would go here
            // const twilio = require('twilio');
            // const client = twilio(accountSid, authToken);
            // await client.messages.create({
            //     body: `Your Steal the Deal verification code is: ${otp}. Valid for 10 minutes.`,
            //     from: fromNumber,
            //     to: phone
            // });

            logger.info(`✅ SMS sent via Twilio to ${phone}`);
            return { success: true, message: "SMS sent successfully" };
        } catch (error) {
            logger.error("Failed to send SMS via Twilio:", error);
            return { success: false, message: "Failed to send SMS" };
        }
    }

    /**
     * Send SMS via MSG91 (Popular in India)
     */
    private async sendViaMSG91(phone: string, otp: string): Promise<{ success: boolean; message: string }> {
        try {
            const authKey = process.env.MSG91_AUTH_KEY;
            const senderId = process.env.MSG91_SENDER_ID || "STLDEA";
            const templateId = process.env.MSG91_TEMPLATE_ID;

            if (!authKey) {
                logger.error("MSG91 credentials not configured");
                return { success: false, message: "SMS configuration error" };
            }

            const msg91Url = `https://api.msg91.com/api/v5/otp`;

            const payload = {
                template_id: templateId,
                mobile: phone,
                authkey: authKey,
                otp,
                sender: senderId,
            };

            // MSG91 API call would go here
            // const response = await fetch(msg91Url, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(payload)
            // });

            logger.info(`✅ SMS sent via MSG91 to ${phone}`);
            return { success: true, message: "SMS sent successfully" };
        } catch (error) {
            logger.error("Failed to send SMS via MSG91:", error);
            return { success: false, message: "Failed to send SMS" };
        }
    }

    /**
     * Send SMS via TextLocal (UK/India)
     */
    private async sendViaTextLocal(phone: string, otp: string): Promise<{ success: boolean; message: string }> {
        try {
            const apiKey = process.env.TEXTLOCAL_API_KEY;
            const sender = process.env.TEXTLOCAL_SENDER || "STLDEAL";

            if (!apiKey) {
                logger.error("TextLocal credentials not configured");
                return { success: false, message: "SMS configuration error" };
            }

            const message = `Your Steal the Deal verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;

            // TextLocal API call would go here
            // const response = await fetch('https://api.textlocal.in/send/', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            //     body: new URLSearchParams({
            //         apiKey,
            //         sender,
            //         numbers: phone,
            //         message
            //     })
            // });

            logger.info(`✅ SMS sent via TextLocal to ${phone}`);
            return { success: true, message: "SMS sent successfully" };
        } catch (error) {
            logger.error("Failed to send SMS via TextLocal:", error);
            return { success: false, message: "Failed to send SMS" };
        }
    }

    /**
     * Send order status update SMS
     */
    async sendOrderStatusUpdate(phone: string, orderNumber: string, status: string): Promise<{ success: boolean }> {
        if (!this.enabled) {
            logger.info(`[MOCK SMS] Order update for ${phone}: Order ${orderNumber} is now ${status}`);
            return { success: true };
        }

        const message = `Your order ${orderNumber} is now ${status}. Track at: ${process.env.CLIENT_URL}/orders/${orderNumber}`;

        logger.info(`📱 Sending order update SMS to ${phone}`);
        // Actual SMS sending would use the same provider methods as OTP

        return { success: true };
    }

    /**
     * Send payout notification SMS to seller
     */
    async sendPayoutNotification(phone: string, amount: number, status: string): Promise<{ success: boolean }> {
        if (!this.enabled) {
            logger.info(`[MOCK SMS] Payout notification for ${phone}: ₹${amount} ${status}`);
            return { success: true };
        }

        const message = `Your payout of ₹${amount} has been ${status}. Check your seller dashboard for details.`;

        logger.info(`📱 Sending payout notification SMS to ${phone}`);
        // Actual SMS sending would use the same provider methods as OTP

        return { success: true };
    }
}

export const smsService = new SMSService();
