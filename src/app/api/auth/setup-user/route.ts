import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This API route sets up all necessary database records for a new user
export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();
    
    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    // Use service role key to ensure we can create all records
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseKey) {
      console.error('[Setup User] Service role key not found');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('[Setup User] Setting up user:', { userId, email });

    // 1. Check if account already exists
    const { data: existingAccount } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingAccount) {
      // Create account (using userId as accountId for individual accounts)
      const { error: accountError } = await supabase
        .from('accounts')
        .insert({
          id: userId, // Use user ID as account ID for personal accounts
          name: `${email.split('@')[0]}'s Workspace`,
          subscription_status: 'active',
          plan_type: 'individual',
          billing_email: email,
          promotional_credits: 1000, // Give new users 1000 free credits to start
          monthly_credits_remaining: 0,
          creator_limit: 5,
          user_limit: 1,
          voice_model_limit: 5,
          storage_limit_gb: 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (accountError) {
        console.error('[Setup User] Error creating account:', accountError);
        return NextResponse.json(
          { error: `Failed to create account: ${accountError.message}` },
          { status: 500 }
        );
      }
      console.log('[Setup User] Account created successfully');
    }

    // 2. Check if user record exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      // Create user record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          account_id: userId, // Same as account ID for personal accounts
          email: email,
          role: 'owner',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (userError && userError.code !== '23505') { // Ignore if already exists
        console.error('[Setup User] Error creating user record:', userError);
        return NextResponse.json(
          { error: `Failed to create user record: ${userError.message}` },
          { status: 500 }
        );
      }
      console.log('[Setup User] User record created successfully');
    }

    // 3. Check if user profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!existingProfile) {
      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          email: email,
          first_name: '',
          last_name: '',
          social_media_handles: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError && profileError.code !== '23505') { // Ignore if already exists
        console.error('[Setup User] Error creating user profile:', profileError);
        return NextResponse.json(
          { error: `Failed to create user profile: ${profileError.message}` },
          { status: 500 }
        );
      }
      console.log('[Setup User] User profile created successfully');
    }

    return NextResponse.json({ 
      success: true,
      userId,
      accountId: userId,
      message: 'User setup completed successfully'
    });

  } catch (error) {
    console.error('[Setup User] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}