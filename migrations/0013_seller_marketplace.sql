-- ============================================================================
-- SELLER MARKETPLACE MIGRATION
-- Multi-vendor e-commerce platform support
-- ============================================================================

-- === SELLER PROFILES ===
CREATE TABLE IF NOT EXISTS seller_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Business Information
  shop_name TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK (business_type IN ('individual', 'company', 'partnership')),
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  
  -- Contact Information
  business_email TEXT NOT NULL,
  business_phone TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- KYC Information
  gst_number TEXT,
  gst_verified BOOLEAN DEFAULT FALSE,
  has_gst BOOLEAN DEFAULT FALSE,
  pan_number TEXT NOT NULL,
  pan_verified BOOLEAN DEFAULT FALSE,
  
  -- Bank Details
  bank_account_number TEXT NOT NULL,
  bank_ifsc_code TEXT NOT NULL,
  bank_account_name TEXT NOT NULL,
  bank_name TEXT,
  bank_verified BOOLEAN DEFAULT FALSE,
  
  -- Pickup Address
  pickup_address_line1 TEXT NOT NULL,
  pickup_address_line2 TEXT,
  pickup_city TEXT NOT NULL,
  pickup_state TEXT NOT NULL,
  pickup_pincode TEXT NOT NULL,
  pickup_phone TEXT NOT NULL,
  pickup_landmark TEXT,
  
  -- Status & Approval
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended', 'blacklisted')),
  status_reason TEXT,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  suspended_at TIMESTAMP,
  
  -- Performance Metrics
  rating DECIMAL DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_products INTEGER DEFAULT 0,
  completion_rate DECIMAL DEFAULT 100,
  response_time INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for seller_profiles
CREATE INDEX IF NOT EXISTS idx_seller_profiles_user ON seller_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_status ON seller_profiles(status);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_shop_name ON seller_profiles(shop_name);

-- === SELLER WALLETS ===
CREATE TABLE IF NOT EXISTS seller_wallets (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL UNIQUE REFERENCES seller_profiles(id) ON DELETE CASCADE,
  
  -- Balance Breakdown
  pending_balance DECIMAL NOT NULL DEFAULT 0,
  available_balance DECIMAL NOT NULL DEFAULT 0,
  total_earned DECIMAL NOT NULL DEFAULT 0,
  total_withdrawn DECIMAL NOT NULL DEFAULT 0,
  hold_balance DECIMAL NOT NULL DEFAULT 0,
  
  -- Settings
  min_payout_amount DECIMAL NOT NULL DEFAULT 100,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- === SELLER ORDERS (Split from main order) ===
CREATE TABLE IF NOT EXISTS seller_orders (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_id INTEGER NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  
  -- Order Reference
  seller_order_number TEXT NOT NULL UNIQUE,
  
  -- Sub-totals
  subtotal DECIMAL NOT NULL,
  shipping_cost DECIMAL DEFAULT 0,
  discount DECIMAL DEFAULT 0,
  platform_fee DECIMAL NOT NULL,
  platform_fee_percentage DECIMAL NOT NULL,
  seller_earnings DECIMAL NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'return_requested', 'returned')),
  
  -- Cancellation
  cancelled_at TIMESTAMP,
  cancelled_by INTEGER REFERENCES users(id),
  cancellation_reason TEXT,
  
  -- Tracking
  tracking_number TEXT,
  shipping_provider TEXT,
  shipping_label TEXT,
  estimated_delivery TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  
  -- Payout tracking
  payout_eligible_at TIMESTAMP,
  payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'eligible', 'processing', 'completed')),
  
  -- State Machine
  state_history JSONB DEFAULT '[]',
  state_version INTEGER DEFAULT 1,
  
  -- Notes
  customer_note TEXT,
  seller_note TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for seller_orders
CREATE INDEX IF NOT EXISTS idx_seller_orders_order ON seller_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_seller_orders_seller ON seller_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_orders_status ON seller_orders(status);
CREATE INDEX IF NOT EXISTS idx_seller_orders_payout_status ON seller_orders(payout_status);
CREATE INDEX IF NOT EXISTS idx_seller_orders_created ON seller_orders(created_at);

