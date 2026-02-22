-- Add supplier_id column to inventory table if it doesn't exist
ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES third_parties(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_id ON inventory(supplier_id);
