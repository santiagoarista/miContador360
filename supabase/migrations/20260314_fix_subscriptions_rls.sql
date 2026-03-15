-- Fix RLS policies for subscriptions table
-- This migration ensures proper Row-Level Security configuration

-- Enable RLS on subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can read their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.subscriptions;

-- Create policy for SELECT (read own subscriptions)
CREATE POLICY "Users can read their own subscriptions" 
  ON public.subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for INSERT (create own subscriptions)
CREATE POLICY "Users can insert their own subscriptions" 
  ON public.subscriptions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy for UPDATE (update own subscriptions)
CREATE POLICY "Users can update their own subscriptions" 
  ON public.subscriptions 
  FOR UPDATE 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Create policy for service role (webhooks and backend operations)
CREATE POLICY "Service role can manage all subscriptions" 
  ON public.subscriptions 
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
