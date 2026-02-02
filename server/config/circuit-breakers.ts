import CircuitBreaker from 'opossum';
import { logger } from "../logger";

export interface CircuitBreakerOptions {
    timeout: number; // Request timeout (ms)
    errorThresholdPercentage: number; // % failures to open circuit
    resetTimeout: number; // Time before trying HALF_OPEN (ms)
    rollingCountTimeout: number; // Window for counting errors (ms)
    rollingCountBuckets: number; // Number of buckets in window
    name: string; // Circuit name for monitoring
}

export const DEFAULT_CIRCUIT_OPTIONS: Omit<CircuitBreakerOptions, 'name'> = {
    timeout: 5000, // 5 seconds
    errorThresholdPercentage: 50, // Open if >50% fail
    resetTimeout: 30000, // Try recovery after 30s
    rollingCountTimeout: 10000, // 10s window
    rollingCountBuckets: 10, // 10 buckets of 1s each
};

export const CIRCUIT_OPTIONS = {
    PAYMENT: {
        ...DEFAULT_CIRCUIT_OPTIONS,
        timeout: 10000, // Payment can take longer
        errorThresholdPercentage: 25, // More sensitive
        name: 'razorpay',
    },
    EMAIL: {
        ...DEFAULT_CIRCUIT_OPTIONS,
        timeout: 8000,
        errorThresholdPercentage: 50,
        name: 'email',
    },
    SEARCH: {
        ...DEFAULT_CIRCUIT_OPTIONS,
        timeout: 3000, // Search should be fast
        errorThresholdPercentage: 60,
        name: 'search',
    },
    PUSH: {
        ...DEFAULT_CIRCUIT_OPTIONS,
        timeout: 5000,
        errorThresholdPercentage: 70, // Less critical
        name: 'push',
    },
};

/**
 * Create and configure a circuit breaker
 */
export function createCircuitBreaker<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: CircuitBreakerOptions,
    fallback?: (...args: T) => Promise<R>
): CircuitBreaker<T, R> {
    const breaker = new CircuitBreaker(fn, options);

    // Logging
    breaker.on('open', () => {
        logger.error(`Circuit breaker OPENED: ${options.name}`);
    });

    breaker.on('halfOpen', () => {
        logger.warn(`Circuit breaker HALF_OPEN: ${options.name}`);
    });

    breaker.on('close', () => {
        logger.info(`Circuit breaker CLOSED: ${options.name}`);
    });

    breaker.on('failure', (error) => {
        logger.warn(`Circuit breaker failure: ${options.name}`, { error: error.message });
    });

    breaker.on('timeout', () => {
        logger.warn(`Circuit breaker timeout: ${options.name}`);
    });

    // Fallback
    if (fallback) {
        breaker.fallback(fallback);
    }

    return breaker;
}

/**
 * Get circuit breaker status for monitoring
 */
export function getCircuitStats(breaker: CircuitBreaker<any, any>) {
    const stats = breaker.stats;
    return {
        state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
        failures: stats.failures,
        successes: stats.successes,
        timeouts: stats.timeouts,
        fallbacks: stats.fallbacks,
        latencyMean: stats.latencyMean,
        percentiles: stats.percentiles,
    };
}
