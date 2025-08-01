import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  console.log('Middleware hit:', request.nextUrl.pathname)
  const response = NextResponse.next()
  
  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers })
    }
  }
  
  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  
  // Auth protection - Create supabase client for middleware
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: {
          getItem: (key: string) => {
            const cookie = request.cookies.get(key);
            console.log('Cookie lookup:', { key, value: cookie?.value ? 'found' : 'not found' });
            return cookie?.value || null;
          },
          setItem: (key: string, value: string) => {
            console.log('Cookie set attempt:', { key, hasValue: !!value });
            // We can't set cookies in middleware, but log the attempt
          },
          removeItem: (key: string) => {
            console.log('Cookie remove attempt:', { key });
          },
        },
      },
    }
  )

  // Try to get the session
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession()
  
  if (sessionError) {
    console.log('Session error:', sessionError);
  }
  
  console.log('Session check:', { path: request.nextUrl.pathname, hasSession: !!session, userId: session?.user?.id })
  
  // DEV ONLY: Bypass auth checks for localhost development
  const isDev = process.env.NODE_ENV === 'development';
  const isLocalhost = request.nextUrl.hostname === 'localhost';
  
  if (isDev && isLocalhost) {
    console.log('DEV MODE: Bypassing auth checks for localhost');
  } else {
    // Protected routes (only in production or non-localhost)
    const protectedRoutes = ['/canvas', '/settings', '/onboarding'];
    const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route));
    
    if (isProtectedRoute) {
      if (!session) {
        console.log(`No session for ${request.nextUrl.pathname}, redirecting to login`)
        return NextResponse.redirect(new URL('/login', request.url))
      }
      
      // Check email verification for protected routes (except verify-email page)
      if (!session.user.email_confirmed_at && !request.nextUrl.pathname.startsWith('/verify-email')) {
        console.log(`Email not verified for ${request.nextUrl.pathname}, redirecting to verification`)
        return NextResponse.redirect(new URL(`/verify-email?email=${encodeURIComponent(session.user.email || '')}`, request.url))
      }
    }
  }

  // Note: /onboarding is intentionally NOT protected to allow new users to complete profile

  // Redirect logged-in users away from login
  if (request.nextUrl.pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/canvas', request.url))
  }

  // Redirect root to login if not authenticated
  if (request.nextUrl.pathname === '/' && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect root to canvas if authenticated
  if (request.nextUrl.pathname === '/' && session) {
    return NextResponse.redirect(new URL('/canvas', request.url))
  }
  
  return response
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}