import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper function to get user ID from cookies
async function getUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const authTokenKey = `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`;
  const authToken = cookieStore.get(authTokenKey);
  
  if (authToken?.value) {
    try {
      const tokenData = JSON.parse(authToken.value);
      return tokenData.user?.id || null;
    } catch (e) {
      console.error('Failed to parse auth token:', e);
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    // Get user authentication
    let userId = await getUserIdFromCookies();
    
    // In demo mode, use the demo user ID
    if (!userId && process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      userId = process.env.NEXT_PUBLIC_DEMO_USER_ID || '550e8400-e29b-41d4-a716-446655440002';
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's account
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', userId)
      .single();

    if (userError || !userData?.account_id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Get account credit balance
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('promotional_credits, monthly_credits_remaining, monthly_credit_allocation')
      .eq('id', userData.account_id)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Unable to fetch account details' }, { status: 500 });
    }

    const totalCredits = (account.promotional_credits || 0) + (account.monthly_credits_remaining || 0);

    return NextResponse.json({
      success: true,
      credits: {
        total: totalCredits,
        promotional: account.promotional_credits || 0,
        monthly: account.monthly_credits_remaining || 0,
        monthlyAllocation: account.monthly_credit_allocation || 0
      }
    });

  } catch (error: any) {
    console.error('[Credits Balance API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch credit balance' },
      { status: 500 }
    );
  }
}