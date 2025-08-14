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

/**
 * Endpoint to initiate scraping directly from a canvas element
 * This will trigger scraping and analysis, then return the results
 * to update the canvas element
 */
export async function POST(request: NextRequest) {
  try {
    const { elementId, url, projectId, platform } = await request.json();

    // Validate request
    if (!elementId || !url || !projectId || !platform) {
      return NextResponse.json(
        { error: 'Missing required fields: elementId, url, projectId, platform' },
        { status: 400 }
      );
    }

    // Get user authentication
    const userId = await getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, initiate scraping
    const scrapeResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/content/scrape`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({ url, projectId })
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok) {
      return NextResponse.json(scrapeData, { status: scrapeResponse.status });
    }

    // Return the scrape ID and initial status
    // The frontend will poll for completion
    return NextResponse.json({
      success: true,
      elementId,
      scrapeId: scrapeData.scrapeId,
      status: scrapeData.status,
      cached: scrapeData.cached
    });

  } catch (error: any) {
    console.error('[Scrape Element API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape element' },
      { status: 500 }
    );
  }
}