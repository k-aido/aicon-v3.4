import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe/client';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { cancelImmediately = false } = await request.json();

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

    console.log('Canceling subscription:', account.stripe_subscription_id, 'immediately:', cancelImmediately);

    let canceledSubscription;

    if (cancelImmediately) {
      // Cancel immediately
      canceledSubscription = await stripe.subscriptions.cancel(account.stripe_subscription_id);
      console.log('Subscription canceled immediately');
    } else {
      // Cancel at period end (default behavior)
      canceledSubscription = await stripe.subscriptions.update(account.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      console.log('Subscription set to cancel at period end');
    }

    return NextResponse.json({ 
      success: true,
      subscription: {
        id: canceledSubscription.id,
        status: canceledSubscription.status,
        cancel_at_period_end: canceledSubscription.cancel_at_period_end,
        current_period_end: canceledSubscription.current_period_end,
        canceled_at: canceledSubscription.canceled_at
      }
    });

  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}