import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import ApifyService from '@/services/apifyService';
import YouTubeDataService from '@/services/youtubeDataService';
import YouTubePostProcessor from '@/services/youtubePostProcessor';

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

// Credit cost for scraping and analysis
const SCRAPE_CREDITS = {
  youtube_api: 0, // Free within quota
  apify: 50       // Original cost
};

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
    const { url, projectId, preferFreeMethod = true } = await request.json();

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

    // Determine scraping method and credits needed
    let scrapingMethod: 'youtube_api' | 'apify' = 'apify';
    let creditsNeeded = SCRAPE_CREDITS.apify;

    // For YouTube, prefer free API if available
    if (validation.platform === 'youtube' && preferFreeMethod) {
      const youtubeService = new YouTubeDataService();
      if (youtubeService.isConfigured()) {
        scrapingMethod = 'youtube_api';
        creditsNeeded = SCRAPE_CREDITS.youtube_api;
        console.log('[Scrape API v2] Using YouTube Data API (free method)');
      } else {
        console.log('[Scrape API v2] YouTube API not configured, falling back to Apify');
      }
    }

    // Get user's account for credit check (only if using paid method)
    if (creditsNeeded > 0) {
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
      
      if (totalCredits < creditsNeeded) {
        return NextResponse.json(
          { 
            error: `Insufficient credits. You need ${creditsNeeded} credits but only have ${totalCredits} available.`,
            creditsNeeded,
            creditsAvailable: totalCredits
          },
          { status: 402 }
        );
      }
    }

    // Check if URL has been scraped recently (within 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const { data: existingScrape } = await supabase
      .from('content_scrapes')
      .select('*')
      .eq('url', url)
      .eq('project_id', projectId)
      .eq('status', 'completed')
      .gte('created_at', oneDayAgo.toISOString())
      .single();

    if (existingScrape) {
      console.log('[Scrape API v2] Using cached scrape:', existingScrape.id);
      return NextResponse.json({
        success: true,
        scrapeId: existingScrape.id,
        status: 'completed',
        cached: true,
        method: existingScrape.scraping_method || 'unknown',
        message: 'Using recently scraped content'
      });
    }

    // Create scrape record
    const { data: scrapeRecord, error: scrapeError } = await supabase
      .from('content_scrapes')
      .insert({
        project_id: projectId,
        user_id: userId,
        url: url,
        platform: validation.platform,
        status: 'pending',
        scraping_method: scrapingMethod // Track which method was used
      })
      .select()
      .single();

    if (scrapeError || !scrapeRecord) {
      console.error('[Scrape API v2] Error creating scrape record:', scrapeError);
      return NextResponse.json({ error: 'Failed to create scrape record' }, { status: 500 });
    }

    // Handle YouTube with free API
    if (validation.platform === 'youtube' && scrapingMethod === 'youtube_api') {
      try {
        const youtubeService = new YouTubeDataService();
        
        // Update status to processing
        await supabase
          .from('content_scrapes')
          .update({
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', scrapeRecord.id);

        // Scrape using YouTube API
        const scrapedContent = await youtubeService.scrapeYouTube(url);
        
        if (scrapedContent) {
          // Post-process for better transcript extraction
          const postProcessor = new YouTubePostProcessor();
          const processedContent = await postProcessor.processYouTubeContent(scrapedContent);
          
          // Update scrape record with results
          await supabase
            .from('content_scrapes')
            .update({
              status: 'completed',
              processed_data: processedContent,
              raw_data: processedContent.rawData,
              scraping_completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', scrapeRecord.id);

          console.log(`[Scrape API v2] YouTube API scraping completed for ${scrapeRecord.id}`);

          return NextResponse.json({
            success: true,
            scrapeId: scrapeRecord.id,
            status: 'completed',
            method: 'youtube_api',
            message: 'Content scraped successfully using YouTube API (free)'
          });
        } else {
          throw new Error('Failed to fetch YouTube data');
        }
      } catch (error: any) {
        console.error('[Scrape API v2] YouTube API scraping failed:', error);
        
        // Fall back to Apify
        console.log('[Scrape API v2] Falling back to Apify method');
        scrapingMethod = 'apify';
        creditsNeeded = SCRAPE_CREDITS.apify;
        
        // Update the scraping method in the record
        await supabase
          .from('content_scrapes')
          .update({
            scraping_method: 'apify',
            error_message: `YouTube API failed: ${error.message}, falling back to Apify`
          })
          .eq('id', scrapeRecord.id);
      }
    }

    // Use Apify for non-YouTube or as fallback
    if (scrapingMethod === 'apify') {
      // Initialize Apify service
      let apifyService: ApifyService;
      try {
        apifyService = new ApifyService();
      } catch (error) {
        console.error('[Scrape API v2] Apify service initialization failed:', error);
        
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

        console.log(`[Scrape API v2] Started Apify scraping for ${validation.platform}:`, {
          scrapeId: scrapeRecord.id,
          runId: runResult.runId,
          url
        });

        return NextResponse.json({
          success: true,
          scrapeId: scrapeRecord.id,
          status: 'processing',
          method: 'apify',
          message: 'Scraping started. Check status endpoint for updates.'
        });

      } catch (scrapeError: any) {
        console.error('[Scrape API v2] Apify scraping failed:', scrapeError);
        
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
    }

  } catch (error: any) {
    console.error('[Scrape API v2] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}