-- ============================================
-- REMOVE FREE CREDITS FROM NEW USER TRIGGER
-- Run this in Supabase SQL Editor
-- This updates the trigger to NOT grant free credits to new users
-- ============================================

-- Update the database trigger function to remove free credits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile (without name field requirement)
  INSERT INTO public.users (id, email)
  VALUES (
    NEW.id,
    NEW.email
  );
  
  -- NOTE: No credits are granted - users start with 0 credits
  -- Users must subscribe/pay to obtain credits
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger should already exist, but this ensures it's set up correctly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- OPTIONAL: Remove name column from users table if you want
-- (Uncomment the lines below if you want to remove the name column entirely)
-- ============================================
-- ALTER TABLE public.users DROP COLUMN IF EXISTS name;

-- ============================================
-- NOTE: This does NOT remove existing credits from existing users
-- If you want to reset all existing users to 0 credits, run:
-- ============================================
-- DELETE FROM public.credits WHERE source = 'free';

