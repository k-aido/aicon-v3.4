import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createBillingPortalSession } from '@/lib/stripe/client';
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

    // Get user's account and customer info
    const { data: userData } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', userId)
      .single();

    if (!userData?.account_id) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Get Stripe customer
    const { data: customer } = await supabase
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('account_id', userData.account_id)
      .single();

    if (!customer?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing customer found' },
        { status: 404 }
      );
    }

    // Create billing portal session
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/billing`;
    const session = await createBillingPortalSession(
      customer.stripe_customer_id,
      returnUrl
    );

    return NextResponse.json({ 
      portalUrl: session.url 
    });

  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}