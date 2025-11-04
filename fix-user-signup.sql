-- ============================================
-- COMPLETE FIX FOR USER SIGNUP ISSUES
-- Run this in Supabase SQL Editor
-- This ensures the trigger and RLS policies are correctly configured
-- ============================================

-- Step 1: Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can select own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Step 3: Create comprehensive RLS policies
-- Allow users to insert their own profile
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT 
  WITH CHECK (auth.uid()::text = id::text);

-- Allow users to select their own profile
CREATE POLICY "Users can select own data" ON users
  FOR SELECT 
  USING (auth.uid()::text = id::text);

-- Allow users to update their own profile
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE 
  USING (auth.uid()::text = id::text);

-- Step 4: Create/Update the trigger function
-- SECURITY DEFINER allows the function to bypass RLS policies
-- Set the function owner to postgres to ensure it has proper permissions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Store values in variables for better error handling
  v_user_id := NEW.id;
  v_user_email := COALESCE(NEW.email, '');
  
  -- Create user profile (without name field requirement)
  -- This bypasses RLS because the function uses SECURITY DEFINER
  INSERT INTO public.users (id, email)
  VALUES (v_user_id, v_user_email)
  ON CONFLICT (id) DO UPDATE 
  SET email = COALESCE(EXCLUDED.email, users.email);
  
  -- Log successful creation
  RAISE LOG 'Successfully created user profile for user % (email: %)', v_user_id, v_user_email;
  
  -- NOTE: No credits are granted - users start with 0 credits
  -- Users must subscribe/pay to obtain credits
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error with full details
    -- This will show up in Supabase Postgres logs
    RAISE WARNING 'Error creating user profile for user % (email: %): %', 
      v_user_id, 
      v_user_email, 
      SQLERRM;
    -- Still return NEW to not block auth signup
    RETURN NEW;
END;
$$;

-- Step 4b: Set the function owner to postgres to ensure it bypasses RLS
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Step 4c: Grant execute permissions on the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- Step 5: Create/Update the trigger
-- This trigger runs AFTER a new user is inserted into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Verify the trigger was created
-- Run this query to check if the trigger exists:
-- SELECT trigger_name, event_manipulation, event_object_table 
-- FROM information_schema.triggers 
-- WHERE trigger_name = 'on_auth_user_created';

-- Step 7: Verify the function and trigger are set up correctly
-- Check function exists and has SECURITY DEFINER
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'handle_new_user';

-- Check trigger exists and is enabled
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth'
  AND c.relname = 'users'
  AND t.tgname = 'on_auth_user_created';

-- Step 8: If trigger still doesn't work, check if there are any existing users without profiles
-- This query will help identify if the trigger is failing
SELECT 
  au.id,
  au.email,
  CASE WHEN pu.id IS NULL THEN 'MISSING PROFILE' ELSE 'OK' END as profile_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 10;

