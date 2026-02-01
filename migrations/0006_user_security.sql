-- Migration: User Security Enhancements
-- Created: 2026-01-31
-- Purpose: Add account lockout and session tracking columns

-- Add security columns to users table
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS "lockout_until" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "last_password_change_at" TIMESTAMP;

-- Create index for lockout queries (performance)
CREATE INDEX IF NOT EXISTS "idx_users_lockout" ON "users"("lockout_until");

-- Comments for documentation
COMMENT ON COLUMN "users"."failed_login_attempts" IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN "users"."lockout_until" IS 'Account locked until this timestamp (30 minutes after 5th failed attempt)';
COMMENT ON COLUMN "users"."last_login_at" IS 'Timestamp of most recent successful login';
COMMENT ON COLUMN "users"."last_password_change_at" IS 'Timestamp of most recent password change (for session invalidation)';
