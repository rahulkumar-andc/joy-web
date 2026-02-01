/**
 * Production Alert Configuration
 * 
 * Recommended thresholds for production environments
 */

export interface AlertThresholds {
    failedLogins: number;
    dataAccess: number;
    bulkDeletes: number;
    permissionChanges: number;
}

export interface NotificationConfig {
    slackWebhookUrl?: string;
    adminEmails: string[];
    enableSlack: boolean;
    enableEmail: boolean;
}

/**
 * Production Alert Configuration
 * Adjust these based on your traffic patterns
 */
export const productionAlertConfig: {
    thresholds: AlertThresholds;
    notification: NotificationConfig;
} = {
    thresholds: {
        // Alert after 5 failed login attempts in 1 hour
        failedLogins: 5,

        // Alert after 100 data access operations in 1 hour
        // Adjust based on typical admin activity
        dataAccess: 100,

        // Alert after 10 bulk delete operations in 1 hour
        bulkDeletes: 10,

        // Alert after 5 permission/role changes in 1 hour
        permissionChanges: 5
    },

    notification: {
        slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
        adminEmails: process.env.ADMIN_ALERT_EMAILS?.split(',') || [],
        enableSlack: !!process.env.SLACK_WEBHOOK_URL,
        enableEmail: !!(process.env.ADMIN_ALERT_EMAILS && process.env.SMTP_HOST)
    }
};

/**
 * Development Alert Configuration
 * More lenient thresholds for testing
 */
export const developmentAlertConfig: {
    thresholds: AlertThresholds;
    notification: NotificationConfig;
} = {
    thresholds: {
        failedLogins: 3,      // Lower threshold for testing
        dataAccess: 50,
        bulkDeletes: 5,
        permissionChanges: 3
    },

    notification: {
        slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
        adminEmails: process.env.ADMIN_ALERT_EMAILS?.split(',') || ['dev@example.com'],
        enableSlack: !!process.env.SLACK_WEBHOOK_URL,
        enableEmail: false  // Disable email in dev
    }
};

/**
 * Get configuration based on environment
 */
export function getAlertConfig() {
    const env = process.env.NODE_ENV || 'development';

    if (env === 'production') {
        return productionAlertConfig;
    }

    return developmentAlertConfig;
}

/**
 * Threshold recommendations by company size:
 * 
 * Small (< 50 users):
 * - failedLogins: 3-5
 * - dataAccess: 50-100
 * - bulkDeletes: 5-10
 * - permissionChanges: 3-5
 * 
 * Medium (50-500 users):
 * - failedLogins: 5-10
 * - dataAccess: 100-200
 * - bulkDeletes: 10-20
 * - permissionChanges: 5-10
 * 
 * Large (500+ users):
 * - failedLogins: 10-20
 * - dataAccess: 200-500
 * - bulkDeletes: 20-50
 * - permissionChanges: 10-20
 */
