import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/onboarding';

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!error && data.session) {
        console.log('Email verification successful for user:', data.session.user.email);
        
        // Clear any pending verification email from localStorage (will be done on client side)
        const response = NextResponse.redirect(`${origin}${next}`);
        
        // Set auth cookies
        const maxAge = 100 * 365 * 24 * 60 * 60; // 100 years, let Supabase handle expiry
        response.cookies.set('supabase-auth-token', JSON.stringify(data.session), {
          maxAge,
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
        
        return response;
      }
    } catch (error) {
      console.error('Error during email verification:', error);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=verification_failed`);
}