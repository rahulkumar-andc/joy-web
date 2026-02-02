-- Migration: Shipping Enhancements
-- Adds: Scheduled festive mode, presets, analytics support

-- ============================================================================
-- NEW SETTINGS: Scheduled Festive Mode
-- ============================================================================
INSERT INTO shipping_settings (key, value, description, allowed_values, min_role_level) VALUES
    ('festive_start_date', '', 'Start date for automatic festive mode (YYYY-MM-DD)', NULL, 1),
    ('festive_end_date', '', 'End date for automatic festive mode (YYYY-MM-DD)', NULL, 1),
    ('notification_slack_webhook', '', 'Slack webhook URL for shipping change notifications', NULL, 1),
    ('notification_email', '', 'Email for shipping change notifications', NULL, 1),
    ('notifications_enabled', 'true', 'Enable notifications for critical shipping changes', NULL, 1)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- SHIPPING PRESETS TABLE
-- Pre-configured shipping configurations for one-click apply
-- ============================================================================
CREATE TABLE IF NOT EXISTS shipping_presets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    settings JSONB NOT NULL,  -- { "key": "value" } pairs
    is_system BOOLEAN DEFAULT false,  -- System presets cannot be deleted
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipping_presets_active ON shipping_presets(is_active);

-- ============================================================================
-- SEED DATA: Default Presets
-- ============================================================================
INSERT INTO shipping_presets (name, description, settings, is_system) VALUES
    (
        'Normal Operations',
        'Standard shipping configuration',
        '{"festive_mode_enabled": "false", "free_shipping_threshold": "499", "default_shipping_cost": "99", "global_free_shipping_override": "false"}'::jsonb,
        true
    ),
    (
        'Diwali Sale',
        'Festive promotion with lower threshold',
        '{"festive_mode_enabled": "true", "festive_threshold": "199", "free_shipping_threshold": "299"}'::jsonb,
        true
    ),
    (
        'Flash Sale',
        'All orders get free shipping',
        '{"global_free_shipping_override": "true"}'::jsonb,
        true
    ),
    (
        'Conservative Mode',
        'Higher thresholds for cost control',
        '{"festive_mode_enabled": "false", "free_shipping_threshold": "999", "default_shipping_cost": "149", "global_free_shipping_override": "false"}'::jsonb,
        true
    )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SHIPPING ANALYTICS: Order shipping data (for dashboard)
-- This view aggregates shipping data from orders
-- ============================================================================
CREATE OR REPLACE VIEW shipping_analytics AS
SELECT 
    DATE_TRUNC('day', o.created_at) AS order_date,
    COUNT(*) AS total_orders,
    SUM(CASE WHEN o.shipping_cost = 0 OR o.shipping_cost IS NULL THEN 1 ELSE 0 END) AS free_shipping_orders,
    SUM(CASE WHEN o.shipping_cost > 0 THEN 1 ELSE 0 END) AS paid_shipping_orders,
    AVG(CAST(o.total_amount AS DECIMAL)) AS avg_order_value,
    SUM(COALESCE(o.shipping_cost, 0)) AS total_shipping_revenue
FROM orders o
WHERE o.created_at > NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', o.created_at)
ORDER BY order_date DESC;

-- Add shipping_cost column to orders if not exists
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0;

-- ============================================================================
-- NEW PERMISSIONS
-- ============================================================================
INSERT INTO permissions (domain, action, resource, description) VALUES
    ('shipping', 'manage', 'presets', 'Create and manage shipping presets'),
    ('shipping', 'apply', 'presets', 'Apply shipping presets'),
    ('shipping', 'read', 'analytics', 'View shipping analytics dashboard'),
    ('shipping', 'rollback', 'settings', 'Rollback shipping settings from audit log')
ON CONFLICT DO NOTHING;
