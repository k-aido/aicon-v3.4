import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// DEV ONLY: This endpoint should be removed in production
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const { userId, firstName, lastName, socialHandles } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

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

    // Update the user profile
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        social_media_handles: socialHandles,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    console.log(`DEV: Updated profile for user ${userId}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Dev profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}