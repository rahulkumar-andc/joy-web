-- Migration: Add COD (Cash on Delivery) Support
-- Created: 2026-02-03

-- Add COD fields to orders table
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS cod_amount DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS cod_collected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cod_collected_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cod_collected_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;

-- Add index for COD orders
CREATE INDEX IF NOT EXISTS idx_orders_cod_collected ON orders(cod_collected) WHERE cod_amount IS NOT NULL;

-- Create comment for documentation
COMMENT ON COLUMN orders.cod_amount IS 'Amount to be collected in cash on delivery';
COMMENT ON COLUMN orders.cod_collected IS 'Whether COD payment has been collected';
COMMENT ON COLUMN orders.cod_collected_at IS 'Timestamp when COD was collected';
COMMENT ON COLUMN orders.cod_collected_by IS 'User ID (admin/delivery person) who collected COD';
COMMENT ON COLUMN orders.delivery_instructions IS 'Special delivery instructions from customer';
