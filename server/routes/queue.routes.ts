import { Router, Request, Response } from "express";
import { checkQueueHealth, getQueueStats } from "../queue";
import { logger } from "../logger";

const router = Router();

/**
 * GET /api/admin/queues/health
 * Check queue system health
 */
router.get("/health", async (_req: Request, res: Response) => {
    try {
        const { healthy, stats } = await checkQueueHealth();

        res.json({
            success: true,
            healthy,
            stats,
        });
    } catch (error) {
        logger.error("Queue health check error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to check queue health",
        });
    }
});

/**
 * GET /api/admin/queues/stats
 * Get detailed queue statistics
 */
router.get("/stats", async (_req: Request, res: Response) => {
    try {
        const stats = await getQueueStats();

        // Calculate totals
        const totals = stats.reduce(
            (acc, queue) => ({
                totalWaiting: acc.totalWaiting + Math.max(0, queue.waiting),
                totalActive: acc.totalActive + Math.max(0, queue.active),
                totalCompleted: acc.totalCompleted + Math.max(0, queue.completed),
                totalFailed: acc.totalFailed + Math.max(0, queue.failed),
            }),
            { totalWaiting: 0, totalActive: 0, totalCompleted: 0, totalFailed: 0 }
        );

        res.json({
            success: true,
            queues: stats,
            totals,
        });
    } catch (error) {
        logger.error("Queue stats error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get queue stats",
        });
    }
});

export default router;
