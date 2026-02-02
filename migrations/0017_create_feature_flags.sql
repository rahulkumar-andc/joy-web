-- Migration: Create Feature Flags Table
-- Created: 2026-02-03
-- Description: Add feature flags system for dynamic feature toggling

CREATE TABLE feature_flags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false NOT NULL,
  
  -- Rollout strategy
  rollout_percentage INTEGER DEFAULT 0 NOT NULL CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  
  -- User targeting
  user_ids INTEGER[],
  user_roles TEXT[],
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_feature_flags_name ON feature_flags(name);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled);

-- Seed some common feature flags
INSERT INTO feature_flags (name, description, enabled, rollout_percentage) VALUES
  ('new_checkout_ui', 'Redesigned checkout experience with improved UX', false, 0),
  ('dark_mode', 'Dark mode theme support', false, 0),
  ('product_recommendations', 'AI-powered product recommendations', false, 0),
  ('flash_sales', 'Flash sale feature with countdown timer', false, 0),
  ('wishlist', 'Save products to wishlist', true, 100),
  ('recently_viewed', 'Track and display recently viewed products', true, 100),
  ('cod_enabled', 'Cash on Delivery payment method', true, 100),
  ('maintenance_mode', 'Disable checkout during maintenance', false, 0);
