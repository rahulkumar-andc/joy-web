-- Migration: Add Indexes to Audit Logs
-- Created: 2026-02-01
-- Purpose: Optimize audit log queries for production

-- Index for date range queries (most common filter)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
ON audit_logs(created_at DESC);

-- Index for user-specific queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
ON audit_logs(user_id) 
WHERE user_id IS NOT NULL;

-- Index for action type filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
ON audit_logs(action);

-- Composite index for user + date queries (common in analytics)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date 
ON audit_logs(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

-- Index for entity type filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type 
ON audit_logs(entity_type);

-- Analyze table to update statistics
ANALYZE audit_logs;

-- Expected performance improvement:
-- - Date range queries: 10-50x faster
-- - User activity queries: 20-100x faster
-- - Analytics queries: 5-20x faster
