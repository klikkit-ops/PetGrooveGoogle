import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Stripe Webhook Handler
 * Handles subscription events and updates credits in Supabase
 * POST /api/webhooks/stripe
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event: Stripe.Event;

  try {
    // Vercel may send body as string or buffer, ensure it's a buffer
    const body = typeof req.body === 'string' ? Buffer.from(req.body) : req.body;
    
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.metadata) {
          const userId = session.metadata.userId;
          const credits = parseInt(session.metadata.credits || '0', 10);
          const plan = session.metadata.plan;

          if (userId && credits > 0) {
            // Add credits to user account
            // Note: This uses Supabase client - we'll need to initialize it server-side
            // For now, we'll use a direct Supabase call
            const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (supabaseServiceKey && supabaseUrl) {
              const { createClient } = await import('@supabase/supabase-js');
              const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
                auth: {
                  autoRefreshToken: false,
                  persistSession: false,
                },
              });

              const { error } = await supabaseAdmin
                .from('credits')
                .insert({
                  user_id: userId,
                  amount: credits,
                  source: 'purchase',
                });

              if (error) {
                console.error('Error adding credits:', error);
                return res.status(500).json({ error: 'Failed to add credits' });
              }

              console.log(`Added ${credits} credits to user ${userId} for ${plan} subscription`);
            } else {
              console.error('Supabase credentials not configured for webhook');
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle subscription updates/cancellations if needed
        console.log(`Subscription ${subscription.id} ${event.type}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        
        if (subscriptionId) {
          // Get subscription to find user
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;
          const credits = parseInt(subscription.metadata?.credits || '0', 10);
          const plan = subscription.metadata?.plan || 'weekly';

          if (userId && credits > 0) {
            // Add recurring credits for subscription renewal
            const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (supabaseServiceKey && supabaseUrl) {
              const { createClient } = await import('@supabase/supabase-js');
              const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
                auth: {
                  autoRefreshToken: false,
                  persistSession: false,
                },
              });

              await supabaseAdmin
                .from('credits')
                .insert({
                  user_id: userId,
                  amount: credits,
                  source: 'purchase',
                });

              console.log(`Added ${credits} recurring credits to user ${userId} for ${plan} subscription renewal`);
            }
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

