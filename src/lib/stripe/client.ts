import Stripe from 'stripe';

// During build time, we might not have all env vars available
// Create stripe instance lazily to avoid build errors
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-07-30.basil',
      typescript: true,
    });
  }
  return stripeInstance;
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe];
  }
});

export async function createStripeCustomer(email: string, metadata?: Record<string, string>) {
  try {
    const customer = await getStripe().customers.create({
      email,
      metadata: metadata || {},
    });
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
) {
  try {
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata || {},
      subscription_data: {
        metadata: metadata || {},
      },
      // Allow customers to enter promotional codes
      allow_promotion_codes: true,
    });
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
) {
  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session;
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    throw error;
  }
}

export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await getStripe().subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return subscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

export async function getSubscription(subscriptionId: string) {
  try {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    throw error;
  }
}

export async function updateSubscription(
  subscriptionId: string,
  newPriceId: string
) {
  try {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    
    const updatedSubscription = await getStripe().subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });
    
    return updatedSubscription;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}