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
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile (without name field requirement)
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

-- Step 5: Create/Update the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

