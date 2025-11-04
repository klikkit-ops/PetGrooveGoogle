-- Add 20 credits to a specific user
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users table

-- Option 1: Add credits by email (easier)
INSERT INTO public.credits (user_id, amount, source)
SELECT 
  id,
  20,
  'free'
FROM auth.users
WHERE email = 'jake005588@gmail.com'  -- Replace with your email
ON CONFLICT DO NOTHING;

-- Option 2: Add credits by user ID (if you know the UUID)
-- INSERT INTO public.credits (user_id, amount, source)
-- VALUES ('YOUR_USER_ID_UUID_HERE', 20, 'free');

-- Option 3: Add credits to ALL users (careful!)
-- INSERT INTO public.credits (user_id, amount, source)
-- SELECT id, 20, 'free' FROM auth.users;

-- Verify the credits were added
SELECT 
  u.email,
  u.name,
  COALESCE(SUM(c.amount), 0) as total_credits
FROM auth.users u
LEFT JOIN public.credits c ON u.id = c.user_id
WHERE u.email = 'jake005588@gmail.com'  -- Replace with your email
GROUP BY u.id, u.email, u.name;

