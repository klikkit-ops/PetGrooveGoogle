import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

/**
 * Create Stripe Checkout Session for subscription
 * POST /api/create-checkout-session
 * Body: { plan: 'weekly' | 'annual', userId: string }
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, userId } = req.body;

    if (!plan || !userId) {
      return res.status(400).json({ error: 'Missing required fields: plan and userId' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ 
        error: 'Stripe secret key not configured. Please set STRIPE_SECRET_KEY in Vercel environment variables.' 
      });
    }

    // Define subscription plans
    const plans = {
      weekly: {
        priceId: process.env.STRIPE_WEEKLY_PRICE_ID, // Stripe Price ID for weekly plan ($7.99/week)
        trialPriceId: process.env.STRIPE_WEEKLY_TRIAL_PRICE_ID, // Optional: $0.49 trial price ID
        credits: 1000,
        description: 'Weekly Subscription - 1000 credits/week',
        hasTrial: true,
      },
      annual: {
        priceId: process.env.STRIPE_ANNUAL_PRICE_ID, // Stripe Price ID for annual plan
        credits: 48000,
        description: 'Annual Subscription - 48000 credits/year',
        hasTrial: false,
      },
    };

    const selectedPlan = plans[plan as keyof typeof plans];
    
    if (!selectedPlan) {
      return res.status(400).json({ error: 'Invalid plan. Must be "weekly" or "annual"' });
    }

    if (!selectedPlan.priceId) {
      return res.status(500).json({ 
        error: `Stripe price ID not configured for ${plan} plan. Please set STRIPE_${plan.toUpperCase()}_PRICE_ID in Vercel environment variables.` 
      });
    }

    // Build line items - for weekly plan, include $0.49 trial charge + subscription
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    
    // For weekly plan with trial: add $0.49 trial product first, then subscription
    // Stripe Checkout CAN mix one-time and subscription items when mode is 'subscription'
    // The one-time item acts as an initial charge, then subscription starts
    if (plan === 'weekly' && selectedPlan.hasTrial && selectedPlan.trialPriceId) {
      lineItems.push({
        price: selectedPlan.trialPriceId, // $0.49 trial one-time charge
        quantity: 1,
      });
    }
    
    // Add the main subscription
    lineItems.push({
      price: selectedPlan.priceId,
      quantity: 1,
    });

    // Build subscription data
    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: {
        userId: userId,
        plan: plan,
        credits: selectedPlan.credits.toString(),
      },
    };

    // For weekly plan: configure 7-day trial period
    // The $0.49 is charged immediately (via trialPriceId line item above)
    // After 7 days, Stripe will start charging $7.99/week automatically
    if (plan === 'weekly' && selectedPlan.hasTrial) {
      subscriptionData.trial_period_days = 7;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin || 'https://petgroovegoogle.vercel.app'}/account?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'https://petgroovegoogle.vercel.app'}/account?canceled=true`,
      metadata: {
        userId: userId,
        plan: plan,
        credits: selectedPlan.credits.toString(),
      },
      customer_email: req.body.email, // Optional: pre-fill email
      subscription_data: subscriptionData,
    });

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create checkout session',
      details: error?.type || 'Unknown error',
    });
  }
}

