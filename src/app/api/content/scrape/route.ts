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

// Credit cost for scraping and analysis combined
const SCRAPE_AND_ANALYSIS_CREDITS = 50;
const YOUTUBE_API_CREDITS = 0; // Free within quota

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
    let userId = await getUserIdFromCookies();
    
    // In demo mode, use the demo user ID
    if (!userId && process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      userId = process.env.NEXT_PUBLIC_DEMO_USER_ID || '550e8400-e29b-41d4-a716-446655440002';
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine scraping method and credits needed
    let scrapingMethod: 'youtube_api' | 'apify' = 'apify';
    let creditsNeeded = SCRAPE_AND_ANALYSIS_CREDITS;

    // For YouTube, prefer free API if available
    if (validation.platform === 'youtube' && preferFreeMethod) {
      const youtubeService = new YouTubeDataService();
      console.log('[Scrape API] Checking YouTube API configuration:', {
        platform: validation.platform,
        preferFreeMethod,
        isConfigured: youtubeService.isConfigured(),
        apiKeyPresent: !!process.env.YOUTUBE_API_KEY,
        apiKeyLength: process.env.YOUTUBE_API_KEY?.length || 0,
        apiKeyValue: process.env.YOUTUBE_API_KEY ? 'present' : 'missing',
        nodeEnv: process.env.NODE_ENV
      });
      
      if (youtubeService.isConfigured()) {
        scrapingMethod = 'youtube_api';
        creditsNeeded = YOUTUBE_API_CREDITS;
        console.log('[Scrape API] Using YouTube Data API (free method)');
      } else {
        console.log('[Scrape API] YouTube API not configured, falling back to Apify');
      }
    }

    // Only check credits if using paid method
    if (creditsNeeded > 0) {
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
      
      if (totalCredits < creditsNeeded) {
        return NextResponse.json(
          { 
            error: `Insufficient credits. You need ${creditsNeeded} credits but only have ${totalCredits} available.`,
            creditsNeeded: creditsNeeded,
            creditsAvailable: totalCredits
          },
          { status: 402 }
        );
      }
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
    
    // Check if URL has been scraped for this project (regardless of time)
    const { data: existingScrape } = await supabase
      .from('content_scrapes')
      .select('*')
      .or(`url.eq.${url},url.eq.${normalizedUrl}`)
      .eq('project_id', projectId)
      .in('status', ['completed', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingScrape) {
      console.log('[Scrape API] Found existing scrape:', {
        id: existingScrape.id,
        status: existingScrape.status,
        created_at: existingScrape.created_at
      });
      
      // If it's still processing, return the existing scrape
      if (existingScrape.status === 'processing') {
        return NextResponse.json({
          success: true,
          scrapeId: existingScrape.id,
          status: 'processing',
          existing: true,
          message: 'Content is already being processed'
        });
      }
      
      // If completed, return the existing scrape
      return NextResponse.json({
        success: true,
        scrapeId: existingScrape.id,
        status: 'completed',
        cached: true,
        message: 'Using existing content'
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
        status: 'pending',
        scraping_method: scrapingMethod // Track which method is being used
      })
      .select()
      .single();

    if (scrapeError || !scrapeRecord) {
      console.error('[Scrape API] Error creating scrape record:', {
        error: scrapeError,
        errorMessage: scrapeError?.message,
        errorDetails: scrapeError?.details,
        projectId,
        userId,
        url,
        platform: validation.platform
      });
      
      // Check if it's a duplicate URL error - this should rarely happen now since we check above
      if (scrapeError?.code === '23505' || scrapeError?.message?.includes('unique_project_url')) {
        // Try to find the existing scrape record
        const { data: existingScrape } = await supabase
          .from('content_scrapes')
          .select('*')
          .eq('url', url)
          .eq('project_id', projectId)
          .single();
        
        if (existingScrape) {
          console.log('[Scrape API] Returning existing scrape after constraint violation:', existingScrape.id);
          return NextResponse.json({
            success: true,
            scrapeId: existingScrape.id,
            status: existingScrape.status,
            cached: true,
            message: 'Using existing content'
          });
        }
        
        return NextResponse.json({ 
          error: 'This content has already been added to the project.' 
        }, { status: 409 });
      }
      
      return NextResponse.json({ 
        error: `Failed to create scrape record: ${scrapeError?.message || 'Unknown database error'}` 
      }, { status: 500 });
    }

    // Initialize Apify service (may be needed for fallback)
    let apifyService: ApifyService | null = null;
    try {
      apifyService = new ApifyService();
    } catch (error) {
      console.error('[Scrape API] Apify service initialization failed:', error);
      // Don't fail immediately - YouTube API might work without Apify
      // Only fail if we actually need Apify later
    }

    // Handle YouTube with free API if configured
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
        console.log('[Scrape API] Starting YouTube API scrape for URL:', url);
        const scrapedContent = await youtubeService.scrapeYouTube(url);
        
        if (scrapedContent) {
          console.log('[Scrape API] YouTube API returned content:', {
            title: scrapedContent.title,
            duration: scrapedContent.duration,
            hasTranscript: !!scrapedContent.transcript,
            transcriptDeferred: scrapedContent.rawData?.transcriptDeferred
          });
          
          // For YouTube API results, we need to convert to the expected format
          const processedData = {
            title: scrapedContent.title,
            description: scrapedContent.description,
            transcript: scrapedContent.transcript,
            metrics: {
              views: scrapedContent.viewCount,
              likes: scrapedContent.likeCount,
              comments: scrapedContent.commentCount
            },
            duration: scrapedContent.duration,
            uploadDate: scrapedContent.uploadDate,
            author: {
              name: scrapedContent.authorName,
              id: scrapedContent.authorId
            },
            thumbnailUrl: scrapedContent.thumbnailUrl,
            videoUrl: scrapedContent.videoUrl,
            hashtags: scrapedContent.hashtags,
            mentions: scrapedContent.mentions,
            transcriptDeferred: scrapedContent.rawData?.transcriptDeferred || false
          };
          
          // Update scrape record with results
          // Note: raw_data is stored within processed_data since the table doesn't have a separate raw_data column
          const { error: updateError } = await supabase
            .from('content_scrapes')
            .update({
              status: 'completed',
              processed_data: {
                ...processedData,
                rawData: scrapedContent.rawData // Store raw data within processed_data JSONB
              },
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', scrapeRecord.id);
            
          if (updateError) {
            console.error('[Scrape API] Failed to update scrape record:', updateError);
            throw new Error('Failed to save scraping results');
          }

          console.log(`[Scrape API] YouTube API scraping completed for ${scrapeRecord.id}`);

          return NextResponse.json({
            success: true,
            scrapeId: scrapeRecord.id,
            status: 'completed',
            method: 'youtube_api',
            message: 'Content scraped successfully using YouTube API (free)'
          });
        } else {
          throw new Error('Failed to fetch YouTube data - no content returned');
        }
      } catch (error: any) {
        console.error('[Scrape API] YouTube API scraping failed:', {
          error: error.message,
          stack: error.stack,
          url: url
        });
        
        // Check if we should fall back to Apify or fail immediately
        const shouldFallback = !error.message.includes('quota exceeded') && 
                              !error.message.includes('API key invalid') &&
                              !error.message.includes('403');
        
        if (shouldFallback && apifyService) {
          // Fall back to Apify
          console.log('[Scrape API] Falling back to Apify method due to YouTube API error');
          scrapingMethod = 'apify';
          creditsNeeded = SCRAPE_AND_ANALYSIS_CREDITS;
          
          // Update the scraping method in the record
          await supabase
            .from('content_scrapes')
            .update({
              scraping_method: 'apify',
              error_message: `YouTube API failed: ${error.message}, falling back to Apify`,
              status: 'pending'
            })
            .eq('id', scrapeRecord.id);
        } else {
          // Fail immediately for quota/auth issues
          await supabase
            .from('content_scrapes')
            .update({
              status: 'failed',
              error_message: error.message,
              updated_at: new Date().toISOString(),
              completed_at: new Date().toISOString()
            })
            .eq('id', scrapeRecord.id);
          
          console.log(`[Scrape API] YouTube scraping failed permanently: ${error.message}`);
          
          return NextResponse.json({
            success: false,
            scrapeId: scrapeRecord.id,
            status: 'failed',
            error: error.message,
            details: error.message.includes('403') ? 
              'YouTube API key may be invalid or quota exceeded. Check your YOUTUBE_API_KEY in .env.local' : 
              error.message
          }, { status: 400 });
        }
      }
    }
    
    // Use Apify for non-YouTube or as fallback
    if (scrapingMethod === 'apify') {
      // Check if Apify service is available
      if (!apifyService) {
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
          error: 'Scraping service not configured. YouTube API failed and Apify is not available as fallback.'
        }, { status: 500 });
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
        console.error('[Scrape API] Apify scraping failed:', scrapeError);
      
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
    console.error('[Scrape API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process scrape request' },
      { status: 500 }
    );
  }
}