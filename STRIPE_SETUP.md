# Stripe Integration Setup Guide

This guide will help you set up Stripe subscriptions for PetGroove.

## Step 1: Create Stripe Account and Get API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/register)
2. Complete account setup
3. Go to **Developers → API keys**
4. Copy:
   - **Publishable key** (starts with `pk_...`)
   - **Secret key** (starts with `sk_...`) - Keep this secret!

## Step 2: Create Subscription Products in Stripe

### Weekly Plan ($0.49 trial → $7.99/week)

1. Go to **Products → Add Product**
2. Create product:
   - **Name:** "PetGroove Weekly Subscription"
   - **Description:** "Weekly subscription - 1000 credits/week (2 video generations)"
   - **Pricing model:** Recurring
   - **Price:** $7.99 USD
   - **Billing period:** Weekly
   - **Trial period:** 7 days (optional - Stripe Checkout can handle this)
   - Click **Save product**
3. Copy the **Price ID** (starts with `price_...`)
   - This is your `STRIPE_WEEKLY_PRICE_ID`

### Annual Plan ($69.99/year)

1. Go to **Products → Add Product**
2. Create product:
   - **Name:** "PetGroove Annual Subscription"
   - **Description:** "Annual subscription - 48000 credits/year (96 video generations)"
   - **Pricing model:** Recurring
   - **Price:** $69.99 USD
   - **Billing period:** Yearly
   - Click **Save product**
3. Copy the **Price ID** (starts with `price_...`)
   - This is your `STRIPE_ANNUAL_PRICE_ID`

### Weekly Plan ($0.49 trial → $7.99/week)

**IMPORTANT:** You need to create TWO products for the weekly plan:

#### Step 1: Create the $0.49 Trial Product (One-time charge)

1. Go to **Products → Add Product**
2. Create product:
   - **Name:** "PetGroove Weekly Trial"
   - **Description:** "7-day trial for Weekly Subscription"
   - **Pricing model:** One-time
   - **Price:** $0.49 USD
   - Click **Save product**
3. Copy the **Price ID** (starts with `price_...`)
   - This is your `STRIPE_WEEKLY_TRIAL_PRICE_ID`

#### Step 2: Create the $7.99/week Subscription Product

1. Go to **Products → Add Product**
2. Create product:
   - **Name:** "PetGroove Weekly Subscription"
   - **Description:** "Weekly subscription - 1000 credits/week (2 video generations)"
   - **Pricing model:** Recurring
   - **Price:** $7.99 USD
   - **Billing period:** Weekly
   - Click **Save product**
3. Copy the **Price ID** (starts with `price_...`)
   - This is your `STRIPE_WEEKLY_PRICE_ID`

**How it works:**
- Customer pays $0.49 immediately (trial product)
- Subscription starts with 7-day trial period
- After 7 days, Stripe charges $7.99/week automatically

### Annual Plan ($69.99/year)

## Step 3: Set Up Stripe Webhook

1. Go to **Developers → Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL:** `https://your-vercel-app.vercel.app/api/webhooks/stripe`
   - Replace `your-vercel-app` with your actual Vercel app URL
4. **Description:** "PetGroove Subscription Webhook"
5. **Select events to listen to:**
   - `checkout.session.completed` ✅
   - `customer.subscription.updated` ✅
   - `customer.subscription.deleted` ✅
   - `invoice.payment_succeeded` ✅ (for recurring payments)
6. Click **Add endpoint**
7. Copy the **Signing secret** (starts with `whsec_...`)
   - This is your `STRIPE_WEBHOOK_SECRET`

## Step 4: Add Environment Variables to Vercel

Go to your Vercel project → **Settings → Environment Variables** and add:

### Required Variables:

```
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_... for production)
STRIPE_WEEKLY_TRIAL_PRICE_ID=price_... (for $0.49 trial charge)
STRIPE_WEEKLY_PRICE_ID=price_... (for $7.99/week subscription)
STRIPE_ANNUAL_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Optional (for webhook to work):

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... (Service Role Key, not Anon Key)
```

**Important:** 
- Variables prefixed with `VITE_` are available in the browser
- Variables WITHOUT `VITE_` prefix are server-side only
- Never expose `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` to the frontend

## Step 5: Test the Integration

### Test Mode:

1. Use Stripe test cards:
   - **Success:** `4242 4242 4242 4242`
   - **Decline:** `4000 0000 0000 0002`
   - **Expiry:** Any future date (e.g., `12/34`)
   - **CVC:** Any 3 digits (e.g., `123`)

2. Test the flow:
   - Click "Start 7-Day Trial" or "Select Annual"
   - Complete checkout with test card
   - Verify credits are added to account
   - Check webhook logs in Stripe Dashboard

### Production:

1. Switch to **Live mode** in Stripe Dashboard
2. Update environment variables with live keys
3. Update webhook endpoint URL to production domain
4. Redeploy on Vercel

## Troubleshooting

### Webhook Not Receiving Events:

1. Check webhook endpoint URL is correct
2. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
3. Check Vercel function logs for errors
4. Use Stripe CLI for local testing:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

### Credits Not Adding:

1. Check Supabase credentials (`SUPABASE_SERVICE_ROLE_KEY`)
2. Verify webhook is receiving `checkout.session.completed` events
3. Check Vercel function logs
4. Verify `userId` is being passed correctly in metadata

### Checkout Not Loading:

1. Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set
2. Check browser console for errors
3. Verify API route `/api/create-checkout-session` is accessible

## Next Steps

- [ ] Set up Stripe products and prices
- [ ] Configure webhook endpoint
- [ ] Add environment variables to Vercel
- [ ] Test checkout flow
- [ ] Test webhook credit addition
- [ ] Set up production keys when ready

