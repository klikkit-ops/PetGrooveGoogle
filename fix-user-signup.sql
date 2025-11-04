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
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile (without name field requirement)
  -- This bypasses RLS because the function uses SECURITY DEFINER
  INSERT INTO public.users (id, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO UPDATE 
  SET email = COALESCE(NEW.email, users.email);
  
  -- NOTE: No credits are granted - users start with 0 credits
  -- Users must subscribe/pay to obtain credits
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth signup
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4b: Grant execute permissions on the function
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

-- Step 7: Test the trigger (optional - creates a test user in auth.users)
-- This will help verify the trigger is working
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
-- VALUES (gen_random_uuid(), 'test@example.com', crypt('test123', gen_salt('bf')), NOW(), NOW(), NOW());

