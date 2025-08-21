import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createStripeCustomer } from '@/lib/stripe/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, email, accountId } = await request.json();

    if (!userId || !email || !accountId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if customer already exists
    const { data: existingCustomer } = await supabase
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('account_id', accountId)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      console.log('Customer already exists:', existingCustomer.stripe_customer_id);
      return NextResponse.json({ 
        customerId: existingCustomer.stripe_customer_id,
        message: 'Customer already exists' 
      });
    }

    // Create Stripe customer
    const stripeCustomer = await createStripeCustomer(email, {
      supabase_account_id: accountId,
      supabase_user_id: userId,
    });

    // Store customer in database
    const { error: dbError } = await supabase
      .from('billing_customers')
      .insert({
        account_id: accountId,
        stripe_customer_id: stripeCustomer.id,
        email: email,
      });

    if (dbError) {
      console.error('Error storing customer in database:', dbError);
      // Try to delete the Stripe customer if database insert fails
      // Note: In production, you might want to handle this with a webhook instead
      return NextResponse.json(
        { error: 'Failed to store customer data' },
        { status: 500 }
      );
    }

    // Update account with stripe_customer_id (don't set credits here - they're set during account creation)
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ 
        stripe_customer_id: stripeCustomer.id,
        credits_reset_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', accountId);

    if (updateError) {
      console.error('Error updating account:', updateError);
    }

    console.log('Successfully created Stripe customer:', stripeCustomer.id);

    return NextResponse.json({ 
      customerId: stripeCustomer.id,
      message: 'Customer created successfully' 
    });

  } catch (error) {
    console.error('Error in create-customer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}