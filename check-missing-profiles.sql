-- ============================================
-- CHECK FOR MISSING USER PROFILES
-- This query finds users in auth.users that don't have a corresponding entry in public.users
-- ============================================

-- Find users in auth.users without a profile in public.users
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created_at,
  au.email_confirmed_at,
  CASE 
    WHEN pu.id IS NULL THEN 'MISSING PROFILE'
    ELSE 'PROFILE EXISTS'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- Count of missing profiles
SELECT 
  COUNT(*) as missing_profiles_count
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- ============================================
-- FIX MISSING USER PROFILES
-- Run this if you find missing profiles to create them
-- ============================================

-- Ensure name column is nullable (in case it's not already)
ALTER TABLE public.users ALTER COLUMN name DROP NOT NULL;

-- Create missing profiles
INSERT INTO public.users (id, email, name)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ) as name
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO UPDATE 
SET email = COALESCE(EXCLUDED.email, public.users.email);

-- Verify the fix
SELECT 
  COUNT(*) as total_auth_users,
  (SELECT COUNT(*) FROM public.users) as total_public_users,
  COUNT(*) - (SELECT COUNT(*) FROM public.users) as difference
FROM auth.users;

