import { Router, Request, Response } from "express";
import {
    createBackup,
    listBackups,
    cleanupOldBackups,
    startBackupScheduler,
    stopBackupScheduler,
    getBackupSchedulerStatus,
    restoreBackup
} from "../backup/backup-service";
import { logger } from "../logger";

const router = Router();

/**
 * GET /api/admin/backups
 * List all available backups
 */
router.get("/", async (_req: Request, res: Response) => {
    try {
        const backups = await listBackups();

        const formatted = backups.map(b => ({
            filename: b.filename,
            size: `${(b.size / 1024 / 1024).toFixed(2)} MB`,
            sizeBytes: b.size,
            created: b.created,
        }));

        res.json({
            success: true,
            count: backups.length,
            backups: formatted,
        });
    } catch (error) {
        logger.error("List backups error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to list backups",
        });
    }
});

/**
 * POST /api/admin/backups/create
 * Trigger a manual backup
 */
router.post("/create", async (_req: Request, res: Response) => {
    try {
        logger.info("Manual backup triggered");

        const result = await createBackup();

        if (result.success) {
            res.json({
                success: true,
                message: "Backup created successfully",
                filename: result.filename,
                size: `${((result.size || 0) / 1024 / 1024).toFixed(2)} MB`,
                duration: `${result.duration}ms`,
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error,
            });
        }
    } catch (error) {
        logger.error("Create backup error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to create backup",
        });
    }
});

/**
 * POST /api/admin/backups/cleanup
 * Clean up old backups based on retention policy
 */
router.post("/cleanup", async (_req: Request, res: Response) => {
    try {
        const result = await cleanupOldBackups();

        res.json({
            success: true,
            message: `Cleanup completed: ${result.deleted} backups deleted`,
            deleted: result.deleted,
            errors: result.errors,
        });
    } catch (error) {
        logger.error("Cleanup backups error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to cleanup backups",
        });
    }
});

/**
 * GET /api/admin/backups/scheduler
 * Get backup scheduler status
 */
router.get("/scheduler", (_req: Request, res: Response) => {
    const status = getBackupSchedulerStatus();

    res.json({
        success: true,
        ...status,
    });
});

/**
 * POST /api/admin/backups/scheduler/start
 * Start the backup scheduler
 */
router.post("/scheduler/start", (req: Request, res: Response) => {
    const cronExpression = req.body.cronExpression || "0 2 * * *"; // Default: 2 AM daily

    try {
        startBackupScheduler(cronExpression);

        res.json({
            success: true,
            message: "Backup scheduler started",
            cronExpression,
        });
    } catch (error) {
        logger.error("Start scheduler error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to start scheduler",
        });
    }
});

/**
 * POST /api/admin/backups/scheduler/stop
 * Stop the backup scheduler
 */
router.post("/scheduler/stop", (_req: Request, res: Response) => {
    stopBackupScheduler();

    res.json({
        success: true,
        message: "Backup scheduler stopped",
    });
});

/**
 * POST /api/admin/backups/restore/:filename
 * Restore database from backup (DANGEROUS)
 * Requires explicit confirmation
 */
router.post("/restore/:filename", async (req: Request, res: Response) => {
    const filename = req.params.filename as string;
    const { confirm, dropExisting } = req.body;

    // Require explicit confirmation
    if (confirm !== "I_UNDERSTAND_THIS_WILL_OVERWRITE_DATA") {
        return res.status(400).json({
            success: false,
            error: "Restore requires explicit confirmation",
            message: "Send body: { confirm: 'I_UNDERSTAND_THIS_WILL_OVERWRITE_DATA' }",
        });
    }

    logger.warn("Database restore requested", { filename, dropExisting });

    try {
        const result = await restoreBackup(filename, { dropExisting: !!dropExisting });

        if (result.success) {
            res.json({
                success: true,
                message: "Database restored successfully",
                filename,
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error,
            });
        }
    } catch (error) {
        logger.error("Restore backup error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to restore backup",
        });
    }
});

export default router;
