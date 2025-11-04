# Complete Stripe Setup Guide for PetGroove

This guide will walk you through setting up Stripe subscriptions for PetGroove from start to finish.

## 📋 Overview

PetGroove uses Stripe for subscription payments with the following pricing:
- **Weekly Plan**: $0.49 for 7 days trial, then $7.99/week (1000 credits/week = 2 video generations)
- **Annual Plan**: $69.99/year (48000 credits/year = 96 video generations)
- **Each video generation**: Requires 500 credits

---

## Step 1: Create Stripe Account

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/register)
2. Sign up for a new account (or log in if you already have one)
3. Complete account setup:
   - Add business information
   - Verify your email
   - Add payment details (for receiving payments)

**Note:** Start in **Test Mode** to test everything before going live.

---

## Step 2: Get Your API Keys

1. In Stripe Dashboard, go to **Developers → API keys**
2. You'll see two keys:
   - **Publishable key** (starts with `pk_test_...` or `pk_live_...`)
   - **Secret key** (starts with `sk_test_...` or `sk_live_...`)

3. **Copy both keys** and save them securely (you'll need them later)

**Important:** 
- Never share your Secret key publicly
- Test keys start with `pk_test_` and `sk_test_`
- Live keys start with `pk_live_` and `sk_live_`

---

## Step 3: Create Products in Stripe

You need to create **3 products** total:

### Product 1: Weekly Trial ($0.49 one-time)

1. Go to **Products → Add Product**
2. Fill in the details:
   - **Name:** `PetGroove Weekly Trial`
   - **Description:** `7-day trial for Weekly Subscription - 1000 credits`
   - **Pricing model:** Select **One-time**
   - **Price:** `0.49` USD
   - **Billing period:** (not applicable for one-time)
3. Click **Save product**
4. Copy the **Price ID** (starts with `price_...`)
   - ✅ Save this as: `STRIPE_WEEKLY_TRIAL_PRICE_ID`

### Product 2: Weekly Subscription ($7.99/week)

1. Go to **Products → Add Product**
2. Fill in the details:
   - **Name:** `PetGroove Weekly Subscription`
   - **Description:** `Weekly subscription - 1000 credits/week (2 video generations)`
   - **Pricing model:** Select **Recurring**
   - **Price:** `7.99` USD
   - **Billing period:** Select **Weekly**
3. Click **Save product**
4. Copy the **Price ID** (starts with `price_...`)
   - ✅ Save this as: `STRIPE_WEEKLY_PRICE_ID`

### Product 3: Annual Subscription ($69.99/year)

1. Go to **Products → Add Product**
2. Fill in the details:
   - **Name:** `PetGroove Annual Subscription`
   - **Description:** `Annual subscription - 48000 credits/year (96 video generations)`
   - **Pricing model:** Select **Recurring**
   - **Price:** `69.99` USD
   - **Billing period:** Select **Yearly** (or "Annually")
3. Click **Save product**
4. Copy the **Price ID** (starts with `price_...`)
   - ✅ Save this as: `STRIPE_ANNUAL_PRICE_ID`

---

## Step 4: Set Up Stripe Webhook

Webhooks allow Stripe to notify your app when payments succeed, so credits can be added automatically.

### 4.1 Create Webhook Endpoint

1. In Stripe Dashboard, go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   ```
   https://your-vercel-app.vercel.app/api/webhooks/stripe
   ```
   Replace `your-vercel-app` with your actual Vercel app URL (e.g., `petgroovegoogle`)
4. **Description:** `PetGroove Subscription Webhook`

### 4.2 Select Events to Listen To

Select these events (check the boxes):
- ✅ `checkout.session.completed` - When customer completes checkout
- ✅ `customer.subscription.updated` - When subscription changes
- ✅ `customer.subscription.deleted` - When subscription is canceled
- ✅ `invoice.payment_succeeded` - When recurring payment succeeds

### 4.3 Get Webhook Signing Secret

1. Click **Add endpoint**
2. After creating, you'll see the endpoint details
3. Click on the endpoint to view details
4. Find **Signing secret** (starts with `whsec_...`)
5. Click **Reveal** and copy it
   - ✅ Save this as: `STRIPE_WEBHOOK_SECRET`

**Important:** Keep this secret secure - it's used to verify webhook requests are from Stripe.

---

## Step 5: Add Environment Variables to Vercel

1. Go to your **Vercel Dashboard** → Your project → **Settings → Environment Variables**

2. Add the following variables (click **Add** for each):

### Required Variables:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `STRIPE_SECRET_KEY` | `sk_test_...` | Your Stripe Secret key (from Step 2) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Your Stripe Publishable key (from Step 2) |
| `STRIPE_WEEKLY_TRIAL_PRICE_ID` | `price_...` | $0.49 trial product Price ID (from Step 3) |
| `STRIPE_WEEKLY_PRICE_ID` | `price_...` | $7.99/week subscription Price ID (from Step 3) |
| `STRIPE_ANNUAL_PRICE_ID` | `price_...` | $69.99/year subscription Price ID (from Step 3) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Webhook signing secret (from Step 4) |

### Optional (for Webhook to Add Credits):

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Supabase Service Role Key (NOT the Anon key) |

**Important Notes:**
- Variables with `VITE_` prefix are available in the browser (frontend)
- Variables WITHOUT `VITE_` prefix are server-side only (API routes)
- Never expose `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` to the frontend
- After adding variables, **redeploy your Vercel project** for changes to take effect

### How to Redeploy:

1. Go to **Deployments** tab in Vercel
2. Click **⋯** (three dots) on the latest deployment
3. Click **Redeploy**

---

## Step 6: Verify Your Setup

### 6.1 Check Environment Variables

1. Go to **Settings → Environment Variables** in Vercel
2. Verify all 6 required variables are present:
   - ✅ `STRIPE_SECRET_KEY`
   - ✅ `VITE_STRIPE_PUBLISHABLE_KEY`
   - ✅ `STRIPE_WEEKLY_TRIAL_PRICE_ID`
   - ✅ `STRIPE_WEEKLY_PRICE_ID`
   - ✅ `STRIPE_ANNUAL_PRICE_ID`
   - ✅ `STRIPE_WEBHOOK_SECRET`

### 6.2 Test Webhook Endpoint

1. In Stripe Dashboard → **Developers → Webhooks**
2. Click on your webhook endpoint
3. Click **Send test webhook** → Choose `checkout.session.completed`
4. Check Vercel function logs to see if webhook is received

### 6.3 Test Checkout Flow

1. Go to your PetGroove app
2. Log in to your account
3. Go to **Account** page
4. Click **Start 7-Day Trial** or **Select Annual**
5. You should be redirected to Stripe Checkout

**If checkout doesn't load:**
- Check browser console for errors
- Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set
- Check Vercel function logs for `/api/create-checkout-session`

---

## Step 7: Test with Stripe Test Cards

While in **Test Mode**, use these test cards:

### Successful Payment:
- **Card Number:** `4242 4242 4242 4242`
- **Expiry:** Any future date (e.g., `12/34`)
- **CVC:** Any 3 digits (e.g., `123`)
- **ZIP:** Any 5 digits (e.g., `12345`)

### Declined Payment (for testing errors):
- **Card Number:** `4000 0000 0000 0002`

### Test the Complete Flow:

1. **Test Weekly Plan:**
   - Click "Start 7-Day Trial"
   - Use test card `4242 4242 4242 4242`
   - Complete checkout
   - Verify you're redirected back to Account page with success message
   - Check Stripe Dashboard → **Customers** → Should see new customer
   - Check Stripe Dashboard → **Subscriptions** → Should see active subscription
   - Check your app → Credits should be updated (1000 credits added)

2. **Test Annual Plan:**
   - Click "Select Annual"
   - Use test card `4242 4242 4242 4242`
   - Complete checkout
   - Verify credits are added (48000 credits)

3. **Test Webhook:**
   - Go to Stripe Dashboard → **Developers → Webhooks**
   - Click on your webhook endpoint
   - Check **Recent events** - should show successful events
   - If events show errors, check Vercel function logs

---

## Step 8: Troubleshooting

### Issue: Checkout not loading

**Symptoms:** Button doesn't redirect or shows error

**Solutions:**
1. Check browser console (F12) for errors
2. Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set in Vercel
3. Check Vercel function logs for `/api/create-checkout-session`
4. Ensure you've redeployed after adding environment variables

### Issue: Webhook not receiving events

**Symptoms:** Payment succeeds but credits aren't added

**Solutions:**
1. Verify webhook URL is correct in Stripe Dashboard
2. Check webhook URL matches your Vercel app URL
3. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
4. Check Vercel function logs for `/api/webhooks/stripe`
5. Verify `SUPABASE_SERVICE_ROLE_KEY` is set (for webhook to add credits)

### Issue: Credits not adding after payment

**Symptoms:** Payment succeeds but credits don't appear

**Solutions:**
1. Check Supabase credentials (`SUPABASE_SERVICE_ROLE_KEY`)
2. Verify webhook is receiving `checkout.session.completed` events
3. Check Vercel function logs for errors
4. Verify `userId` is being passed correctly in checkout metadata
5. Check Supabase database → `credits` table → Should see new entry

### Issue: Wrong amount charged

**Symptoms:** Charging $7.99 immediately instead of $0.49

**Solutions:**
1. Verify `STRIPE_WEEKLY_TRIAL_PRICE_ID` is set correctly
2. Check that trial product is created as **One-time** (not Recurring)
3. Verify both Price IDs are added to checkout session (check code)

### Issue: Subscription not recurring

**Symptoms:** Only charged once, not weekly

**Solutions:**
1. Verify `STRIPE_WEEKLY_PRICE_ID` is a **Recurring** product
2. Check billing period is set to **Weekly**
3. Verify `trial_period_days: 7` is set in checkout session

---

## Step 9: Go Live (Production)

When you're ready to accept real payments:

### 9.1 Switch to Live Mode

1. In Stripe Dashboard, toggle **Test Mode** to **Live Mode**
2. **Warning:** This enables real payments - make sure you're ready!

### 9.2 Get Live API Keys

1. Go to **Developers → API keys** (while in Live Mode)
2. Copy your **Live** keys:
   - `pk_live_...` (Publishable key)
   - `sk_live_...` (Secret key)

### 9.3 Create Live Products

1. Create the same 3 products in **Live Mode**:
   - Weekly Trial ($0.49)
   - Weekly Subscription ($7.99/week)
   - Annual Subscription ($69.99/year)
2. Copy the **Live** Price IDs

### 9.4 Set Up Live Webhook

1. Create a new webhook endpoint in **Live Mode**
2. Use your production URL: `https://your-app.vercel.app/api/webhooks/stripe`
3. Select the same events
4. Copy the **Live** webhook signing secret

### 9.5 Update Vercel Environment Variables

1. Go to **Settings → Environment Variables** in Vercel
2. Update these variables with **Live** values:
   - `STRIPE_SECRET_KEY` → `sk_live_...`
   - `VITE_STRIPE_PUBLISHABLE_KEY` → `pk_live_...`
   - `STRIPE_WEEKLY_TRIAL_PRICE_ID` → Live Price ID
   - `STRIPE_WEEKLY_PRICE_ID` → Live Price ID
   - `STRIPE_ANNUAL_PRICE_ID` → Live Price ID
   - `STRIPE_WEBHOOK_SECRET` → Live webhook secret

3. **Redeploy** your Vercel project

### 9.6 Final Verification

1. Test with a real card (small amount)
2. Verify webhook receives events
3. Verify credits are added correctly
4. Monitor Stripe Dashboard for successful payments

---

## Step 10: Monitor and Maintain

### Regular Checks:

1. **Monitor Webhook Events:**
   - Stripe Dashboard → **Developers → Webhooks**
   - Check for failed webhook deliveries
   - Review error logs

2. **Monitor Subscriptions:**
   - Stripe Dashboard → **Subscriptions**
   - Check active subscriptions
   - Monitor churn rate

3. **Check Vercel Logs:**
   - Vercel Dashboard → **Functions** tab
   - Monitor API route performance
   - Check for errors

4. **Verify Credits:**
   - Check Supabase → `credits` table
   - Ensure credits are being added correctly
   - Monitor for any discrepancies

---

## Quick Reference

### Environment Variables Checklist:

```
✅ STRIPE_SECRET_KEY
✅ VITE_STRIPE_PUBLISHABLE_KEY
✅ STRIPE_WEEKLY_TRIAL_PRICE_ID
✅ STRIPE_WEEKLY_PRICE_ID
✅ STRIPE_ANNUAL_PRICE_ID
✅ STRIPE_WEBHOOK_SECRET
✅ SUPABASE_SERVICE_ROLE_KEY (optional but recommended)
```

### Stripe Products Checklist:

```
✅ Weekly Trial - $0.49 one-time
✅ Weekly Subscription - $7.99/week recurring
✅ Annual Subscription - $69.99/year recurring
```

### Webhook Events Checklist:

```
✅ checkout.session.completed
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ invoice.payment_succeeded
```

---

## Support Resources

- **Stripe Documentation:** https://stripe.com/docs
- **Stripe Checkout Docs:** https://stripe.com/docs/payments/checkout
- **Stripe Webhooks:** https://stripe.com/docs/webhooks
- **Vercel Functions:** https://vercel.com/docs/functions
- **Stripe Support:** https://support.stripe.com

---

## Summary

After completing all steps:

1. ✅ Stripe account created
2. ✅ API keys obtained
3. ✅ Products created (3 products)
4. ✅ Webhook configured
5. ✅ Environment variables added to Vercel
6. ✅ Tested with test cards
7. ✅ Verified credits are added
8. ✅ Ready for production (after testing)

Your Stripe integration is now complete! Users can subscribe and credits will be automatically added to their accounts.

