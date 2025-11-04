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
        priceId: process.env.STRIPE_WEEKLY_PRICE_ID, // Stripe Price ID for weekly plan
        credits: 1000,
        description: 'Weekly Subscription - 1000 credits/week',
      },
      annual: {
        priceId: process.env.STRIPE_ANNUAL_PRICE_ID, // Stripe Price ID for annual plan
        credits: 48000,
        description: 'Annual Subscription - 48000 credits/year',
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
      subscription_data: {
        metadata: {
          userId: userId,
          plan: plan,
          credits: selectedPlan.credits.toString(),
        },
      },
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

