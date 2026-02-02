-- Migration: Shipping Settings System
-- Creates tables for admin-managed shipping configuration with audit trail

-- ============================================================================
-- SHIPPING SETTINGS TABLE
-- Stores all configurable shipping parameters
-- ============================================================================
CREATE TABLE IF NOT EXISTS shipping_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    value VARCHAR(255) NOT NULL,
    description TEXT,
    -- Allowed values for Business Admin dropdown (NULL = free-form for Super Admin only)
    allowed_values JSONB,
    -- Minimum role level required to modify (1 = Super Admin, 10 = Business Admin)
    min_role_level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- Index for fast key lookups
CREATE INDEX IF NOT EXISTS idx_shipping_settings_key ON shipping_settings(key);

-- ============================================================================
-- SHIPPING SETTINGS AUDIT TABLE
-- Immutable log of all shipping setting changes
-- ============================================================================
CREATE TABLE IF NOT EXISTS shipping_settings_audit (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(50) NOT NULL,
    old_value VARCHAR(255),
    new_value VARCHAR(255) NOT NULL,
    changed_by INTEGER REFERENCES users(id) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    change_reason TEXT
);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_shipping_audit_key ON shipping_settings_audit(setting_key);
CREATE INDEX IF NOT EXISTS idx_shipping_audit_changed_at ON shipping_settings_audit(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipping_audit_changed_by ON shipping_settings_audit(changed_by);

-- ============================================================================
-- SEED DATA: Default shipping settings
-- ============================================================================
INSERT INTO shipping_settings (key, value, description, allowed_values, min_role_level) VALUES
    -- Core settings (Super Admin only)
    ('free_shipping_enabled', 'true', 'Master toggle for free shipping feature', NULL, 1),
    ('default_shipping_cost', '99', 'Default shipping cost in INR when free shipping does not apply', NULL, 1),
    ('always_free_threshold', '999', 'Orders above this amount ALWAYS get free shipping regardless of other settings', NULL, 1),
    
    -- Threshold settings (Business Admin can select from pre-approved values)
    ('free_shipping_threshold', '499', 'Order amount threshold for normal free shipping', '["199", "299", "499", "999"]', 10),
    
    -- Festive mode settings
    ('festive_mode_enabled', 'false', 'Enable festive/promotional pricing mode', NULL, 10),
    ('festive_threshold', '199', 'Free shipping threshold during festive mode', '["99", "149", "199", "299"]', 10),
    
    -- Override (Super Admin emergency control)
    ('global_free_shipping_override', 'false', 'Emergency override: Make ALL shipping free', NULL, 1)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PERMISSIONS FOR SHIPPING SETTINGS
-- Insert into permissions table for RBAC
-- ============================================================================
INSERT INTO permissions (domain, action, resource, description) VALUES
    ('shipping', 'read', 'settings', 'View shipping settings'),
    ('shipping', 'update', 'settings', 'Modify all shipping settings (Super Admin)'),
    ('shipping', 'select', 'threshold', 'Select from pre-approved threshold values (Business Admin)'),
    ('shipping', 'toggle', 'festive', 'Enable/disable festive mode'),
    ('shipping', 'read', 'audit', 'View shipping settings audit log')
ON CONFLICT DO NOTHING;
