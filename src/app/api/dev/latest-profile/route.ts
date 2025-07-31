import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// DEV ONLY: This endpoint should be removed in production
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the most recent user profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (profileError) {
      console.error('Error loading latest profile:', profileError);
      return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
    }

    // Get the email from auth.users
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profileData.user_id);

    const profileWithEmail = {
      ...profileData,
      email: userData.user?.email || 'No email found'
    };

    console.log(`DEV: Loaded latest profile for user ${profileData.user_id} (${profileWithEmail.email})`);
    return NextResponse.json({ profile: profileWithEmail });

  } catch (error) {
    console.error('Dev latest profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}