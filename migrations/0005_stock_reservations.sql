-- Migration: Stock Reservations System
-- Created: 2026-01-31
-- Purpose: Add stock reservation table to prevent overselling during checkout

CREATE TABLE "stock_reservations" (
  "id" SERIAL PRIMARY KEY,
  "product_id" INTEGER NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "user_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE,
  "session_id" TEXT,
  "quantity" INTEGER NOT NULL,
  "reserved_at" TIMESTAMP DEFAULT NOW(),
  "expires_at" TIMESTAMP NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'released', 'consumed')),
  "order_id" INTEGER REFERENCES "orders"("id") ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX "idx_stock_reservations_product" ON "stock_reservations"("product_id");
CREATE INDEX "idx_stock_reservations_status" ON "stock_reservations"("status");
CREATE INDEX "idx_stock_reservations_expires" ON "stock_reservations"("expires_at");
CREATE INDEX "idx_stock_reservations_user" ON "stock_reservations"("user_id");
CREATE INDEX "idx_stock_reservations_session" ON "stock_reservations"("session_id");

-- Comment
COMMENT ON TABLE "stock_reservations" IS 'Temporary stock locks during checkout to prevent overselling';
COMMENT ON COLUMN "stock_reservations"."expires_at" IS '15 minutes from reserved_at, after which reservation is auto-released';
COMMENT ON COLUMN "stock_reservations"."status" IS 'active: currently reserved | released: timeout or payment failure | consumed: order created successfully';
