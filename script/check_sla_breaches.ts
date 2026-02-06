/**
 * SLA Breach Check Background Job
 * 
 * Run this periodically (every 15 minutes) via cron or scheduler.
 * Detects tickets that have breached SLA and auto-upgrades their priority.
 */

import "dotenv/config";
import { supportRepository } from "../server/repositories/supportRepository";

export async function checkSlaBreaches(): Promise<void> {
    console.log(`[SLA Check] Running at ${new Date().toISOString()}`);

    try {
        const breachedTickets = await supportRepository.getBreachedTickets();

        console.log(`[SLA Check] Found ${breachedTickets.length} breached tickets`);

        for (const ticket of breachedTickets) {
            console.log(`[SLA Check] Processing ticket ${ticket.ticketId}`);

            // 1. Mark SLA as breached
            await supportRepository.markSlaBreached(ticket.id);

            // 2. Auto-upgrade priority
            await supportRepository.upgradePriority(ticket.id, "SLA_BREACH");

            console.log(`[SLA Check] Upgraded priority for ${ticket.ticketId}`);
        }

        console.log(`[SLA Check] Completed`);
    } catch (error) {
        console.error(`[SLA Check] Error:`, error);
    }
}

// Run directly if called as script
checkSlaBreaches()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
