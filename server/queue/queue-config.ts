import { Queue, Worker, QueueEvents, Job } from "bullmq";
import IORedis, { RedisOptions } from "ioredis";
import { logger } from "../logger";

// ============================================================================
// REDIS CONNECTION FOR BULLMQ
// ============================================================================

/**
 * Get Redis connection options from environment
 * BullMQ requires a native Redis connection (ioredis), not HTTP-based Upstash
 * 
 * Options:
 * 1. QUEUE_REDIS_URL - Separate Redis for queues
 * 2. REDIS_URL - Standard Redis connection string
 * 3. Upstash ioredis mode (if using their native endpoint)
 */
function getRedisOptions(): RedisOptions {
    const redisUrl = process.env.QUEUE_REDIS_URL || process.env.REDIS_URL;

    if (redisUrl) {
        return {
            host: new URL(redisUrl).hostname,
            port: parseInt(new URL(redisUrl).port || "6379"),
            password: new URL(redisUrl).password || undefined,
            tls: redisUrl.startsWith("rediss://") ? {} : undefined,
            maxRetriesPerRequest: null, // Required by BullMQ
            enableReadyCheck: false, // Required by BullMQ
        };
    }

    // Fallback to localhost for development
    return {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false, // Required by BullMQ
    };
}

// Shared connection for all queues
let sharedConnection: IORedis | null = null;

/**
 * Get or create shared Redis connection for BullMQ
 */
export function getSharedConnection(): IORedis {
    if (!sharedConnection) {
        const options = getRedisOptions();
        sharedConnection = new IORedis(options);

        sharedConnection.on("connect", () => {
            logger.info("📬 BullMQ Redis connected");
        });

        sharedConnection.on("error", (err) => {
            logger.error("BullMQ Redis error:", err);
        });
    }

    return sharedConnection;
}

// ============================================================================
// QUEUE DEFINITIONS
// ============================================================================

export const QUEUE_NAMES = {
    EMAIL: "email-queue",
    NOTIFICATION: "notification-queue",
    SEARCH_SYNC: "search-sync-queue",
} as const;

// Queue instances (lazy initialization)
let emailQueue: Queue | null = null;
let notificationQueue: Queue | null = null;
let searchSyncQueue: Queue | null = null;

/**
 * Get email queue instance
 */
export function getEmailQueue(): Queue {
    if (!emailQueue) {
        emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
            connection: getSharedConnection(),
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 1000, // 1s, 2s, 4s
                },
                removeOnComplete: {
                    age: 3600, // Keep completed jobs for 1 hour
                    count: 1000, // Keep last 1000 jobs
                },
                removeOnFail: {
                    age: 86400, // Keep failed jobs for 24 hours
                },
            },
        });
        logger.info(`📬 Queue initialized: ${QUEUE_NAMES.EMAIL}`);
    }
    return emailQueue;
}

/**
 * Get notification queue instance
 */
export function getNotificationQueue(): Queue {
    if (!notificationQueue) {
        notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATION, {
            connection: getSharedConnection(),
            defaultJobOptions: {
                attempts: 2,
                backoff: {
                    type: "exponential",
                    delay: 500,
                },
                removeOnComplete: {
                    age: 1800, // 30 minutes
                    count: 500,
                },
                removeOnFail: {
                    age: 43200, // 12 hours
                },
            },
        });
        logger.info(`📬 Queue initialized: ${QUEUE_NAMES.NOTIFICATION}`);
    }
    return notificationQueue;
}

/**
 * Get search sync queue instance
 */
export function getSearchSyncQueue(): Queue {
    if (!searchSyncQueue) {
        searchSyncQueue = new Queue(QUEUE_NAMES.SEARCH_SYNC, {
            connection: getSharedConnection(),
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 2000,
                },
                removeOnComplete: {
                    age: 600, // 10 minutes
                    count: 100,
                },
                removeOnFail: {
                    age: 3600, // 1 hour
                },
            },
        });
        logger.info(`📬 Queue initialized: ${QUEUE_NAMES.SEARCH_SYNC}`);
    }
    return searchSyncQueue;
}

// ============================================================================
// QUEUE HEALTH & MONITORING
// ============================================================================

export interface QueueStats {
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
}

/**
 * Get stats for all queues
 */
export async function getQueueStats(): Promise<QueueStats[]> {
    const queues = [
        { name: QUEUE_NAMES.EMAIL, queue: getEmailQueue() },
        { name: QUEUE_NAMES.NOTIFICATION, queue: getNotificationQueue() },
        { name: QUEUE_NAMES.SEARCH_SYNC, queue: getSearchSyncQueue() },
    ];

    const stats: QueueStats[] = [];

    for (const { name, queue } of queues) {
        try {
            const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
                queue.getWaiting(),
                queue.getActive(),
                queue.getCompleted(),
                queue.getFailed(),
                queue.getDelayed(),
                queue.isPaused(),
            ]);

            stats.push({
                name,
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                delayed: delayed.length,
                paused: paused ? 1 : 0,
            });
        } catch (error) {
            logger.error(`Failed to get stats for queue ${name}:`, error);
            stats.push({
                name,
                waiting: -1,
                active: -1,
                completed: -1,
                failed: -1,
                delayed: -1,
                paused: -1,
            });
        }
    }

    return stats;
}

/**
 * Check if queue system is healthy
 */
export async function isQueueHealthy(): Promise<boolean> {
    try {
        const connection = getSharedConnection();
        await connection.ping();
        return true;
    } catch (error) {
        logger.error("Queue health check failed:", error);
        return false;
    }
}

/**
 * Graceful shutdown of all queues
 */
export async function shutdownQueues(): Promise<void> {
    logger.info("Shutting down queue workers...");

    const queues = [emailQueue, notificationQueue, searchSyncQueue].filter(Boolean);

    await Promise.all(
        queues.map(async (queue) => {
            if (queue) {
                await queue.close();
            }
        })
    );

    if (sharedConnection) {
        await sharedConnection.quit();
        sharedConnection = null;
    }

    logger.info("Queue system shutdown complete");
}
