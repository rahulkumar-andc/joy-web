-- Phase 3: Scale Preparation - Database Optimization Indexes
-- Migration: 0008_performance_indexes.sql
-- Created: 2026-02-01
-- Purpose: Add indexes for common query patterns to improve performance

-- ============================================================================
-- PRODUCTS TABLE INDEXES
-- ============================================================================

-- Index for category filtering (very common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_id 
ON products(category_id);

-- Index for price sorting (used in product listings)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price 
ON products(CAST(price AS DECIMAL));

-- Index for homepage flags (used to filter featured/trending/etc)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_homepage_flags 
ON products(show_on_homepage, is_featured, is_trending, is_best_seller, is_new_arrival);

-- Index for created_at (default sort order)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_created_at 
ON products(created_at DESC);

-- Full-text search index (requires pg_trgm extension)
-- Note: Run this first: CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_trgm 
-- CREATE INDEX IF NOT EXISTS idx_products_name_trgm 
-- ON products USING gin(name gin_trgm_ops);

-- ============================================================================
-- ORDERS TABLE INDEXES
-- ============================================================================

-- Index for user's orders (very common: "my orders" page)
CREATE INDEX IF NOT EXISTS idx_orders_user_id 
ON orders(user_id);

-- Index for order status filtering (admin panel)
CREATE INDEX IF NOT EXISTS idx_orders_status 
ON orders(status);

-- Index for order state (state machine queries)
CREATE INDEX IF NOT EXISTS idx_orders_order_state 
ON orders(order_state);

-- Index for created_at (order listing sorted by date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at 
ON orders(created_at DESC);

-- Composite index for user's orders sorted by date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_id_created_at 
ON orders(user_id, created_at DESC);

-- ============================================================================
-- ORDER ITEMS TABLE INDEXES
-- ============================================================================

-- Index for order items lookup (N+1 prevention)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_id 
ON order_items(order_id);

-- Index for product sales analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_product_id 
ON order_items(product_id);

-- ============================================================================
-- CART ITEMS TABLE INDEXES
-- ============================================================================

-- Index for user's cart items
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_user_id 
ON cart_items(user_id);

-- Index for session-based cart (guest users)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_session_id 
ON cart_items(session_id);

-- Index for updated_at (abandoned cart queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_updated_at 
ON cart_items(updated_at);

-- ============================================================================
-- USERS TABLE INDEXES
-- ============================================================================

-- Email index (already unique but explicit for clarity)
-- Note: This is already created by the unique constraint
-- Just documenting it here for reference

-- Index for role-based queries (admin panel)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role 
ON users(role);

-- Index for lockout queries (security feature)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_lockout_until 
ON users(lockout_until) 
WHERE lockout_until IS NOT NULL;

-- ============================================================================
-- PAYMENTS TABLE INDEXES
-- ============================================================================

-- Index for order payments lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_order_id 
ON payments(order_id);

-- Index for Razorpay ID lookup (webhook handling)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_razorpay_order_id 
ON payments(razorpay_order_id);

-- Index for payment state (reconciliation queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_payment_state 
ON payments(payment_state);

-- Index for reconciliation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_reconciled_at 
ON payments(reconciled_at) 
WHERE reconciled_at IS NULL;

-- ============================================================================
-- REVIEWS TABLE INDEXES
-- ============================================================================

-- Index for product reviews
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_product_id 
ON reviews(product_id);

-- Index for user reviews
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_user_id 
ON reviews(user_id);

-- ============================================================================
-- WISHLIST TABLE INDEXES
-- ============================================================================

-- Index for user's wishlist
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wishlist_items_user_id 
ON wishlist_items(user_id);

-- ============================================================================
-- STOCK RESERVATIONS TABLE INDEXES
-- ============================================================================

-- Index for expiry cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_reservations_expires_at 
ON stock_reservations(expires_at) 
WHERE status = 'active';

-- ============================================================================
-- HERO CAMPAIGNS TABLE INDEXES
-- ============================================================================

-- Index for active campaign queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hero_campaigns_is_active 
ON hero_campaigns(is_active, priority DESC);

-- Index for time-based campaign selection
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hero_campaigns_time_window 
ON hero_campaigns(start_time, end_time);

-- ============================================================================
-- VERIFICATION TOKENS TABLE INDEXES
-- ============================================================================

-- Index for token lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_verification_tokens_identifier 
ON verification_tokens(identifier, type);

-- Index for expired token cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_verification_tokens_expires_at 
ON verification_tokens(expires_at);

-- ============================================================================
-- SESSION TABLE INDEXES (if not already indexed)
-- ============================================================================

-- Index for session expiry cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_expire 
ON session(expire);
