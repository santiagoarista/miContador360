-- Migration: Add taxpayer_type column to profiles table
-- Date: 2024
-- Description: Adds taxpayer_type column to store the type of taxpayer (Asalariado, Independiente, Asalariado Independiente, Rentista de capital)

-- Add taxpayer_type column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS taxpayer_type TEXT;

-- Add a check constraint to ensure only valid values are allowed
ALTER TABLE profiles
ADD CONSTRAINT check_taxpayer_type 
CHECK (taxpayer_type IS NULL OR taxpayer_type IN ('Asalariado', 'Independiente', 'Asalariado Independiente', 'Rentista de capital'));

-- Add comment to the column
COMMENT ON COLUMN profiles.taxpayer_type IS 'Tipo de contribuyente: Asalariado, Independiente, Asalariado Independiente, o Rentista de capital';

