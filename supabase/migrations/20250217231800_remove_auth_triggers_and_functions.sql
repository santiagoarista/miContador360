-- Remove all triggers on auth.users that cause "Database error saving new user"
-- Profile/user creation is handled in the frontend via Supabase client (supabase.insert, etc.)

-- Drop trigger(s) on auth.users (common names used by Supabase guides)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

-- Drop the trigger function(s) that insert into profiles/users on signup
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS auth.handle_new_user() CASCADE;

-- Drop any other custom triggers on auth.users (covers custom names)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tgname
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth' AND c.relname = 'users'
      AND NOT t.tgisinternal
  ) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', r.tgname);
  END LOOP;
END $$;
