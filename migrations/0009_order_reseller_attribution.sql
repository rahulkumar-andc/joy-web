-- Migration: Add reseller attribution to orders
-- Date: 2026-02-01
-- Phase 5: Order Attribution System

-- Add reseller tracking columns to orders table
ALTER TABLE orders
ADD COLUMN reseller_link_id INTEGER REFERENCES reseller_links(id),
ADD COLUMN referred_by_reseller INTEGER REFERENCES resellers(id);

-- Add indexes for performance
CREATE INDEX idx_orders_reseller_link ON orders(reseller_link_id) WHERE reseller_link_id IS NOT NULL;
CREATE INDEX idx_orders_referred_by_reseller ON orders(referred_by_reseller) WHERE referred_by_reseller IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN orders.reseller_link_id IS 'Reseller link used during checkout';
COMMENT ON COLUMN orders.referred_by_reseller IS 'Reseller who referred this order';
