import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe/client';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  console.log('[Change Plan API] Received POST request');
  
  try {
    const body = await request.json();
    console.log('[Change Plan API] Request body:', body);
    const { newPriceId, newPriceLookupKey } = body;

    // Support both price ID and lookup key for backwards compatibility
    const priceIdentifier = newPriceId || newPriceLookupKey;
    
    if (!priceIdentifier) {
      return NextResponse.json({ error: 'Price ID or lookup key is required' }, { status: 400 });
    }

    // Get session from cookies
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const authTokenKey = `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`;
    const authToken = cookieStore.get(authTokenKey);
    
    let userId = null;
    
    if (authToken?.value) {
      try {
        const tokenData = JSON.parse(authToken.value);
        userId = tokenData.user?.id;
      } catch (e) {
        console.error('Failed to parse auth token:', e);
      }
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's account and subscription
    const { data: userData } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', userId)
      .single();

    if (!userData?.account_id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Get current subscription
    const { data: account } = await supabase
      .from('accounts')
      .select('stripe_subscription_id')
      .eq('id', userData.account_id)
      .single();

    if (!account?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Get the new price - try direct ID first, then lookup key
    let newPrice;
    
    // Check if it looks like a price ID (starts with 'price_')
    if (priceIdentifier.startsWith('price_')) {
      console.log('Looking up price by ID:', priceIdentifier);
      try {
        newPrice = await stripe.prices.retrieve(priceIdentifier, {
          expand: ['product']
        });
        console.log('Found price by ID:', newPrice.id);
      } catch (error) {
        console.log('Price ID not found, trying as lookup key');
      }
    }
    
    // If not found by ID, try as lookup key
    if (!newPrice) {
      console.log('Looking up price with lookup key:', priceIdentifier);
      const prices = await stripe.prices.list({
        lookup_keys: [priceIdentifier],
        expand: ['data.product']
      });

      if (prices.data.length === 0) {
        console.error('No price found for identifier:', priceIdentifier);
        return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
      }
      
      newPrice = prices.data[0];
    }
    
    console.log('New price details:', { id: newPrice.id, lookup_key: newPrice.lookup_key });

    // Get current subscription from Stripe
    console.log('Retrieving subscription:', account.stripe_subscription_id);
    const subscription = await stripe.subscriptions.retrieve(account.stripe_subscription_id);
    
    console.log('Current subscription items:', subscription.items.data.map(item => ({
      id: item.id,
      price_id: item.price.id,
      lookup_key: item.price.lookup_key
    })));
    
    // Check if already on this plan
    if (subscription.items.data[0].price.id === newPrice.id) {
      console.log('Already on this plan');
      return NextResponse.json({ error: 'Already subscribed to this plan' }, { status: 400 });
    }
    
    // Determine if this is an upgrade or downgrade
    const currentPrice = subscription.items.data[0].price;
    const isUpgrade = (newPrice.unit_amount || 0) > (currentPrice.unit_amount || 0);
    
    console.log('Price comparison:', {
      current: currentPrice.unit_amount,
      new: newPrice.unit_amount,
      isUpgrade
    });
    
    // Update the subscription with appropriate proration behavior
    console.log('Updating subscription with new price...');
    const updateParams: any = {
      items: [{
        id: subscription.items.data[0].id,
        price: newPrice.id,
      }],
      // Always create prorations for both upgrades and downgrades
      proration_behavior: 'always_invoice',
    };
    
    // For upgrades, ensure immediate payment
    if (isUpgrade) {
      // This will charge the customer immediately for the prorated amount
      updateParams.payment_behavior = 'pending_if_incomplete';
      // Optionally, you can also set this to require immediate payment
      // updateParams.payment_behavior = 'error_if_incomplete';
    } else {
      // For downgrades, allow the change even if payment fails (they get credit)
      updateParams.payment_behavior = 'allow_incomplete';
    }
    
    const updatedSubscription = await stripe.subscriptions.update(
      account.stripe_subscription_id, 
      updateParams
    );

    console.log('Subscription updated successfully:', {
      id: updatedSubscription.id,
      status: updatedSubscription.status,
      new_price: updatedSubscription.items.data[0].price.id,
      new_lookup_key: updatedSubscription.items.data[0].price.lookup_key
    });

    return NextResponse.json({ 
      success: true,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        price_id: updatedSubscription.items.data[0].price.id
      },
      isUpgrade,
      message: isUpgrade 
        ? 'Your plan has been upgraded and you will be charged the prorated difference immediately.'
        : 'Your plan has been downgraded. The prorated credit will be applied to your next invoice.'
    });

  } catch (error: any) {
    console.error('Error changing plan:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json({ error: 'Payment failed. Please update your payment method.' }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to change plan' },
      { status: 500 }
    );
  }
}