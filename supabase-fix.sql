-- Fix for RLS policy issue during user signup
-- Run this in your Supabase SQL Editor

-- Option 1: Update RLS policy to allow inserts during signup
-- Drop the existing insert policy
DROP POLICY IF EXISTS "Users can insert own data" ON users;

-- Create a new policy that allows inserts when auth.uid() matches the id being inserted
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT 
  WITH CHECK (auth.uid()::text = id::text);

-- Also add policy for credits inserts
DROP POLICY IF EXISTS "Users can insert own credits" ON credits;
CREATE POLICY "Users can insert own credits" ON credits
  FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);

-- Option 2: Create a database trigger (BETTER SOLUTION)
-- This automatically creates the user profile when auth.users is created
-- This bypasses RLS using SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  
  -- Grant initial free credits
  INSERT INTO public.credits (user_id, amount, source)
  VALUES (NEW.id, 3, 'free');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

