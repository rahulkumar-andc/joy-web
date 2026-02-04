-- In-House Delivery System Schema Updates
-- Adds delivery tracking fields to orders table

-- Add delivery status enum type
DO $$ 
BEGIN
    CREATE TYPE delivery_status_enum AS ENUM ('pending', 'picked_up', 'in_transit', 'delivered');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add delivery-related columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS assigned_courier INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS proof_of_delivery_image TEXT,
ADD COLUMN IF NOT EXISTS pod_location JSONB,
ADD COLUMN IF NOT EXISTS pod_timestamp TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_suspicious_delivery BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS suspicious_reason TEXT;

-- COD Settlement enhancements (extends existing COD support)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_settled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS settlement_timestamp TIMESTAMP,
ADD COLUMN IF NOT EXISTS settled_by INTEGER REFERENCES users(id);

-- Create index for assigned courier lookups
CREATE INDEX IF NOT EXISTS idx_orders_assigned_courier ON orders(assigned_courier);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_orders_suspicious ON orders(is_suspicious_delivery) WHERE is_suspicious_delivery = TRUE;

-- Add delivery domain to permissions if not exists
INSERT INTO permissions (domain, action, description)
VALUES 
    ('delivery', 'read', 'View assigned deliveries'),
    ('delivery', 'update', 'Update delivery status'),
    ('delivery', 'assign', 'Assign couriers to orders'),
    ('delivery', 'manage', 'Full delivery management')
ON CONFLICT DO NOTHING;
