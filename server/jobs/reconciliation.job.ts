import { ReconciliationService } from "../services/payment/ReconciliationService";
import { logger } from "../logger";

// Run every 24 hours (or configurable interval)
// In a real system, this would be a separate worker process or triggered by a cron library (like node-cron or BullMQ)

export async function runReconciliationJob() {
    logger.info("Starting Daily Reconciliation Job...");
    try {
        await ReconciliationService.reconcilePendingPayments();
        logger.info("Daily Reconciliation Job Completed Successfully.");
    } catch (error: any) {
        logger.error(`Daily Reconciliation Job Failed: ${error.message}`);
    }
}

// Function to start the cron (simple setInterval for this demo)
export function startReconciliationCron() {
    // Run once on startup for finding immediate issues (optional)
    // setTimeout(() => runReconciliationJob(), 10000); 

    // Run every 24h
    setInterval(() => {
        runReconciliationJob();
    }, 24 * 60 * 60 * 1000);

    logger.info("Reconciliation Cron Job scheduled (every 24h)");
}
