-- Migration: Update taxpayer_type constraint to include 'Asalariado Independiente'
-- Date: 2024
-- Description: Updates the check constraint to allow 'Asalariado Independiente' as a valid taxpayer type

-- Drop existing constraint if it exists
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_taxpayer_type;

-- Recreate constraint with new value
ALTER TABLE profiles
ADD CONSTRAINT check_taxpayer_type 
CHECK (taxpayer_type IS NULL OR taxpayer_type IN ('Asalariado', 'Independiente', 'Asalariado Independiente', 'Rentista de capital'));

-- Update comment to reflect new value
COMMENT ON COLUMN profiles.taxpayer_type IS 'Tipo de contribuyente: Asalariado, Independiente, Asalariado Independiente, o Rentista de capital';

