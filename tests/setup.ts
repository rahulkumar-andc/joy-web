/**
 * Test Setup
 * Configures test database and global test utilities
 */

import "dotenv/config";
import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Mock DOMPurify to avoid ESM/JSDOM issues in node environment
vi.mock('isomorphic-dompurify', () => ({
    default: {
        sanitize: (str: string) => str
    }
}));

// Use test database URL from environment (set in vitest.config.ts)
let pool: any;

beforeAll(async () => {
    console.log('🧪 Setting up test database...');
    const dbModule = await import('../server/db');
    pool = dbModule.pool;
    // Initial cleanup to start with clean state
    await runCleanup();
});

// Cleanup function to clear all test data
const runCleanup = async () => {
    if (!pool) {
        const { pool: p } = await import('../server/db');
        pool = p;
    }
    try {
        await pool.query(`
            TRUNCATE 
                stock_reservations, 
                cart_items, 
                wishlist_items, 
                order_items, 
                orders, 
                products, 
                categories, 
                users, 
                coupons, 
                coupon_usage,
                idempotency_keys,
                webhook_events,
                refund_tracking,
                payment_state_transitions,
                order_state_transitions,
                payment_reconciliation,
                payments,
                refunds
            RESTART IDENTITY CASCADE
        `);
    } catch (e) {
        // Ignore errors if tables don't exist
    }
};

afterEach(async () => {
    // Clean up after each test to ensure isolation
    await runCleanup();
});

afterAll(async () => {
    console.log('🧹 Cleaning up test database...');
    await runCleanup();
    if (pool) {
        await pool.end();
    }
});
