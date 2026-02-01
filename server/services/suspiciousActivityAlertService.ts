/**
 * Suspicious Activity Alert Service
 * 
 * Monitors audit logs and sends alerts for suspicious patterns
 */

import { auditLogAnalyticsService } from './auditLogAnalyticsService';
import { logger } from '../logger';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { getAlertConfig } from '../config/alert-config';

interface AlertConfig {
    slackWebhookUrl?: string;
    adminEmails?: string[];
    alertThresholds?: {
        failedLogins?: number;
        dataAccess?: number;
        bulkDeletes?: number;
    };
}

export class SuspiciousActivityAlertService {
    private config: AlertConfig;

    constructor(config: AlertConfig = {}) {
        const prodConfig = getAlertConfig();

        this.config = {
            slackWebhookUrl: config.slackWebhookUrl || prodConfig.notification.slackWebhookUrl,
            adminEmails: config.adminEmails || prodConfig.notification.adminEmails,
            alertThresholds: {
                failedLogins: prodConfig.thresholds.failedLogins,
                dataAccess: prodConfig.thresholds.dataAccess,
                bulkDeletes: prodConfig.thresholds.bulkDeletes,
                ...config.alertThresholds
            }
        };
    }

    /**
     * Monitor and alert on suspicious activity
     */
    async monitorAndAlert(): Promise<void> {
        try {
            // Check for suspicious activity in last hour
            const since = new Date();
            since.setHours(since.getHours() - 1);

            const patterns = await auditLogAnalyticsService.detectSuspiciousActivity(since);

            if (patterns.length === 0) {
                logger.info('No suspicious activity detected');
                return;
            }

            logger.warn('Suspicious activity detected', {
                count: patterns.length,
                patterns: patterns.map(p => p.pattern)
            });

            // Send alerts for each pattern
            for (const pattern of patterns) {
                await this.sendAlert(pattern);
            }
        } catch (error) {
            logger.error('Failed to monitor suspicious activity', { error });
        }
    }

    /**
     * Send alert for suspicious pattern
     */
    private async sendAlert(pattern: any): Promise<void> {
        const user = await this.getUserDetails(pattern.userId);

        const alertMessage = this.formatAlertMessage(pattern, user);

        // Send to Slack
        if (this.config.slackWebhookUrl) {
            await this.sendSlackAlert(alertMessage, pattern);
        }

        // Send email alerts
        if (this.config.adminEmails && this.config.adminEmails.length > 0) {
            await this.sendEmailAlert(alertMessage, pattern);
        }

        // Log the alert
        logger.warn('Suspicious activity alert sent', {
            pattern: pattern.pattern,
            userId: pattern.userId,
            severity: pattern.severity
        });
    }

    /**
     * Send Slack notification
     */
    private async sendSlackAlert(message: string, pattern: any): Promise<void> {
        if (!this.config.slackWebhookUrl) return;

        try {
            const color = this.getSeverityColor(pattern.severity);

            const payload = {
                text: '🚨 Suspicious Activity Detected',
                attachments: [{
                    color,
                    title: `${pattern.pattern} - ${pattern.severity.toUpperCase()}`,
                    text: message,
                    footer: 'Audit Monitoring System',
                    ts: Math.floor(Date.now() / 1000)
                }]
            };

            const response = await fetch(this.config.slackWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Slack API error: ${response.statusText}`);
            }

            logger.info('Slack alert sent successfully');
        } catch (error) {
            logger.error('Failed to send Slack alert', { error });
        }
    }

    /**
     * Send email alert (placeholder - integrate with your email service)
     */
    private async sendEmailAlert(message: string, pattern: any): Promise<void> {
        try {
            // Use your existing email service here
            // Example: await emailService.sendEmail(...)

            logger.info('Email alert would be sent to admin', {
                recipients: this.config.adminEmails,
                pattern: pattern.pattern
            });

            // TODO: Integrate with actual email service
            // const { emailService } = await import('./email');
            // for (const email of this.config.adminEmails) {
            //     await emailService.sendEmail({
            //         to: email,
            //         subject: `🚨 Suspicious Activity: ${pattern.pattern}`,
            //         html: message
            //     });
            // }
        } catch (error) {
            logger.error('Failed to send email alert', { error });
        }
    }

    /**
     * Format alert message
     */
    private formatAlertMessage(pattern: any, user: any): string {
        const userName = user ? `${user.name} (${user.email})` : `User ID: ${pattern.userId}`;

        return `
**Suspicious Activity Detected**

**Pattern:** ${pattern.pattern}
**Severity:** ${pattern.severity.toUpperCase()}
**User:** ${userName}
**Count:** ${pattern.count}
**Details:** ${JSON.stringify(pattern.details, null, 2)}

**Time:** ${new Date().toISOString()}

**Recommended Action:**
- Review user's recent activity
- Contact user if necessary
- Suspend account if critical
        `.trim();
    }

    /**
     * Get user details
     */
    private async getUserDetails(userId: number): Promise<any> {
        try {
            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);

            return user;
        } catch (error) {
            logger.error('Failed to get user details', { error, userId });
            return null;
        }
    }

    /**
     * Get color for severity
     */
    private getSeverityColor(severity: string): string {
        const colors: Record<string, string> = {
            low: '#36a64f',      // Green
            medium: '#ff9900',   // Orange
            high: '#ff0000',     // Red
            critical: '#8b0000'  // Dark Red
        };
        return colors[severity] || '#808080';
    }
}

export const suspiciousActivityAlertService = new SuspiciousActivityAlertService();
