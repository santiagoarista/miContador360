-- Add payment_method column to inventory table
ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Efectivo';
