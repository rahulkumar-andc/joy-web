-- Migration: Coupon Usage Tracking
-- Created: 2026-01-31
-- Purpose: Track individual coupon usage to enforce per-user limits

-- Create coupon_usage table
CREATE TABLE IF NOT EXISTS "coupon_usage" (
    "id" SERIAL PRIMARY KEY,
    "coupon_id" INTEGER NOT NULL REFERENCES "coupons"("id") ON DELETE CASCADE,
    "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "order_id" INTEGER REFERENCES "orders"("id") ON DELETE SET NULL,
    "used_at" TIMESTAMP DEFAULT NOW(),
    CONSTRAINT "unique_user_coupon" UNIQUE("coupon_id", "user_id")
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_coupon_usage_coupon_id" ON "coupon_usage"("coupon_id");
CREATE INDEX IF NOT EXISTS "idx_coupon_usage_user_id" ON "coupon_usage"("user_id");
CREATE INDEX IF NOT EXISTS "idx_coupon_usage_order_id" ON "coupon_usage"("order_id");

-- Comments for documentation
COMMENT ON TABLE "coupon_usage" IS 'Tracks individual coupon usage per user to enforce usage limits';
COMMENT ON COLUMN "coupon_usage"."coupon_id" IS 'Reference to the coupon that was used';
COMMENT ON COLUMN "coupon_usage"."user_id" IS 'User who used the coupon';
COMMENT ON COLUMN "coupon_usage"."order_id" IS 'Order where coupon was applied (NULL if order failed)';
COMMENT ON COLUMN "coupon_usage"."used_at" IS 'Timestamp when coupon was used';
COMMENT ON CONSTRAINT "unique_user_coupon" ON "coupon_usage" IS 'Prevents same user from using same coupon multiple times';
