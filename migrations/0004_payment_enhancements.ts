import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export async function up(db: NodePgDatabase<any> | any) {
  // === ALTER ORDERS TABLE ===
  await db.execute(sql`
    ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS order_state TEXT NOT NULL DEFAULT 'CREATED',
    ADD COLUMN IF NOT EXISTS state_version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS state_history JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS order_idempotency_key TEXT UNIQUE;
    
    -- Add constraint for order_state values
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_state_check;
    ALTER TABLE orders ADD CONSTRAINT orders_order_state_check 
    CHECK (order_state IN ('CREATED', 'PAYMENT_PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUND_PENDING'));
  `);

  // === ALTER PAYMENTS TABLE ===
  await db.execute(sql`
    ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS payment_state TEXT NOT NULL DEFAULT 'CREATED',
    ADD COLUMN IF NOT EXISTS state_version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS state_history JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS gateway_reference TEXT,
    ADD COLUMN IF NOT EXISTS gateway TEXT,
    ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS reconciled_by TEXT,
    ADD COLUMN IF NOT EXISTS settlement_status TEXT;
    
    -- Add constraints
    ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_state_check;
    ALTER TABLE payments ADD CONSTRAINT payments_payment_state_check
    CHECK (payment_state IN ('CREATED', 'INITIATED', 'ATTEMPTED', 'CAPTURED', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED'));
    
    ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_gateway_check;
    ALTER TABLE payments ADD CONSTRAINT payments_gateway_check
    CHECK (gateway IN ('razorpay', 'stripe'));
    
    ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_settlement_status_check;
    ALTER TABLE payments ADD CONSTRAINT payments_settlement_status_check
    CHECK (settlement_status IN ('PENDING', 'SETTLED', 'DELAYED', 'FAILED'));
  `);

  // === CREATE WEBHOOK_EVENTS TABLE ===
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id SERIAL PRIMARY KEY,
      event_id TEXT NOT NULL UNIQUE,
      event_type TEXT NOT NULL,
      gateway TEXT NOT NULL CHECK (gateway IN ('razorpay', 'stripe')),
      payload JSONB NOT NULL,
      signature TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'DUPLICATE')),
      processed_at TIMESTAMP,
      error_message TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
    CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
    CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);
  `);

  // === CREATE IDEMPOTENCY_KEYS TABLE ===
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      user_id INTEGER REFERENCES users(id),
      endpoint TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      response JSONB,
      status_code INTEGER,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(key);
    CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);
  `);

  // === CREATE PAYMENT_RECONCILIATION TABLE ===
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payment_reconciliation (
      id SERIAL PRIMARY KEY,
      payment_id INTEGER REFERENCES payments(id),
      gateway_payment_id TEXT NOT NULL,
      expected_amount DECIMAL NOT NULL,
      actual_amount DECIMAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('MATCHED', 'AMOUNT_MISMATCH', 'MISSING_IN_DB', 'MISSING_IN_GATEWAY', 'DUPLICATE', 'MANUAL_OVERRIDE')),
      resolved_at TIMESTAMP,
      resolved_by INTEGER REFERENCES users(id),
      admin_note TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_status ON payment_reconciliation(status);
    CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_payment_id ON payment_reconciliation(payment_id);
  `);

  // === CREATE REFUND_TRACKING TABLE ===
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS refund_tracking (
      id SERIAL PRIMARY KEY,
      refund_id INTEGER NOT NULL REFERENCES refunds(id),
      gateway_refund_id TEXT,
      gateway TEXT CHECK (gateway IN ('razorpay', 'stripe')),
      refund_state TEXT NOT NULL DEFAULT 'INITIATED' CHECK (refund_state IN ('INITIATED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED')),
      settlement_status TEXT DEFAULT 'PENDING' CHECK (settlement_status IN ('PENDING', 'IN_TRANSIT', 'SETTLED', 'FAILED')),
      estimated_settlement_date TIMESTAMP,
      actual_settlement_date TIMESTAMP,
      error_code TEXT,
      error_message TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_refund_tracking_refund_id ON refund_tracking(refund_id);
    CREATE INDEX IF NOT EXISTS idx_refund_tracking_refund_state ON refund_tracking(refund_state);
  `);

  // === CREATE PAYMENT_STATE_TRANSITIONS TABLE ===
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payment_state_transitions (
      id SERIAL PRIMARY KEY,
      payment_id INTEGER NOT NULL REFERENCES payments(id),
      from_state TEXT NOT NULL,
      to_state TEXT NOT NULL,
      triggered_by TEXT NOT NULL,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_payment_state_transitions_payment_id ON payment_state_transitions(payment_id);
    CREATE INDEX IF NOT EXISTS idx_payment_state_transitions_created_at ON payment_state_transitions(created_at);
  `);

  // === CREATE ORDER_STATE_TRANSITIONS TABLE ===
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS order_state_transitions (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      from_state TEXT NOT NULL,
      to_state TEXT NOT NULL,
      triggered_by TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_order_state_transitions_order_id ON order_state_transitions(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_state_transitions_created_at ON order_state_transitions(created_at);
  `);

  console.log("✅ Payment system enhancements migration completed successfully");
}

export async function down(db: NodePgDatabase<any> | any) {
  // Drop new tables
  await db.execute(sql`DROP TABLE IF EXISTS order_state_transitions CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS payment_state_transitions CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS refund_tracking CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS payment_reconciliation CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS idempotency_keys CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS webhook_events CASCADE;`);

  // Remove new columns from payments
  await db.execute(sql`
    ALTER TABLE payments
    DROP COLUMN IF EXISTS payment_state,
    DROP COLUMN IF EXISTS state_version,
    DROP COLUMN IF EXISTS state_history,
    DROP COLUMN IF EXISTS idempotency_key,
    DROP COLUMN IF EXISTS gateway_reference,
    DROP COLUMN IF EXISTS gateway,
    DROP COLUMN IF EXISTS attempt_count,
    DROP COLUMN IF EXISTS last_attempt_at,
    DROP COLUMN IF EXISTS expires_at,
    DROP COLUMN IF EXISTS reconciled_at,
    DROP COLUMN IF EXISTS reconciled_by,
    DROP COLUMN IF EXISTS settlement_status;
  `);

  // Remove new columns from orders
  await db.execute(sql`
    ALTER TABLE orders
    DROP COLUMN IF EXISTS order_state,
    DROP COLUMN IF EXISTS state_version,
    DROP COLUMN IF EXISTS state_history,
    DROP COLUMN IF EXISTS order_idempotency_key;
  `);

  console.log("✅ Payment system enhancements migration rolled back successfully");
}
