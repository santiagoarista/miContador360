-- Drop ALL custom triggers and functions. Use Supabase client in frontend instead.
-- 1) Drop all non-internal triggers on tables in public schema
-- 2) Drop all custom functions in public schema (excluding extension-owned)

-- ========== 1. Drop all triggers on public schema tables ==========
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT n.nspname AS schema_name,
           c.relname AS table_name,
           t.tgname AS trigger_name
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT t.tgisinternal
  ) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON %I.%I',
      r.trigger_name, r.schema_name, r.table_name
    );
  END LOOP;
END $$;

-- ========== 2. Drop all custom functions in public schema (not from extensions) ==========
DO $$
DECLARE
  r RECORD;
  fn_ident text;
BEGIN
  FOR r IN (
    SELECT n.nspname,
           p.proname,
           p.oid AS fn_oid,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.oid NOT IN (
        SELECT d.objid
        FROM pg_depend d
        WHERE d.refclassid = 'pg_extension'::regclass
          AND d.classid = 'pg_proc'::regclass
          AND d.deptype = 'e'
      )
  ) LOOP
    fn_ident := format(
      '%I.%I(%s)',
      r.nspname, r.proname, r.args
    );
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', fn_ident);
  END LOOP;
END $$;

-- ========== 3. Also drop any remaining triggers on auth.users ==========
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth' AND c.relname = 'users'
      AND NOT t.tgisinternal
  ) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', r.tgname);
  END LOOP;
END $$;
