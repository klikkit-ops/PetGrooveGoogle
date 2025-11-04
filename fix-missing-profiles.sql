-- ============================================
-- FIX MISSING USER PROFILES
-- Run this to manually create profiles for users that don't have them
-- ============================================

-- Step 1: Make sure name column is nullable (if it isn't already)
ALTER TABLE public.users ALTER COLUMN name DROP NOT NULL;

-- Step 2: Create profiles for users missing from public.users
INSERT INTO public.users (id, email)
SELECT 
  au.id,
  COALESCE(au.email, '')
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify the fix worked
SELECT 
  au.id,
  au.email,
  CASE WHEN pu.id IS NULL THEN 'MISSING PROFILE' ELSE 'OK' END as profile_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 10;

