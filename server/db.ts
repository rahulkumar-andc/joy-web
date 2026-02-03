/**
 * Database Connection Manager with Read Replica Support
 * 
 * Implements read/write split for database queries
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { logger } from "./logger";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Primary (write) connection pool
export const writePool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections for writes
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased from 2s to 10s to prevent startup timeouts
  // Production hardening: TCP keepalive to prevent idle connection drops
  keepAlive: true,
  keepAliveInitialDelayMillis: 60000, // Start keepalive probes after 60s idle
});

// Error listener to prevent process crash on unexpected pool errors
writePool.on('error', (err) => {
  logger.error('Unexpected error on idle write pool client', err);
});

// Read replica connection pool (optional)
let readPool: pg.Pool | null = null;

if (process.env.READ_REPLICA_URL) {
  readPool = new Pool({
    connectionString: process.env.READ_REPLICA_URL,
    max: 30, // More connections for reads
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    // Production hardening: TCP keepalive
    keepAlive: true,
    keepAliveInitialDelayMillis: 60000,
  });

  // Error listener for read pool
  readPool.on('error', (err) => {
    logger.error('Unexpected error on idle read pool client', err);
  });

  logger.info('Read replica configured', {
    readReplica: process.env.READ_REPLICA_URL.replace(/:[^:@]+@/, ':****@')
  });
} else {
  logger.warn('READ_REPLICA_URL not set, all queries will use primary database');
}

// Primary database connection (for writes)
export const db = drizzle(writePool, { schema });

// Read replica database connection (for reads)
export const dbRead = readPool
  ? drizzle(readPool, { schema })
  : db; // Fallback to primary if no replica

/**
 * Get database connection for read operations
 * Falls back to primary if replica is not available
 */
export function getReadDB() {
  return dbRead;
}

/**
 * Get database connection for write operations
 */
export function getWriteDB() {
  return db;
}

/**
 * Execute a read query with automatic fallback
 */
export async function executeReadQuery<T>(
  queryFn: (database: typeof db) => Promise<T>,
  options: { usePrimary?: boolean } = {}
): Promise<T> {
  // Force use primary if specified
  if (options.usePrimary || !readPool) {
    return queryFn(db);
  }

  try {
    return await queryFn(dbRead);
  } catch (error) {
    logger.error('Read replica query failed, falling back to primary', { error });
    return queryFn(db);
  }
}

/**
 * Execute a write query
 */
export async function executeWriteQuery<T>(
  queryFn: (database: typeof db) => Promise<T>
): Promise<T> {
  return queryFn(db);
}

/**
 * Check replica lag (requires pg_stat_replication view access)
 */
export async function checkReplicaLag(): Promise<{
  lagMs: number | null;
  isHealthy: boolean;
}> {
  if (!readPool) {
    return { lagMs: null, isHealthy: true };
  }

  try {
    const result = await readPool.query(`
      SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) * 1000 AS lag_ms
    `);

    const lagMs = result.rows[0]?.lag_ms || 0;
    const isHealthy = lagMs < 5000; // Consider unhealthy if lag > 5 seconds

    if (!isHealthy) {
      logger.warn('Read replica has high replication lag', { lagMs });
    }

    return { lagMs, isHealthy };
  } catch (error) {
    logger.error('Failed to check replica lag', { error });
    return { lagMs: null, isHealthy: false };
  }
}

/**
 * Health check for database connections
 */
export async function checkDatabaseHealth(): Promise<{
  primary: boolean;
  replica: boolean;
  replicaLag: number | null;
}> {
  let primaryHealthy = false;
  let replicaHealthy = false;
  let replicaLag: number | null = null;

  // Check primary
  try {
    await writePool.query('SELECT 1');
    primaryHealthy = true;
  } catch (error) {
    logger.error('Primary database health check failed', { error });
  }

  // Check replica
  if (readPool) {
    try {
      await readPool.query('SELECT 1');
      replicaHealthy = true;

      const lagCheck = await checkReplicaLag();
      replicaLag = lagCheck.lagMs;
    } catch (error) {
      logger.error('Read replica health check failed', { error });
    }
  } else {
    replicaHealthy = true; // No replica configured
  }

  return {
    primary: primaryHealthy,
    replica: replicaHealthy,
    replicaLag
  };
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Closing database connections...');
  await writePool.end();
  if (readPool) {
    await readPool.end();
  }
});

// Backward compatibility - keep the old exports
export const pool = writePool;

/**
 * Wraps a promise with a timeout 
 * Prevents "Zombie API Calls" from hanging the process indefinitely
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 5000,
  errorMessage: string = "Operation timed out"
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${errorMessage} (${timeoutMs}ms)`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    // @ts-ignore
    clearTimeout(timeoutId!);
  }
}

/**
 * Non-blocking yield to event loop
 * Allows other I/O events (API requests) to process amidst heavy background work
 */
export function yieldToEventLoop(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}
