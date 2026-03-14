-- Add canceled_at column to subscriptions table
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE;

-- Also update the status check constraint to include 'canceled' status
-- Note: In PostgreSQL, we need to drop and recreate the constraint
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_status_check 
CHECK (status IN ('pending', 'active', 'cancelled', 'canceled', 'expired'));
