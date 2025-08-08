import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// DEV ONLY: This endpoint should be removed in production
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Create admin client to update the user directly
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

    // Manually confirm the user's email
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true
    });

    if (error) {
      console.error('Error confirming email:', error);
      return NextResponse.json({ error: 'Failed to confirm email' }, { status: 500 });
    }

    console.log(`DEV: Email confirmed for user ${userId}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Dev email confirmation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}