
import { logger } from "../logger";

/**
 * Measure the execution time of an asynchronous function
 * @param name Name of the operation to log
 * @param fn The async function to execute
 * @param thresholdMs Log a warning if execution exceeds this threshold (default: 1000ms)
 */
export async function measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    thresholdMs: number = 1000
): Promise<T> {
    const start = performance.now();
    try {
        const result = await fn();
        const duration = performance.now() - start;

        if (duration > thresholdMs) {
            logger.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms`, {
                operation: name,
                durationMs: duration,
                thresholdMs
            });
        } else {
            logger.debug(`[Performance] ${name} took ${duration.toFixed(2)}ms`, {
                operation: name,
                durationMs: duration
            });
        }

        return result;
    } catch (error) {
        const duration = performance.now() - start;
        logger.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms`, {
            operation: name,
            durationMs: duration,
            error: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
}

/**
 * decorator-like wrapper for class methods (if we wanted to use it that way,
 * but simple wrapping is often easier in functional/service patterns)
 */
