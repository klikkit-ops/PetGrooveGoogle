-- ============================================
-- UPDATE EXISTING USERS TO NEW CREDIT SYSTEM
-- Run this in Supabase SQL Editor after deploying the new pricing model
-- ============================================

-- Update existing users: Grant 1000 credits (matching new initial credit amount)
-- This gives existing users 2 free generations with the new 500 credit requirement
INSERT INTO public.credits (user_id, amount, source)
SELECT 
  id,
  1000,
  'free'
FROM auth.users
WHERE id IN (
  -- Only add credits to users who don't already have enough credits
  SELECT user_id 
  FROM (
    SELECT 
      user_id, 
      SUM(amount) as total_credits
    FROM public.credits
    GROUP BY user_id
  ) user_credits
  WHERE total_credits < 1000
)
ON CONFLICT DO NOTHING;

-- Note: If you want to give ALL existing users exactly 1000 credits (replacing their current balance),
-- you can use this instead:
-- 
-- DELETE FROM public.credits WHERE user_id IN (SELECT id FROM auth.users);
-- INSERT INTO public.credits (user_id, amount, source)
-- SELECT id, 1000, 'free' FROM auth.users;

