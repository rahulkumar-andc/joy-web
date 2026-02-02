/**
 * Shipping Notification Service
 * 
 * Sends alerts when critical shipping settings change.
 * Supports email and Slack notifications.
 */

import { shippingSettingsService } from "./shippingSettingsService";
import { logger } from "../logger";

interface NotificationPayload {
    settingKey: string;
    oldValue: string;
    newValue: string;
    changedBy: number;
    timestamp: Date;
}

// Critical settings that always trigger notifications
const CRITICAL_SETTINGS = [
    "global_free_shipping_override",
    "default_shipping_cost",
    "festive_mode_enabled",
    "free_shipping_enabled",
];

class ShippingNotificationService {
    /**
     * Send notification for shipping setting change
     */
    async notifySettingChange(payload: NotificationPayload): Promise<void> {
        try {
            // Check if notifications are enabled
            const notificationsEnabled = await shippingSettingsService.getSetting(
                "notifications_enabled" as any
            );
            if (notificationsEnabled !== "true") {
                logger.debug("[ShippingNotify] Notifications disabled");
                return;
            }

            // Only notify for critical settings
            if (!CRITICAL_SETTINGS.includes(payload.settingKey)) {
                return;
            }

            // Send email notification
            await this.sendEmailNotification(payload);

            // Send Slack notification
            await this.sendSlackNotification(payload);

            logger.info("[ShippingNotify] Notifications sent", {
                settingKey: payload.settingKey,
            });
        } catch (error) {
            logger.error("[ShippingNotify] Failed to send notifications:", error);
        }
    }

    /**
     * Send email notification
     */
    private async sendEmailNotification(payload: NotificationPayload): Promise<void> {
        const notificationEmail = await shippingSettingsService.getSetting(
            "notification_email" as any
        );
        if (!notificationEmail) return;

        const subject = `⚠️ Shipping Setting Changed: ${payload.settingKey}`;

        // Log email notification (integrate with your email service as needed)
        logger.info("[ShippingNotify] Email notification", {
            to: notificationEmail,
            subject,
            settingKey: payload.settingKey,
            oldValue: payload.oldValue,
            newValue: payload.newValue,
            changedBy: payload.changedBy,
            timestamp: payload.timestamp.toISOString(),
        });

        // TODO: Integrate with your email service
        // Example: await sendEmail({ to: notificationEmail, subject, html: body });
    }

    /**
     * Send Slack notification
     */
    private async sendSlackNotification(payload: NotificationPayload): Promise<void> {
        const webhookUrl = await shippingSettingsService.getSetting(
            "notification_slack_webhook" as any
        );
        if (!webhookUrl) return;

        const emoji = payload.settingKey.includes("override") ? "🚨" : "📦";
        const message = {
            text: `${emoji} *Shipping Setting Changed*`,
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: `${emoji} Shipping Setting Changed`,
                    },
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `*Setting:*\n\`${payload.settingKey}\``,
                        },
                        {
                            type: "mrkdwn",
                            text: `*Changed By:*\nUser #${payload.changedBy}`,
                        },
                        {
                            type: "mrkdwn",
                            text: `*Old Value:*\n${payload.oldValue || "N/A"}`,
                        },
                        {
                            type: "mrkdwn",
                            text: `*New Value:*\n${payload.newValue}`,
                        },
                    ],
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: `Changed at ${payload.timestamp.toISOString()}`,
                        },
                    ],
                },
            ],
        };

        try {
            await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(message),
            });
        } catch (error) {
            logger.error("[ShippingNotify] Slack notification failed:", error);
        }
    }
}

export const shippingNotificationService = new ShippingNotificationService();