-- === SELLER ORDER ITEMS ===
CREATE TABLE IF NOT EXISTS seller_order_items (
  id SERIAL PRIMARY KEY,
  seller_order_id INTEGER NOT NULL REFERENCES seller_orders(id) ON DELETE CASCADE,
  order_item_id INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  
  -- Item details (snapshot)
  product_name TEXT NOT NULL,
  product_sku TEXT,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL NOT NULL,
  total_price DECIMAL NOT NULL,
  size TEXT,
  color TEXT,
  
  -- Return tracking
  return_status TEXT DEFAULT 'none' CHECK (return_status IN ('none', 'requested', 'approved', 'rejected', 'picked', 'received', 'refunded')),
  return_quantity INTEGER DEFAULT 0
);

-- Indexes for seller_order_items
CREATE INDEX IF NOT EXISTS idx_seller_order_items_order ON seller_order_items(seller_order_id);
CREATE INDEX IF NOT EXISTS idx_seller_order_items_product ON seller_order_items(product_id);

-- === SELLER PAYOUTS ===
CREATE TABLE IF NOT EXISTS seller_payouts (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  payout_number TEXT NOT NULL UNIQUE,
  
  amount DECIMAL NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'pending_approval', 'approved', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Bank Details (snapshot)
  bank_account_number TEXT NOT NULL,
  bank_ifsc_code TEXT NOT NULL,
  bank_account_name TEXT NOT NULL,
  
  -- Transaction details
  transaction_id TEXT,
  utr_number TEXT,
  gateway TEXT,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Admin actions
  requested_by INTEGER REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  processed_by INTEGER REFERENCES users(id),
  approval_note TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  processed_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Indexes for seller_payouts
CREATE INDEX IF NOT EXISTS idx_seller_payouts_seller ON seller_payouts(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_status ON seller_payouts(status);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_created ON seller_payouts(created_at);

-- === SELLER TRANSACTIONS (Ledger) ===
CREATE TABLE IF NOT EXISTS seller_transactions (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  wallet_id INTEGER NOT NULL REFERENCES seller_wallets(id) ON DELETE CASCADE,
  transaction_number TEXT NOT NULL UNIQUE,
  
  -- Transaction Details
  type TEXT NOT NULL CHECK (type IN ('order_credit', 'commission_debit', 'payout', 'payout_reversal', 'refund_debit', 'adjustment_credit', 'adjustment_debit', 'hold', 'release')),
  amount DECIMAL NOT NULL,
  
  -- References
  reference_type TEXT,
  reference_id INTEGER,
  
  -- Balance snapshot
  pending_balance_after DECIMAL NOT NULL,
  available_balance_after DECIMAL NOT NULL,
  hold_balance_after DECIMAL NOT NULL,
  
  description TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for seller_transactions
CREATE INDEX IF NOT EXISTS idx_seller_transactions_seller ON seller_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_transactions_type ON seller_transactions(type);
CREATE INDEX IF NOT EXISTS idx_seller_transactions_created ON seller_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_seller_transactions_reference ON seller_transactions(reference_type, reference_id);

-- === COMMISSION RULES ===
CREATE TABLE IF NOT EXISTS commission_rules (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Targeting
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  seller_id INTEGER REFERENCES seller_profiles(id) ON DELETE SET NULL,
  
  -- Commission
  commission_type TEXT NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
  commission_value DECIMAL NOT NULL,
  min_commission DECIMAL,
  max_commission DECIMAL,
  
  -- Priority
  priority INTEGER DEFAULT 0,
  
  -- Validity
  is_active BOOLEAN DEFAULT TRUE,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  
  -- Audit
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for commission_rules
CREATE INDEX IF NOT EXISTS idx_commission_rules_category ON commission_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_seller ON commission_rules(seller_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_active ON commission_rules(is_active);

-- === SELLER RETURN REQUESTS ===
CREATE TABLE IF NOT EXISTS seller_return_requests (
  id SERIAL PRIMARY KEY,
  return_number TEXT NOT NULL UNIQUE,
  seller_order_id INTEGER NOT NULL REFERENCES seller_orders(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES users(id),
  seller_id INTEGER NOT NULL REFERENCES seller_profiles(id),
  
  -- Return Details
  reason TEXT NOT NULL CHECK (reason IN ('damaged', 'wrong_item', 'not_as_described', 'defective', 'size_fit', 'quality', 'other')),
  description TEXT,
  images TEXT[],
  
  -- Items being returned
  return_items JSONB NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested', 'seller_approved', 'seller_rejected', 'admin_review',
    'pickup_scheduled', 'pickup_failed', 'picked', 'in_transit', 'received',
    'quality_check', 'qc_passed', 'qc_failed',
    'refund_approved', 'refund_rejected', 'refund_processing', 'refunded', 'closed'
  )),
  
  -- Amounts
  requested_refund_amount DECIMAL NOT NULL,
  approved_refund_amount DECIMAL,
  refund_method TEXT CHECK (refund_method IN ('original_payment', 'wallet', 'bank')),
  
  -- Pickup details
  pickup_address JSONB,
  pickup_scheduled_at TIMESTAMP,
  pickup_attempts INTEGER DEFAULT 0,
  pickup_agent_name TEXT,
  pickup_agent_phone TEXT,
  
  -- Quality check
  qc_result TEXT CHECK (qc_result IN ('pass', 'fail', 'partial')),
  qc_notes TEXT,
  qc_images TEXT[],
  qc_by INTEGER REFERENCES users(id),
  
  -- Actions
  seller_response TEXT,
  seller_responded_at TIMESTAMP,
  admin_note TEXT,
  responded_by INTEGER REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  refunded_at TIMESTAMP,
  closed_at TIMESTAMP
);

-- Indexes for seller_return_requests
CREATE INDEX IF NOT EXISTS idx_seller_returns_order ON seller_return_requests(seller_order_id);
CREATE INDEX IF NOT EXISTS idx_seller_returns_seller ON seller_return_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_returns_customer ON seller_return_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_seller_returns_status ON seller_return_requests(status);

-- === SELLER VERIFICATION TOKENS ===
CREATE TABLE IF NOT EXISTS seller_verification_tokens (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER REFERENCES seller_profiles(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'phone')),
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for verification tokens
CREATE INDEX IF NOT EXISTS idx_seller_verification_tokens ON seller_verification_tokens(identifier, type);

-- === SELLER NOTIFICATIONS ===
CREATE TABLE IF NOT EXISTS seller_notifications (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN (
    'order_new', 'order_cancelled', 'return_request', 'payout_completed',
    'payout_failed', 'account_approved', 'account_suspended', 'product_approved',
    'product_rejected', 'low_stock', 'system'
  )),
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for seller_notifications
CREATE INDEX IF NOT EXISTS idx_seller_notifications_seller ON seller_notifications(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_read ON seller_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_created ON seller_notifications(created_at);

-- === MODIFY PRODUCTS TABLE ===
-- Add moderation fields if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'moderation_status') THEN
    ALTER TABLE products ADD COLUMN moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'disabled'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'rejection_reason') THEN
    ALTER TABLE products ADD COLUMN rejection_reason TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'moderated_by') THEN
    ALTER TABLE products ADD COLUMN moderated_by INTEGER REFERENCES users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'moderated_at') THEN
    ALTER TABLE products ADD COLUMN moderated_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sku') THEN
    ALTER TABLE products ADD COLUMN sku TEXT;
  END IF;
END $$;

-- Create index for product moderation if not exists
CREATE INDEX IF NOT EXISTS idx_product_moderation ON products(moderation_status);

-- === INSERT DEFAULT COMMISSION RULE ===
INSERT INTO commission_rules (name, description, commission_type, commission_value, priority, is_active)
SELECT 'Platform Default', 'Default platform commission for all products', 'percentage', 10, 0, true
WHERE NOT EXISTS (SELECT 1 FROM commission_rules WHERE name = 'Platform Default');

-- === GRANT PERMISSIONS (if using RLS) ===
-- ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY seller_isolation ON seller_profiles
--   USING (user_id = current_user_id());
