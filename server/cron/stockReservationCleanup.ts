/**
 * Stock Reservation Cleanup Cron Job
 * 
 * Runs every 5 minutes to release expired stock reservations.
 * This ensures stock becomes available again after checkout timeout.
 */

import cron from "node-cron";
import { stockReservationService } from "../services/stockReservationService";
import { logger } from "../logger";

// Run every 5 minutes
export const stockReservationCleanup = cron.schedule("*/5 * * * *", async () => {
    try {
        const released = await stockReservationService.releaseExpiredReservations();

        if (released > 0) {
            logger.info(`Stock reservation cleanup: Released ${released} expired reservations`);
        }
    } catch (error) {
        logger.error("Stock reservation cleanup failed:", error);
    }
});

logger.info("Stock reservation cleanup cron job registered (runs every 5 minutes)");
