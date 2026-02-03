-- Migration: Change default moderation status from 'approved' to 'pending'
-- This ensures new products require admin approval before being visible on public pages
-- Date: 2026-02-03

-- Change the default value for moderation_status column
ALTER TABLE products 
ALTER COLUMN moderation_status SET DEFAULT 'pending';

-- Note: This migration does NOT update existing products
-- Existing approved products remain approved
-- Only new products will start with 'pending' status
