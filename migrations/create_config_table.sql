-- Create config table for storing dynamic configuration
CREATE TABLE IF NOT EXISTS public.config (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Anyone can read, only admins can write
CREATE POLICY "Allow public read access to config"
  ON public.config
  FOR SELECT
  USING (true);

-- Insert initial config values
INSERT INTO public.config (key, value) VALUES
  ('response_url', 'https://newchat-j973tyhqdvhcmzbgqf2g5q.vercel.app/payment/response'),
  ('confirmation_url', 'https://zijpwpflpuqyuwqnsrme.supabase.co/functions/v1/payu-confirmation')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();
