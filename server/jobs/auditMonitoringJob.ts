/**
 * Background Monitoring Job for Suspicious Activity
 * 
 * Runs periodic checks for suspicious activity and sends alerts
 */

import * as cron from 'node-cron';
import { suspiciousActivityAlertService } from '../services/suspiciousActivityAlertService';
import { logger } from '../logger';

export class AuditMonitoringJob {
    private cronJob: ReturnType<typeof cron.schedule> | null = null;

    /**
     * Start the monitoring job
     * Runs every hour
     */
    start(): void {
        // Run every hour
        this.cronJob = cron.schedule('0 * * * *', async () => {
            logger.info('Running suspicious activity monitoring job');

            try {
                await suspiciousActivityAlertService.monitorAndAlert();
                logger.info('Suspicious activity monitoring completed');
            } catch (error) {
                logger.error('Suspicious activity monitoring failed', { error });
            }
        });

        logger.info('Audit monitoring job started (runs hourly)');

        // Run immediately on startup
        this.runImmediate();
    }

    /**
     * Run monitoring check immediately
     */
    async runImmediate(): Promise<void> {
        logger.info('Running immediate suspicious activity check');

        try {
            await suspiciousActivityAlertService.monitorAndAlert();
        } catch (error) {
            logger.error('Immediate monitoring check failed', { error });
        }
    }

    /**
     * Stop the monitoring job
     */
    stop(): void {
        if (this.cronJob) {
            this.cronJob.stop();
            logger.info('Audit monitoring job stopped');
        }
    }
}

export const auditMonitoringJob = new AuditMonitoringJob();
