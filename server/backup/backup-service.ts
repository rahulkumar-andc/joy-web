import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { logger } from "../logger";

const execAsync = promisify(exec);

// ============================================================================
// BACKUP CONFIGURATION
// ============================================================================

interface BackupConfig {
    // Database connection
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;

    // Backup settings
    backupDir: string;
    retentionDays: number;
    compressionEnabled: boolean;

    // Cloud storage (optional)
    s3Bucket?: string;
    s3Region?: string;
}

function getBackupConfig(): BackupConfig {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error("DATABASE_URL environment variable is required");
    }

    const url = new URL(databaseUrl);

    return {
        host: url.hostname,
        port: parseInt(url.port || "5432"),
        database: url.pathname.slice(1), // Remove leading /
        username: url.username,
        password: url.password,
        backupDir: process.env.BACKUP_DIR || "./backups",
        retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || "30"),
        compressionEnabled: process.env.BACKUP_COMPRESSION !== "false",
        s3Bucket: process.env.BACKUP_S3_BUCKET,
        s3Region: process.env.BACKUP_S3_REGION || "us-east-1",
    };
}

// ============================================================================
// BACKUP FUNCTIONS
// ============================================================================

/**
 * Generate backup filename with timestamp
 */
function getBackupFilename(database: string, compressed: boolean): string {
    const timestamp = new Date().toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .slice(0, 19);
    const extension = compressed ? "sql.gz" : "sql";
    return `${database}_${timestamp}.${extension}`;
}

/**
 * Ensure backup directory exists
 */
async function ensureBackupDir(backupDir: string): Promise<void> {
    try {
        await fs.mkdir(backupDir, { recursive: true });
    } catch (error) {
        logger.error("Failed to create backup directory:", error);
        throw error;
    }
}

/**
 * Create a PostgreSQL database backup
 */
export async function createBackup(): Promise<{
    success: boolean;
    filename?: string;
    path?: string;
    size?: number;
    duration?: number;
    error?: string;
}> {
    const startTime = Date.now();
    const config = getBackupConfig();

    logger.info("🗄️ Starting database backup...", {
        database: config.database,
        host: config.host,
    });

    try {
        await ensureBackupDir(config.backupDir);

        const filename = getBackupFilename(config.database, config.compressionEnabled);
        const backupPath = path.join(config.backupDir, filename);

        // Set PGPASSWORD environment variable for pg_dump
        const env = {
            ...process.env,
            PGPASSWORD: config.password,
        };

        // Build pg_dump command
        let command = `pg_dump -h ${config.host} -p ${config.port} -U ${config.username} -d ${config.database} --format=plain --no-owner --no-acl`;

        if (config.compressionEnabled) {
            command += ` | gzip > "${backupPath}"`;
        } else {
            command += ` > "${backupPath}"`;
        }

        // Execute backup
        await execAsync(command, { env, shell: "/bin/bash" });

        // Get file stats
        const stats = await fs.stat(backupPath);
        const duration = Date.now() - startTime;

        logger.info("🗄️ Database backup completed", {
            filename,
            size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
            duration: `${duration}ms`,
        });

        return {
            success: true,
            filename,
            path: backupPath,
            size: stats.size,
            duration,
        };
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        logger.error("🗄️ Database backup failed", {
            error: errorMessage,
            duration: `${duration}ms`,
        });

        return {
            success: false,
            error: errorMessage,
            duration,
        };
    }
}

/**
 * Clean up old backups based on retention policy
 */
export async function cleanupOldBackups(): Promise<{
    deleted: number;
    errors: number;
}> {
    const config = getBackupConfig();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

    logger.info("🗑️ Cleaning up old backups...", {
        retentionDays: config.retentionDays,
        cutoffDate: cutoffDate.toISOString(),
    });

    let deleted = 0;
    let errors = 0;

    try {
        const files = await fs.readdir(config.backupDir);

        for (const file of files) {
            // Match backup file pattern: database_YYYY-MM-DD_HH-MM-SS.sql(.gz)
            const match = file.match(/^(.+)_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})\.sql(\.gz)?$/);

            if (!match) continue;

            const dateStr = match[2];
            const timeStr = match[3].replace(/-/g, ":");
            const fileDate = new Date(`${dateStr}T${timeStr}Z`);

            if (fileDate < cutoffDate) {
                const filePath = path.join(config.backupDir, file);
                try {
                    await fs.unlink(filePath);
                    deleted++;
                    logger.debug(`Deleted old backup: ${file}`);
                } catch (err) {
                    errors++;
                    logger.error(`Failed to delete backup: ${file}`, err);
                }
            }
        }

        logger.info("🗑️ Backup cleanup completed", { deleted, errors });
    } catch (error) {
        logger.error("Backup cleanup failed:", error);
    }

    return { deleted, errors };
}

