import { db } from "../../db";
import { campaignSchedules, heroCampaigns, type CampaignSchedule, type InsertCampaignSchedule } from "@shared/schema";
import { eq, lte, and, sql } from "drizzle-orm";
import { heroCampaignRepository } from "./repository";

// Configuration
const SCHEDULER_INTERVAL_MS = 60000; // Check every minute
const MAX_EXECUTION_TIME_MS = 30000; // Hard timeout for job execution

/**
 * Campaign Scheduler (Resilient)
 * Handles automatic campaign activation and deactivation
 * Uses recursive setTimeout to prevent event loop blocking and overlapping jobs
 */
export class CampaignScheduler {
    private timeoutId: NodeJS.Timeout | null = null;
    private isProcessing: boolean = false;
    private isRunning: boolean = false;

    /**
     * Start the scheduler
     */
    start(): void {
        if (this.isRunning) {
            console.log("[CampaignScheduler] Aleady running");
            return;
        }

        console.log("[CampaignScheduler] Starting resilient scheduler...");
        this.isRunning = true;

        // Initial run
        this.runLoop();
    }

    /**
     * Stop the scheduler
     */
    stop(): void {
        this.isRunning = false;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        console.log("[CampaignScheduler] Scheduler stopped");
    }

    /**
     * Main execution loop with guards
     */
    private async runLoop(): Promise<void> {
        if (!this.isRunning) return;

        // Prevent overlap (Idempotency Lock)
        if (this.isProcessing) {
            console.warn("[CampaignScheduler] Previous job still running, skipping this tick to prevent overlap.");
            // Reschedule check in 10 seconds rather than full interval
            this.scheduleNext(10000);
            return;
        }

        this.isProcessing = true;

        // Circuit Breaker: Timeout Promise
        const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(() => reject(new Error("Scheduler Job Timed Out")), MAX_EXECUTION_TIME_MS);
        });

        try {
            // Race the job against the timeout
            await Promise.race([
                this.processSchedules(),
                timeoutPromise
            ]);
        } catch (error) {
            console.error("[CampaignScheduler] Job failed or timed out:", error);
        } finally {
            this.isProcessing = false;
            // Always schedule next run, even if this one failed
            this.scheduleNext();
        }
    }

    /**
     * Schedule the next execution
     */
    private scheduleNext(delay: number = SCHEDULER_INTERVAL_MS): void {
        if (!this.isRunning) return;

        if (this.timeoutId) clearTimeout(this.timeoutId);

        this.timeoutId = setTimeout(() => {
            this.runLoop();
        }, delay);
    }

    /**
     * Process all pending schedules
     */
    async processSchedules(): Promise<void> {
        const now = new Date();

        try {
            // 1. Activate pending campaigns that should be active now
            await this.activatePendingCampaigns(now);

            // 2. Deactivate campaigns that have passed their deactivation time
            await this.deactivateExpiredCampaigns(now);

            // 3. Handle recurring campaigns
            await this.processRecurringCampaigns(now);

        } catch (error) {
            console.error("[CampaignScheduler] Error processing schedules:", error);
            // Re-throw to trigger circuit breaker if needed, or swallow to allow partial success
            throw error;
        }
    }

    /**
     * Activate campaigns scheduled to start
     */
    private async activatePendingCampaigns(now: Date): Promise<void> {
        // Safe DB Call
        const pendingSchedules = await db
            .select()
            .from(campaignSchedules)
            .where(
                and(
                    eq(campaignSchedules.status, "pending"),
                    lte(campaignSchedules.activateAt, now)
                )
            );

        for (const schedule of pendingSchedules) {
            try {
                // Activate the campaign
                await heroCampaignRepository.toggleActive(schedule.campaignId, true);

                // Update schedule status
                await db
                    .update(campaignSchedules)
                    .set({
                        status: "activated",
                        lastProcessedAt: now
                    })
                    .where(eq(campaignSchedules.id, schedule.id));

                console.log(`[CampaignScheduler] Activated campaign ${schedule.campaignId}`);
            } catch (err) {
                console.error(`[CampaignScheduler] Failed to activate campaign ${schedule.campaignId}`, err);
            }
        }
    }

    /**
     * Deactivate campaigns past their end time
     */
    private async deactivateExpiredCampaigns(now: Date): Promise<void> {
        const activeSchedules = await db
            .select()
            .from(campaignSchedules)
            .where(
                and(
                    eq(campaignSchedules.status, "activated"),
                    lte(campaignSchedules.deactivateAt, now)
                )
            );

        for (const schedule of activeSchedules) {
            if (!schedule.deactivateAt) continue;

            try {
                // Deactivate the campaign
                await heroCampaignRepository.toggleActive(schedule.campaignId, false);

                // Update schedule status
                await db
                    .update(campaignSchedules)
                    .set({
                        status: "completed",
                        lastProcessedAt: now
                    })
                    .where(eq(campaignSchedules.id, schedule.id));

                console.log(`[CampaignScheduler] Deactivated campaign ${schedule.campaignId}`);
            } catch (err) {
                console.error(`[CampaignScheduler] Failed to deactivate campaign ${schedule.campaignId}`, err);
            }
        }
    }

    /**
     * Process recurring campaigns
     */
    private async processRecurringCampaigns(now: Date): Promise<void> {
        const completedRecurring = await db
            .select()
            .from(campaignSchedules)
            .where(
                and(
                    eq(campaignSchedules.status, "completed"),
                    sql`${campaignSchedules.recurrenceType} != 'none'`
                )
            );

        for (const schedule of completedRecurring) {
            try {
                // Check if past the recurrence end date
                if (schedule.recurrenceEndDate && schedule.recurrenceEndDate < now) {
                    continue; // Don't reschedule
                }

                // Calculate next activation time
                const nextActivation = this.calculateNextActivation(schedule);

                if (nextActivation) {
                    // Calculate next deactivation (same duration as original)
                    let nextDeactivation: Date | null = null;
                    if (schedule.deactivateAt) {
                        const duration = schedule.deactivateAt.getTime() - schedule.activateAt.getTime();
                        nextDeactivation = new Date(nextActivation.getTime() + duration);
                    }

                    // Create new schedule entry
                    await db.insert(campaignSchedules).values({
                        campaignId: schedule.campaignId,
                        activateAt: nextActivation,
                        deactivateAt: nextDeactivation,
                        recurrenceType: schedule.recurrenceType,
                        recurrenceEndDate: schedule.recurrenceEndDate,
                        status: "pending",
                    });

                    console.log(`[CampaignScheduler] Scheduled recurring campaign ${schedule.campaignId} for ${nextActivation.toISOString()}`);
                }
            } catch (err) {
                console.error(`[CampaignScheduler] Failed to reschedule recurring campaign ${schedule.campaignId}`, err);
            }
        }
    }

    /**
     * Calculate next activation time based on recurrence type
     */
    private calculateNextActivation(schedule: CampaignSchedule): Date | null {
        const lastActivation = schedule.activateAt;
        const next = new Date(lastActivation);

        switch (schedule.recurrenceType) {
            case "daily":
                next.setDate(next.getDate() + 1);
                break;
            case "weekly":
                next.setDate(next.getDate() + 7);
                break;
            case "monthly":
                next.setMonth(next.getMonth() + 1);
                break;
            default:
                return null;
        }

        return next;
    }

    /**
     * Schedule a campaign
     */
    async scheduleCampaign(data: InsertCampaignSchedule): Promise<CampaignSchedule> {
        const [schedule] = await db
            .insert(campaignSchedules)
            .values(data)
            .returning();
        return schedule;
    }

    /**
     * Cancel a schedule
     */
    async cancelSchedule(scheduleId: number): Promise<void> {
        await db
            .update(campaignSchedules)
            .set({ status: "cancelled" })
            .where(eq(campaignSchedules.id, scheduleId));
    }

    /**
     * Get all schedules for a campaign
     */
    async getCampaignSchedules(campaignId: number): Promise<CampaignSchedule[]> {
        return db
            .select()
            .from(campaignSchedules)
            .where(eq(campaignSchedules.campaignId, campaignId));
    }

    /**
     * Get all pending schedules
     */
    async getPendingSchedules(): Promise<CampaignSchedule[]> {
        return db
            .select()
            .from(campaignSchedules)
            .where(eq(campaignSchedules.status, "pending"));
    }
}

export const campaignScheduler = new CampaignScheduler();
