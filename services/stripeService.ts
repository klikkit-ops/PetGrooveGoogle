import { loadStripe } from '@stripe/stripe-js';

/**
 * Initialize Stripe with publishable key
 */
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

/**
 * Create a checkout session and redirect to Stripe
 */
export const createCheckoutSession = async (
  plan: 'weekly' | 'annual',
  userId: string,
  email?: string
): Promise<{ url: string | null; error?: string }> => {
  try {
    if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
      return {
        url: null,
        error: 'Stripe publishable key not configured. Please set VITE_STRIPE_PUBLISHABLE_KEY in environment variables.',
      };
    }

    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan,
        userId,
        email,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const data = await response.json();
    return { url: data.url };
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return {
      url: null,
      error: error.message || 'Failed to create checkout session',
    };
  }
};

/**
 * Redirect to Stripe Checkout
 */
export const redirectToCheckout = async (
  plan: 'weekly' | 'annual',
  userId: string,
  email?: string
): Promise<void> => {
  const stripe = await stripePromise;
  if (!stripe) {
    throw new Error('Stripe failed to load');
  }

  const { url, error } = await createCheckoutSession(plan, userId, email);
  
  if (error || !url) {
    throw new Error(error || 'Failed to create checkout session');
  }

  // Redirect to Stripe Checkout
  window.location.href = url;
};

