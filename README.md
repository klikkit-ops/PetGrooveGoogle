# Pet Dance Party - Deployment Guide

This is a React + Vite application that generates dancing pet videos using Google's Gemini API. This guide will walk you through deploying to Vercel and setting up Supabase and Stripe integration.

## Prerequisites

- Node.js 18+ installed
- A GitHub account (for Vercel deployment)
- A Vercel account (free tier available)
- A Supabase account (free tier available)
- A Stripe account (for payment processing)

---

## 🚀 Quick Start - Local Development

1. **Clone the repository** (if not already done:**
   ```bash
   git clone <your-repo-url>
   cd PetGrooveGoogle
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a `.env` file in the root directory:**
   ```bash
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3000`

---

## 📦 Deployment to Vercel

### Step 1: Prepare Your Repository

1. **Initialize Git** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Push to GitHub:**
   - Create a new repository on GitHub
   - Link your local repository:
     ```bash
     git remote add origin https://github.com/yourusername/your-repo-name.git
     git branch -M main
     git push -u origin main
     ```

### Step 2: Deploy to Vercel

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**

2. **Click "Add New..." → "Project"**

3. **Import your GitHub repository:**
   - Select the repository you just pushed
   - Click "Import"

4. **Configure Project Settings:**
   - **Framework Preset:** Vite (should auto-detect)
   - **Root Directory:** `./` (default)
   - **Build Command:** `npm run build` (auto-filled)
   - **Output Directory:** `dist` (auto-filled)
   - **Install Command:** `npm install` (auto-filled)

5. **Add Environment Variables:**
   - Click "Environment Variables"
   - Add the following:
     ```
     VITE_GEMINI_API_KEY = your_gemini_api_key_here
     ```
   - Click "Save"

6. **Deploy:**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `https://your-project-name.vercel.app`

### Step 3: Verify Deployment

- Visit your deployment URL
- Check that the app loads correctly
- Test video generation functionality

---

## 🗄️ Setting Up Supabase

### Step 1: Create a Supabase Project

1. **Go to [Supabase Dashboard](https://supabase.com/dashboard)**

2. **Click "New Project"**

3. **Fill in project details:**
   - Project Name: `pet-dance-party` (or your preferred name)
   - Database Password: Create a strong password (save it!)
   - Region: Choose closest to your users
   - Click "Create new project"

4. **Wait for project initialization** (takes ~2 minutes)

### Step 2: Create Database Schema

1. **Go to SQL Editor in Supabase Dashboard**

2. **Run the following SQL to create tables:**

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Videos table
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  dance_type TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credits table
CREATE TABLE credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL, -- 'free', 'purchase', 'referral'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth requirements)
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Users can view own videos" ON videos
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own videos" ON videos
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own credits" ON credits
  FOR SELECT USING (auth.uid()::text = user_id::text);
```

### Step 3: Get Supabase Credentials

1. **Go to Project Settings → API**

2. **Copy the following:**
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - Anon/Public Key (starts with `eyJ...`)
   - Service Role Key (keep this secret!)

### Step 4: Add Supabase to Your App

1. **Install Supabase client:**
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Add Supabase environment variables to Vercel:**
   - Go to your Vercel project → Settings → Environment Variables
   - Add:
     ```
     VITE_SUPABASE_URL = your_supabase_project_url
     VITE_SUPABASE_ANON_KEY = your_supabase_anon_key
     ```

3. **Update your local `.env` file:**
   ```
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

---

## 💳 Setting Up Stripe

### Step 1: Create a Stripe Account

1. **Go to [Stripe Dashboard](https://dashboard.stripe.com/register)**

2. **Complete account setup**

3. **Get your API keys:**
   - Go to Developers → API keys
   - Copy your **Publishable key** (starts with `pk_...`)
   - Copy your **Secret key** (starts with `sk_...`) - Keep this secret!

### Step 2: Create Products & Prices

1. **Go to Products → Add Product**

2. **Create a credit package:**
   - Name: "10 Credits Package"
   - Price: $9.99 (or your preferred price)
   - Billing: One-time
   - Click "Save product"
   - Copy the **Price ID** (starts with `price_...`)

3. **Create additional packages as needed** (e.g., 25 credits, 50 credits)

### Step 3: Set Up Stripe Webhook (for production)

1. **Go to Developers → Webhooks**

2. **Click "Add endpoint"**

3. **Endpoint URL:** `https://your-vercel-app.vercel.app/api/webhooks/stripe`
   (You'll need to create an API route for this)

4. **Select events to listen to:**
   - `checkout.session.completed`
   - `payment_intent.succeeded`

5. **Copy the webhook signing secret** (starts with `whsec_...`)

### Step 4: Add Stripe to Your App

1. **Install Stripe:**
   ```bash
   npm install @stripe/stripe-js
   ```

2. **Add Stripe environment variables to Vercel:**
   ```
   VITE_STRIPE_PUBLISHABLE_KEY = your_stripe_publishable_key
   ```

3. **For server-side operations (webhooks), create a Vercel serverless function:**
   - Create `api/webhooks/stripe.ts`
   - Use Stripe secret key (set as `STRIPE_SECRET_KEY` in Vercel - not prefixed with VITE_)

4. **Update your local `.env` file:**
   ```
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   ```

---

## 🔐 Environment Variables Summary

### Required for Vercel Deployment:

| Variable Name | Description | Where to Get It |
|--------------|-------------|----------------|
| `VITE_GEMINI_API_KEY` | Google Gemini API key | [Google AI Studio](https://aistudio.google.com/apikey) |
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard → Settings → API |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Stripe Dashboard → Developers → API keys |

### Optional (for server-side operations):

| Variable Name | Description | Notes |
|--------------|-------------|-------|
| `STRIPE_SECRET_KEY` | Stripe secret key | Only for serverless functions (not prefixed with VITE_) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | For webhook verification |

---

## 📝 Next Steps for Integration

### Supabase Integration:

1. **Create a Supabase client utility:**
   ```typescript
   // services/supabaseClient.ts
   import { createClient } from '@supabase/supabase-js'
   
   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
   
   export const supabase = createClient(supabaseUrl, supabaseAnonKey)
   ```

2. **Implement authentication:**
   - Replace mock login in `App.tsx` with Supabase auth
   - Use `supabase.auth.signInWithPassword()` or OAuth providers

3. **Store videos and credits in Supabase:**
   - Update `AppContext` to sync with Supabase
   - Use `supabase.from('videos').insert()` for saving videos
   - Use `supabase.from('credits').select()` for fetching credits

### Stripe Integration:

1. **Create a checkout component:**
   ```typescript
   // components/Checkout.tsx
   import { loadStripe } from '@stripe/stripe-js'
   
   const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
   ```

2. **Create a serverless function for checkout:**
   ```typescript
   // api/checkout.ts (Vercel serverless function)
   import Stripe from 'stripe'
   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
   ```

3. **Handle payment success:**
   - Create webhook handler to update credits in Supabase
   - Redirect users after successful payment

---

## 🛠️ Troubleshooting

### Build Fails on Vercel:

- **Check Node.js version:** Ensure you're using Node 18+ (specify in `package.json` if needed)
- **Check environment variables:** All `VITE_*` variables must be set in Vercel
- **Check build output:** Review build logs in Vercel dashboard

### API Key Not Working:

- **Verify environment variable name:** Must be `VITE_GEMINI_API_KEY` (with `VITE_` prefix)
- **Check API key validity:** Test in Google AI Studio
- **Redeploy after changes:** Vercel requires a new deployment for env var changes

### Supabase Connection Issues:

- **Check URL format:** Should be `https://xxxxx.supabase.co`
- **Verify RLS policies:** Make sure your policies allow the operations you're trying to perform
- **Check CORS settings:** Ensure your Vercel domain is allowed

### Stripe Payment Issues:

- **Use test mode first:** Test with Stripe test cards before going live
- **Check webhook endpoint:** Ensure it's publicly accessible
- **Verify webhook secret:** Must match the one in Stripe dashboard

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)

---

## 🎉 You're All Set!

Your app should now be:
- ✅ Deployed to Vercel
- ✅ Connected to Supabase (after integration)
- ✅ Ready for Stripe payments (after integration)

Happy coding! 🚀
