import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createCheckoutSession } from '@/lib/stripe/client';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
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

    const { priceId, planId } = await request.json();

    if (!priceId || !planId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user's account and customer info
    const { data: userData } = await supabase
      .from('users')
      .select('account_id, email')
      .eq('id', userId)
      .single();

    if (!userData?.account_id) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Get or create Stripe customer
    let { data: customer } = await supabase
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('account_id', userData.account_id)
      .single();

    if (!customer?.stripe_customer_id) {
      // Create customer if doesn't exist
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/billing/create-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email: userData.email,
          accountId: userData.account_id,
        }),
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to create customer' },
          { status: 500 }
        );
      }

      const result = await response.json();
      customer = { stripe_customer_id: result.customerId };
    }

    // Create checkout session
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`;

    const session = await createCheckoutSession(
      customer.stripe_customer_id,
      priceId,
      successUrl,
      cancelUrl,
      {
        account_id: userData.account_id,
        plan_id: planId,
        user_id: userId,
      }
    );

    return NextResponse.json({ 
      checkoutUrl: session.url,
      sessionId: session.id 
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}