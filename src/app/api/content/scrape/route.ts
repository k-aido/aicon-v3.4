import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import ApifyService from '@/services/apifyService';

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

// Credit cost for scraping and analysis combined
const SCRAPE_AND_ANALYSIS_CREDITS = 50;

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

export async function POST(request: NextRequest) {
  try {
    const { url, projectId } = await request.json();

    // Validate request
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Validate URL format and platform
    const validation = ApifyService.validateUrl(url);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Get user authentication
    const userId = await getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's account for credit check
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', userId)
      .single();

    if (userError || !userData?.account_id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check if user has enough credits
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('promotional_credits, monthly_credits_remaining')
      .eq('id', userData.account_id)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Unable to fetch account details' }, { status: 500 });
    }

    const totalCredits = (account.promotional_credits || 0) + (account.monthly_credits_remaining || 0);
    
    if (totalCredits < SCRAPE_AND_ANALYSIS_CREDITS) {
      return NextResponse.json(
        { 
          error: `Insufficient credits. You need ${SCRAPE_AND_ANALYSIS_CREDITS} credits but only have ${totalCredits} available.`,
          creditsNeeded: SCRAPE_AND_ANALYSIS_CREDITS,
          creditsAvailable: totalCredits
        },
        { status: 402 }
      );
    }

    // Normalize URL for cache checking (handle reel vs post URLs)
    let normalizedUrl = url;
    if (url.includes('instagram.com')) {
      // Extract the post/reel ID and normalize to post URL format
      const reelMatch = url.match(/\/reel\/([^\/\?]+)/);
      const postMatch = url.match(/\/p\/([^\/\?]+)/);
      const contentId = reelMatch?.[1] || postMatch?.[1];
      if (contentId) {
        normalizedUrl = `https://www.instagram.com/p/${contentId}/`;
      }
    }
    
    // Check if URL has been scraped recently (within 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const { data: existingScrape } = await supabase
      .from('content_scrapes')
      .select('*')
      .or(`url.eq.${url},url.eq.${normalizedUrl}`)
      .eq('project_id', projectId)
      .eq('status', 'completed')
      .gte('created_at', oneDayAgo.toISOString())
      .single();

    if (existingScrape) {
      console.log('[Scrape API] Using cached scrape:', existingScrape.id);
      return NextResponse.json({
        success: true,
        scrapeId: existingScrape.id,
        status: 'completed',
        cached: true,
        message: 'Using recently scraped content'
      });
    }

    // Don't deduct credits here - we'll deduct them after successful completion
    // Credits will be deducted in the status check endpoint when scraping completes

    // Create scrape record
    const { data: scrapeRecord, error: scrapeError } = await supabase
      .from('content_scrapes')
      .insert({
        project_id: projectId,
        user_id: userId,
        url: url,
        platform: validation.platform,
        status: 'pending'
      })
      .select()
      .single();

    if (scrapeError || !scrapeRecord) {
      console.error('[Scrape API] Error creating scrape record:', scrapeError);
      return NextResponse.json({ error: 'Failed to create scrape record' }, { status: 500 });
    }

    // Initialize Apify service
    let apifyService: ApifyService;
    try {
      apifyService = new ApifyService();
    } catch (error) {
      console.error('[Scrape API] Apify service initialization failed:', error);
      
      // Update scrape record with error
      await supabase
        .from('content_scrapes')
        .update({
          status: 'failed',
          error_message: 'Apify service not configured. Please add APIFY_API_TOKEN to environment variables.',
          updated_at: new Date().toISOString()
        })
        .eq('id', scrapeRecord.id);
      
      return NextResponse.json({
        success: false,
        scrapeId: scrapeRecord.id,
        status: 'failed',
        error: 'Scraping service not configured'
      });
    }

    // Start scraping based on platform
    try {
      let runResult: { runId: string };
      
      switch (validation.platform) {
        case 'youtube':
          runResult = await apifyService.scrapeYouTube(url);
          break;
        case 'instagram':
          runResult = await apifyService.scrapeInstagram(url);
          break;
        case 'tiktok':
          runResult = await apifyService.scrapeTikTok(url);
          break;
        default:
          throw new Error(`Unsupported platform: ${validation.platform}`);
      }

      // Update scrape record with Apify run ID
      await supabase
        .from('content_scrapes')
        .update({
          status: 'processing',
          apify_run_id: runResult.runId,
          updated_at: new Date().toISOString()
        })
        .eq('id', scrapeRecord.id);

      console.log(`[Scrape API] Started scraping ${validation.platform} content:`, {
        scrapeId: scrapeRecord.id,
        runId: runResult.runId,
        url
      });

      return NextResponse.json({
        success: true,
        scrapeId: scrapeRecord.id,
        status: 'processing',
        message: 'Scraping started. Check status endpoint for updates.'
      });

    } catch (scrapeError: any) {
      console.error('[Scrape API] Scraping failed:', scrapeError);
      
      // Update scrape record with error
      await supabase
        .from('content_scrapes')
        .update({
          status: 'failed',
          error_message: scrapeError.message || 'Failed to start scraping',
          updated_at: new Date().toISOString()
        })
        .eq('id', scrapeRecord.id);
      
      return NextResponse.json({
        success: false,
        scrapeId: scrapeRecord.id,
        status: 'failed',
        error: scrapeError.message || 'Failed to start scraping'
      });
    }

  } catch (error: any) {
    console.error('[Scrape API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process scrape request' },
      { status: 500 }
    );
  }
}