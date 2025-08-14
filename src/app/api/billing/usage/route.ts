import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { CREDIT_USAGE_RATES } from '@/types/billing';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
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

    // Get user's account
    const { data: userData } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', userId)
      .single();

    if (!userData?.account_id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Get account with credit info
    const { data: account } = await supabase
      .from('accounts')
      .select('promotional_credits, monthly_credits_remaining, monthly_credit_allocation')
      .eq('id', userData.account_id)
      .single();

    // Get current month's usage
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const { data: usage } = await supabase
      .from('billing_usage')
      .select('*')
      .eq('account_id', userData.account_id)
      .gte('billing_period_start', startOfMonth.toISOString().split('T')[0])
      .lte('billing_period_end', endOfMonth.toISOString().split('T')[0])
      .single();

    // Get billing customer first
    const { data: billingCustomer } = await supabase
      .from('billing_customers')
      .select('id')
      .eq('account_id', userData.account_id)
      .single();

    // Get subscription info
    let subscription = null;
    if (billingCustomer) {
      const { data: subData } = await supabase
        .from('billing_subscriptions')
        .select('*, billing_plans(*)')
        .eq('billing_customer_id', billingCustomer.id)
        .eq('status', 'active')
        .single();
      subscription = subData;
    }

    return NextResponse.json({
      account: {
        promotional_credits: account?.promotional_credits || 0,
        monthly_credits_remaining: account?.monthly_credits_remaining || 0,
        monthly_credit_allocation: account?.monthly_credit_allocation || 0,
      },
      usage: usage || {
        promotional_credits_used: 0,
        monthly_credits_used: 0,
        total_credits_used: 0,
        usage_details: {},
      },
      subscription: subscription || null,
      credit_rates: CREDIT_USAGE_RATES,
    });

  } catch (error) {
    console.error('Error fetching usage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const { usageType, amount = 1 } = await request.json();

    if (!usageType) {
      return NextResponse.json(
        { error: 'Usage type is required' },
        { status: 400 }
      );
    }

    // Calculate credits needed
    let creditsNeeded = 0;
    switch (usageType) {
      case 'content_analysis':
        creditsNeeded = CREDIT_USAGE_RATES.content_analysis * amount;
        break;
      case 'script_generation':
        creditsNeeded = CREDIT_USAGE_RATES.script_generation * amount;
        break;
      case 'voice_generation':
        creditsNeeded = CREDIT_USAGE_RATES.voice_generation_per_minute * amount;
        break;
      case 'avatar_generation':
        creditsNeeded = CREDIT_USAGE_RATES.avatar_generation_per_minute * amount;
        break;
      case 'chat_completion':
        creditsNeeded = CREDIT_USAGE_RATES.chat_completion * amount;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid usage type' },
          { status: 400 }
        );
    }

    // Get user's account
    const { data: userData } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', userId)
      .single();

    if (!userData?.account_id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Get account with credit info
    const { data: account } = await supabase
      .from('accounts')
      .select('promotional_credits, monthly_credits_remaining')
      .eq('id', userData.account_id)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check if user has enough credits
    const totalAvailable = (account.promotional_credits || 0) + (account.monthly_credits_remaining || 0);
    if (totalAvailable < creditsNeeded) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits',
          required: creditsNeeded,
          available: totalAvailable 
        },
        { status: 402 }
      );
    }

    // Deduct credits (promotional first, then monthly)
    let promotionalUsed = 0;
    let monthlyUsed = 0;
    let remainingToDeduct = creditsNeeded;

    if (account.promotional_credits > 0) {
      promotionalUsed = Math.min(account.promotional_credits, remainingToDeduct);
      remainingToDeduct -= promotionalUsed;
    }

    if (remainingToDeduct > 0) {
      monthlyUsed = remainingToDeduct;
    }

    // Update account credits
    const { error: updateError } = await supabase
      .from('accounts')
      .update({
        promotional_credits: Math.max(0, account.promotional_credits - promotionalUsed),
        monthly_credits_remaining: Math.max(0, account.monthly_credits_remaining - monthlyUsed),
      })
      .eq('id', userData.account_id);

    if (updateError) {
      console.error('Error updating credits:', updateError);
      return NextResponse.json(
        { error: 'Failed to update credits' },
        { status: 500 }
      );
    }

    // Update or create usage record for current month
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const { data: existingUsage } = await supabase
      .from('billing_usage')
      .select('*')
      .eq('account_id', userData.account_id)
      .eq('billing_period_start', startOfMonth.toISOString().split('T')[0])
      .single();

    if (existingUsage) {
      // Update existing usage
      const usageDetails = existingUsage.usage_details || {};
      usageDetails[usageType] = (usageDetails[usageType] || 0) + amount;

      await supabase
        .from('billing_usage')
        .update({
          promotional_credits_used: existingUsage.promotional_credits_used + promotionalUsed,
          monthly_credits_used: existingUsage.monthly_credits_used + monthlyUsed,
          total_credits_used: existingUsage.total_credits_used + creditsNeeded,
          usage_details: usageDetails,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUsage.id);
    } else {
      // Create new usage record
      const usageDetails: any = {};
      usageDetails[usageType] = amount;

      await supabase
        .from('billing_usage')
        .insert({
          account_id: userData.account_id,
          billing_period_start: startOfMonth.toISOString().split('T')[0],
          billing_period_end: endOfMonth.toISOString().split('T')[0],
          promotional_credits_used: promotionalUsed,
          monthly_credits_used: monthlyUsed,
          total_credits_used: creditsNeeded,
          usage_details: usageDetails,
        });
    }

    return NextResponse.json({
      success: true,
      creditsUsed: creditsNeeded,
      promotionalUsed,
      monthlyUsed,
      remainingPromotional: Math.max(0, account.promotional_credits - promotionalUsed),
      remainingMonthly: Math.max(0, account.monthly_credits_remaining - monthlyUsed),
    });

  } catch (error) {
    console.error('Error tracking usage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}