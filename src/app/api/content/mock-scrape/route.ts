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

// This endpoint creates a "mock" scrape record for content that's already available (like Creator Search content)
export async function POST(request: NextRequest) {
  try {
    const { url, projectId, processedData, platform } = await request.json();

    // Validate request
    if (!url || !projectId || !processedData || !platform) {
      return NextResponse.json(
        { error: 'Missing required fields: url, projectId, processedData, platform' },
        { status: 400 }
      );
    }

    // Get user authentication
    const userId = await getUserIdFromCookies();
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

    // Generate a unique scrape ID
    const scrapeId = `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    console.log('[Mock Scrape] Creating mock scrape record:', {
      scrapeId,
      url,
      platform,
      userId
    });

    // Store the "mock" scrape data in memory (or you could use a simple table)
    // For now, we'll just return the data structure that the polling expects
    const mockScrapeData = {
      id: scrapeId,
      user_id: userId,
      project_id: projectId,
      url: url,
      platform: platform,
      status: 'completed',
      processed_data: processedData,
      scraping_started_at: new Date().toISOString(),
      scraping_completed_at: new Date().toISOString(),
      apify_run_id: null
    };

    // Store in a global map for retrieval by the status endpoint
    if (!global.mockScrapes) {
      global.mockScrapes = new Map();
    }
    global.mockScrapes.set(scrapeId, mockScrapeData);

    // Clean up old entries after 5 minutes
    setTimeout(() => {
      global.mockScrapes?.delete(scrapeId);
    }, 5 * 60 * 1000);

    return NextResponse.json({
      success: true,
      scrapeId: scrapeId,
      status: 'processing' // Return processing so the frontend starts polling
    });

  } catch (error: any) {
    console.error('[Mock Scrape] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create mock scrape' },
      { status: 500 }
    );
  }
}