/**
 * List existing backups
 */
export async function listBackups(): Promise<Array<{
    filename: string;
    size: number;
    created: Date;
}>> {
    const config = getBackupConfig();
    const backups: Array<{ filename: string; size: number; created: Date }> = [];

    try {
        const files = await fs.readdir(config.backupDir);

        for (const file of files) {
            if (!file.endsWith(".sql") && !file.endsWith(".sql.gz")) continue;

            const filePath = path.join(config.backupDir, file);
            const stats = await fs.stat(filePath);

            backups.push({
                filename: file,
                size: stats.size,
                created: stats.birthtime,
            });
        }

        // Sort by creation date (newest first)
        backups.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
        logger.error("Failed to list backups:", error);
    }

    return backups;
}

/**
 * Restore database from backup (DANGEROUS - use with caution)
 */
export async function restoreBackup(
    backupFilename: string,
    options?: { dropExisting?: boolean }
): Promise<{ success: boolean; error?: string }> {
    const config = getBackupConfig();
    const backupPath = path.join(config.backupDir, backupFilename);

    logger.warn("🗄️ Starting database restore...", {
        filename: backupFilename,
        dropExisting: options?.dropExisting,
    });

    try {
        // Check if backup file exists
        await fs.access(backupPath);

        const env = {
            ...process.env,
            PGPASSWORD: config.password,
        };

        // Determine if file is compressed
        const isCompressed = backupFilename.endsWith(".gz");

        // Build psql command
        let command: string;
        if (isCompressed) {
            command = `gunzip -c "${backupPath}" | psql -h ${config.host} -p ${config.port} -U ${config.username} -d ${config.database}`;
        } else {
            command = `psql -h ${config.host} -p ${config.port} -U ${config.username} -d ${config.database} < "${backupPath}"`;
        }

        if (options?.dropExisting) {
            // First, drop all tables (be very careful with this!)
            const dropCommand = `psql -h ${config.host} -p ${config.port} -U ${config.username} -d ${config.database} -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`;
            await execAsync(dropCommand, { env, shell: "/bin/bash" });
        }

        await execAsync(command, { env, shell: "/bin/bash" });

        logger.info("🗄️ Database restore completed", { filename: backupFilename });

        return { success: true };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("🗄️ Database restore failed", { error: errorMessage });
        return { success: false, error: errorMessage };
    }
}

// ============================================================================
// SCHEDULED BACKUP JOB
// ============================================================================

import cron, { ScheduledTask } from "node-cron";

let backupJob: ScheduledTask | null = null;

/**
 * Start automated backup scheduler
 * Default: Daily at 2:00 AM
 */
export function startBackupScheduler(cronExpression: string = "0 2 * * *"): void {
    if (backupJob) {
        logger.warn("Backup scheduler already running");
        return;
    }

    backupJob = cron.schedule(cronExpression, async () => {
        logger.info("🗄️ Running scheduled backup...");

        // Create backup
        const result = await createBackup();

        if (result.success) {
            // Clean up old backups after successful backup
            await cleanupOldBackups();
        } else {
            // TODO: Send alert notification
            logger.error("Scheduled backup failed - consider sending alert");
        }
    });

    logger.info("🗄️ Backup scheduler started", { cronExpression });
}

/**
 * Stop the backup scheduler
 */
export function stopBackupScheduler(): void {
    if (backupJob) {
        backupJob.stop();
        backupJob = null;
        logger.info("Backup scheduler stopped");
    }
}

/**
 * Get backup scheduler status
 */
export function getBackupSchedulerStatus(): {
    running: boolean;
    nextRun?: Date;
} {
    if (!backupJob) {
        return { running: false };
    }

    return {
        running: true,
        // node-cron doesn't expose next run time directly
        // In production, consider using a more feature-rich scheduler
    };
}
