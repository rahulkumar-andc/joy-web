-- Reseller System Migration
-- Created: 2026-02-01
-- Description: Full reseller/affiliate system with commission tracking and payouts

-- ================================================
-- TABLE: resellers
-- Core reseller profiles linked to users
-- ================================================
CREATE TABLE IF NOT EXISTS resellers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  reseller_code TEXT NOT NULL UNIQUE,
  
  -- Status & Tier
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  
  -- Earnings Summary (denormalized for performance)
  total_earnings DECIMAL NOT NULL DEFAULT 0,
  pending_payout DECIMAL NOT NULL DEFAULT 0,
  lifetime_sales INTEGER NOT NULL DEFAULT 0,
  lifetime_orders INTEGER NOT NULL DEFAULT 0,
  
  -- Payout Details
  bank_account_number TEXT,
  bank_ifsc_code TEXT,
  bank_account_name TEXT,
  upi_id TEXT,
  preferred_payout_method TEXT DEFAULT 'upi' CHECK (preferred_payout_method IN ('bank', 'upi')),
  
  -- Risk & Fraud Prevention
  risk_score INTEGER NOT NULL DEFAULT 0,
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  suspended_at TIMESTAMP
);

-- Indexes for resellers
CREATE INDEX IF NOT EXISTS idx_resellers_user_id ON resellers(user_id);
CREATE INDEX IF NOT EXISTS idx_resellers_status ON resellers(status);
CREATE INDEX IF NOT EXISTS idx_resellers_tier ON resellers(tier);
CREATE INDEX IF NOT EXISTS idx_resellers_code ON resellers(reseller_code);

-- ================================================
-- TABLE: reseller_links
-- Product share links with custom margins
-- ================================================
CREATE TABLE IF NOT EXISTS reseller_links (
  id SERIAL PRIMARY KEY,
  reseller_id INTEGER NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Link Details
  short_code TEXT NOT NULL UNIQUE,
  custom_title TEXT,
  
  -- Margin Configuration
  margin_type TEXT NOT NULL DEFAULT 'percentage' CHECK (margin_type IN ('percentage', 'fixed')),
  margin_value DECIMAL NOT NULL DEFAULT 0,
  
  -- Analytics
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  total_revenue DECIMAL NOT NULL DEFAULT 0,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_click_at TIMESTAMP,
  
  -- Unique constraint: one link per reseller-product pair
  UNIQUE(reseller_id, product_id)
);

-- Indexes for reseller_links
CREATE INDEX IF NOT EXISTS idx_reseller_links_reseller ON reseller_links(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_links_product ON reseller_links(product_id);
CREATE INDEX IF NOT EXISTS idx_reseller_links_short_code ON reseller_links(short_code);
CREATE INDEX IF NOT EXISTS idx_reseller_links_active ON reseller_links(is_active) WHERE is_active = TRUE;

-- ================================================
-- TABLE: reseller_commissions
-- Commission earned per order
-- ================================================
CREATE TABLE IF NOT EXISTS reseller_commissions (
  id SERIAL PRIMARY KEY,
  reseller_id INTEGER NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  link_id INTEGER REFERENCES reseller_links(id) ON DELETE SET NULL,
  
  -- Order Amount
  order_amount DECIMAL NOT NULL,
  
  -- Commission Breakdown
  base_commission_rate DECIMAL NOT NULL,
  base_commission_amount DECIMAL NOT NULL,
  margin_earnings DECIMAL NOT NULL DEFAULT 0,
  total_amount DECIMAL NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded', 'paid')),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  paid_at TIMESTAMP,
  
  -- Notes
  cancellation_reason TEXT
);

-- Indexes for reseller_commissions
CREATE INDEX IF NOT EXISTS idx_reseller_commissions_reseller ON reseller_commissions(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_commissions_order ON reseller_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_reseller_commissions_status ON reseller_commissions(status);
CREATE INDEX IF NOT EXISTS idx_reseller_commissions_created ON reseller_commissions(created_at DESC);

-- ================================================
-- TABLE: reseller_payouts
-- Payout requests and transactions
-- ================================================
CREATE TABLE IF NOT EXISTS reseller_payouts (
  id SERIAL PRIMARY KEY,
  reseller_id INTEGER NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
  
  -- Payout Details
  amount DECIMAL NOT NULL,
  payout_method TEXT NOT NULL CHECK (payout_method IN ('bank', 'upi')),
  
  -- Bank/UPI Details (snapshot at payout time)
  bank_account_number TEXT,
  bank_ifsc_code TEXT,
  upi_id TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Transaction
  transaction_id TEXT,
  gateway TEXT,
  failure_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Indexes for reseller_payouts
CREATE INDEX IF NOT EXISTS idx_reseller_payouts_reseller ON reseller_payouts(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_payouts_status ON reseller_payouts(status);
CREATE INDEX IF NOT EXISTS idx_reseller_payouts_created ON reseller_payouts(created_at DESC);

-- ================================================
-- TABLE: reseller_clicks
-- Click tracking for fraud detection & analytics
-- ================================================
CREATE TABLE IF NOT EXISTS reseller_clicks (
  id SERIAL PRIMARY KEY,
  link_id INTEGER NOT NULL REFERENCES reseller_links(id) ON DELETE CASCADE,
  
  -- Tracking Data
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  referrer TEXT,
  
  -- Conversion Tracking
  converted_to_order BOOLEAN DEFAULT FALSE,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  
  -- Timestamp
  clicked_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for reseller_clicks
CREATE INDEX IF NOT EXISTS idx_reseller_clicks_link ON reseller_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_reseller_clicks_ip ON reseller_clicks(ip_address);
CREATE INDEX IF NOT EXISTS idx_reseller_clicks_fingerprint ON reseller_clicks(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_reseller_clicks_clicked ON reseller_clicks(clicked_at DESC);

-- ================================================
-- PERFORMANCE: Composite indexes for common queries
-- ================================================

-- Reseller dashboard queries
CREATE INDEX IF NOT EXISTS idx_reseller_commissions_reseller_status 
  ON reseller_commissions(reseller_id, status);

CREATE INDEX IF NOT EXISTS idx_reseller_payouts_reseller_status 
  ON reseller_payouts(reseller_id, status);

-- Fraud detection queries
CREATE INDEX IF NOT EXISTS idx_reseller_clicks_conversion 
  ON reseller_clicks(link_id, converted_to_order);

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON TABLE resellers IS 'Reseller profiles with commission tiers and payout details';
COMMENT ON TABLE reseller_links IS 'Product share links with custom margins';
COMMENT ON TABLE reseller_commissions IS 'Per-order commission tracking with lifecycle states';
COMMENT ON TABLE reseller_payouts IS 'Payout requests and transaction history';
COMMENT ON TABLE reseller_clicks IS 'Click tracking for analytics and fraud detection';

COMMENT ON COLUMN resellers.tier IS 'bronze: 5%, silver: 7%, gold: 10%, platinum: 12%';
COMMENT ON COLUMN resellers.risk_score IS 'Fraud risk score 0-100, above 70 triggers review';
COMMENT ON COLUMN reseller_commissions.status IS 'pending->confirmed (after delivery), or cancelled/refunded';
