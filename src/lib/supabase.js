import { createClient } from '@supabase/supabase-js';

// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseUrl = 'https://zijpwpflpuqyuwqnsrme.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppanB3cGZscHVxeXV3cW5zcm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NDk0ODQsImV4cCI6MjA4MjQyNTQ4NH0.IDO0e08rxxRYsz1wBVQ_zmAJeDi52R6YMJuQ_thY0VU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey);