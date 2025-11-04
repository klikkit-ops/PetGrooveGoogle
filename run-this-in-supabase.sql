-- ============================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- This will fix the RLS policy issue
-- ============================================

-- Step 1: Add missing RLS policy for credits inserts
DROP POLICY IF EXISTS "Users can insert own credits" ON credits;
CREATE POLICY "Users can insert own credits" ON credits
  FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);

-- Step 2: Create database trigger function (BEST SOLUTION)
-- This automatically creates user profile when auth user is created
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

-- Step 3: Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Fix the existing user that was created but doesn't have a profile
-- (Run this ONLY if you see the user in auth.users but not in public.users)
INSERT INTO public.users (id, email, name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)) as name
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- Grant credits to existing user if they don't have any
INSERT INTO public.credits (user_id, amount, source)
SELECT 
  id,
  3,
  'free'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.credits WHERE amount > 0)
ON CONFLICT DO NOTHING;

