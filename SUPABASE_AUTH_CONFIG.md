# Supabase Auth Configuration - Preventing Duplicate Emails

## Issue
Users can create multiple accounts with the same email address. This is a security issue that needs to be fixed in Supabase configuration.

## Solution

### 1. Enable Email Confirmation (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Settings**
3. Under **Email Auth**, ensure:
   - **Enable email confirmations** is **ON**
   - **Secure email change** is **ON** (optional but recommended)

When email confirmation is enabled:
- Users must confirm their email before they can sign in
- Supabase prevents duplicate emails from being created
- If someone tries to sign up with an existing email, they'll get an error

### 2. Verify Supabase Auth Settings

In your Supabase Dashboard → Authentication → Settings:

- ✅ **Email signups**: Enabled
- ✅ **Email confirmations**: Enabled (prevents duplicates)
- ✅ **Secure email change**: Enabled (recommended)

### 3. Check for Existing Duplicate Accounts

Run this SQL in your Supabase SQL Editor to find duplicate emails:

```sql
-- Find duplicate email addresses
SELECT email, COUNT(*) as count
FROM auth.users
GROUP BY email
HAVING COUNT(*) > 1;

-- Find users without confirmed emails (if email confirmation is enabled)
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email_confirmed_at IS NULL
ORDER BY created_at DESC;
```

### 4. Clean Up Duplicate Accounts (if needed)

If you have duplicate accounts, you may want to keep only the most recent one:

```sql
-- WARNING: This will delete duplicate accounts, keeping only the most recent one
-- Run this ONLY if you're sure you want to delete duplicates

DELETE FROM auth.users
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
    FROM auth.users
  ) t
  WHERE rn > 1
);
```

## Current Code Behavior

The code now:
- ✅ Detects duplicate email errors from Supabase
- ✅ Shows a clear error message: "An account with this email already exists. Please sign in instead."
- ✅ Logs detailed error information for debugging

## Testing

After enabling email confirmation:
1. Try to sign up with a new email → Should work
2. Try to sign up with the same email again → Should show error message
3. Try to sign in with existing email → Should work

## Notes

- If email confirmation is **disabled**, Supabase may allow multiple signups with the same email
- Enabling email confirmation is the recommended solution
- The frontend code will now properly catch and display duplicate email errors

