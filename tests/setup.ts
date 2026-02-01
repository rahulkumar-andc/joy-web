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
});

afterEach(async () => {
    // Clean up database between tests to ensure isolation
    if (!pool) {
        const { pool: p } = await import('../server/db');
        pool = p;
    }
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
});

afterAll(async () => {
    console.log('🧹 Cleaning up test database...');
    if (pool) {
        await pool.end();
    }
});
