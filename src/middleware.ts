import { NextRequest, NextResponse } from 'next/server'

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
  
  // Skip auth checks for static assets and API routes that don't need auth
  const pathname = request.nextUrl.pathname
  const isStaticAsset = pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|otf)$/i)
  const isPublicApiRoute = pathname.startsWith('/api/auth') || pathname.startsWith('/api/dev')
  
  if (isStaticAsset || isPublicApiRoute) {
    return response
  }
  
  // Simple session check via cookie without creating Supabase client
  // This avoids thousands of auth server requests
  const cookieKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`
  const sessionCookie = request.cookies.get(cookieKey)
  
  // Parse session from cookie if it exists
  let session = null
  if (sessionCookie?.value) {
    try {
      const parsed = JSON.parse(sessionCookie.value)
      // Basic validation that this looks like a session
      if (parsed && parsed.access_token && parsed.user) {
        session = parsed
      }
    } catch (e) {
      console.log('Failed to parse session cookie')
    }
  }
  
  console.log('Session check:', { path: pathname, hasSession: !!session, userId: session?.user?.id })
  
  // DEV ONLY: Bypass auth checks for localhost development
  const isDev = process.env.NODE_ENV === 'development';
  const isLocalhost = request.nextUrl.hostname === 'localhost';
  
  if (isDev && isLocalhost) {
    console.log('DEV MODE: Bypassing auth checks for localhost');
  } else {
    // Protected routes (only in production or non-localhost)
    const protectedRoutes = ['/canvas', '/settings', '/onboarding'];
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    
    if (isProtectedRoute) {
      if (!session) {
        console.log(`No session for ${pathname}, redirecting to login`)
        return NextResponse.redirect(new URL('/login', request.url))
      }
      
      // Check email verification for protected routes (except verify-email page)
      if (!session.user.email_confirmed_at && !pathname.startsWith('/verify-email')) {
        console.log(`Email not verified for ${pathname}, redirecting to verification`)
        return NextResponse.redirect(new URL(`/verify-email?email=${encodeURIComponent(session.user.email || '')}`, request.url))
      }
    }
  }

  // Note: /onboarding is intentionally NOT protected to allow new users to complete profile

  // Redirect logged-in users away from login
  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/canvas', request.url))
  }

  // Redirect root to login if not authenticated
  if (pathname === '/' && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect root to canvas if authenticated
  if (pathname === '/' && session) {
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