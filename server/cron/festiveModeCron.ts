/**
 * Festive Mode Scheduler
 * 
 * Cron job that automatically enables/disables festive mode based on configured dates.
 * Runs every hour to check if festive mode should be toggled.
 */

import cron from "node-cron";
import { shippingSettingsService } from "../services/shippingSettingsService";
import { ShippingSettingKeys } from "@shared/shipping-schema";
import { logger } from "../logger";

/**
 * Check if current date is within festive period
 */
function isWithinFestivePeriod(startDate: string, endDate: string): boolean {
    if (!startDate || !endDate) return false;

    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    return now >= start && now <= end;
}

/**
 * Check and update festive mode based on scheduled dates
 */
async function checkFestiveMode(): Promise<void> {
    try {
        const startDate = await shippingSettingsService.getSetting(
            "festive_start_date" as any
        );
        const endDate = await shippingSettingsService.getSetting(
            "festive_end_date" as any
        );

        // Skip if no dates configured
        if (!startDate || !endDate) {
            logger.debug("[FestiveCron] No festive dates configured");
            return;
        }

        const currentFestiveState = await shippingSettingsService.getSetting(
            ShippingSettingKeys.FESTIVE_MODE_ENABLED
        );
        const isFestiveEnabled = currentFestiveState === "true";
        const shouldBeFestive = isWithinFestivePeriod(startDate, endDate);

        // Only update if state needs to change
        if (shouldBeFestive && !isFestiveEnabled) {
            await shippingSettingsService.updateSetting(
                ShippingSettingKeys.FESTIVE_MODE_ENABLED,
                "true",
                0, // System user
                1  // System has highest permission
            );
            logger.info("[FestiveCron] ✅ Festive mode AUTO-ENABLED", {
                startDate,
                endDate,
            });
        } else if (!shouldBeFestive && isFestiveEnabled) {
            // Check if there's an active schedule (dates aren't empty)
            // Only auto-disable if we're past the end date
            const now = new Date();
            const end = new Date(endDate);
            if (now > end) {
                await shippingSettingsService.updateSetting(
                    ShippingSettingKeys.FESTIVE_MODE_ENABLED,
                    "false",
                    0, // System user
                    1  // System has highest permission
                );
                logger.info("[FestiveCron] ❌ Festive mode AUTO-DISABLED (schedule ended)", {
                    endDate,
                });
            }
        }
    } catch (error) {
        logger.error("[FestiveCron] Error checking festive mode:", error);
    }
}

/**
 * Initialize the festive mode cron job
 * Runs every hour at minute 0
 */
export function initFestiveModeCron(): void {
    // Run every hour at :00
    cron.schedule("0 * * * *", async () => {
        logger.debug("[FestiveCron] Running scheduled check...");
        await checkFestiveMode();
    });

    // Also run immediately on startup
    checkFestiveMode();

    logger.info("[FestiveCron] Initialized - checking festive mode every hour");
}

export { checkFestiveMode };
