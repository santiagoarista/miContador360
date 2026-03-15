-- Clean up duplicate RLS policies on subscriptions table
-- Keep only the latest policies and remove old duplicates

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can read their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.subscriptions;

-- Ensure RLS is enabled
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create final set of policies
CREATE POLICY "Users can read their own subscriptions" 
  ON public.subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" 
  ON public.subscriptions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" 
  ON public.subscriptions 
  FOR UPDATE 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all subscriptions" 
  ON public.subscriptions 
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
