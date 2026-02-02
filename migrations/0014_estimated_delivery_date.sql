-- Migration: Add estimated_delivery_date to orders table
ALTER TABLE orders ADD COLUMN estimated_delivery_date timestamp;
