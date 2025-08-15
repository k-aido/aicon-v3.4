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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scrapeId } = await params;

    if (!scrapeId) {
      return NextResponse.json(
        { error: 'Scrape ID is required' },
        { status: 400 }
      );
    }

    // Get user authentication
    const userId = await getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get scrape record
    const { data: scrapeRecord, error: scrapeError } = await supabase
      .from('content_scrapes')
      .select('*')
      .eq('id', scrapeId)
      .eq('user_id', userId)
      .single();

    if (scrapeError || !scrapeRecord) {
      return NextResponse.json(
        { error: 'Scrape record not found' },
        { status: 404 }
      );
    }

    // If already completed or failed, return current status
    if (scrapeRecord.status === 'completed' || scrapeRecord.status === 'failed') {
      return NextResponse.json({
        scrapeId: scrapeRecord.id,
        status: scrapeRecord.status,
        url: scrapeRecord.url,
        platform: scrapeRecord.platform,
        processedData: scrapeRecord.processed_data,
        error: scrapeRecord.error_message,
        createdAt: scrapeRecord.created_at,
        updatedAt: scrapeRecord.updated_at
      });
    }

    // If still processing, check Apify status
    if (scrapeRecord.status === 'processing' && scrapeRecord.apify_run_id) {
      try {
        const apifyService = new ApifyService();
        const runStatus = await apifyService.getRunStatus(scrapeRecord.apify_run_id);

        console.log(`[Status API] Apify run status for ${scrapeId}:`, runStatus.status);

        // If Apify run completed successfully
        if (runStatus.status === 'SUCCEEDED') {
          // Get the scraped results
          const scrapedContent = await apifyService.getRunResults(scrapeRecord.apify_run_id);

          if (scrapedContent) {
            // Process and store the scraped data
            const processedData = {
              title: scrapedContent.title,
              description: scrapedContent.description,
              caption: scrapedContent.caption,
              transcript: scrapedContent.transcript,
              metrics: {
                views: scrapedContent.viewCount,
                likes: scrapedContent.likeCount,
                comments: scrapedContent.commentCount,
                shares: scrapedContent.shareCount
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
              topComments: scrapedContent.comments?.slice(0, 10)
            };
            
            console.log(`[Status API] Processed data for ${scrapeId}:`, {
              title: processedData.title,
              thumbnailUrl: processedData.thumbnailUrl,
              platform: scrapeRecord.platform
            });

            // Update scrape record with results
            await supabase
              .from('content_scrapes')
              .update({
                status: 'completed',
                processed_data: processedData,
                raw_data: scrapedContent.rawData,
                updated_at: new Date().toISOString()
              })
              .eq('id', scrapeId);

            return NextResponse.json({
              scrapeId: scrapeRecord.id,
              status: 'completed',
              url: scrapeRecord.url,
              platform: scrapeRecord.platform,
              processedData: processedData,
              message: 'Scraping completed successfully'
            });
          } else {
            // No results found
            await supabase
              .from('content_scrapes')
              .update({
                status: 'failed',
                error_message: 'No content found at the provided URL',
                updated_at: new Date().toISOString()
              })
              .eq('id', scrapeId);

            return NextResponse.json({
              scrapeId: scrapeRecord.id,
              status: 'failed',
              error: 'No content found at the provided URL'
            });
          }
        }

        // If Apify run failed
        if (runStatus.status === 'FAILED' || runStatus.status === 'TIMED-OUT' || runStatus.status === 'ABORTED') {
          await supabase
            .from('content_scrapes')
            .update({
              status: 'failed',
              error_message: `Scraping failed with status: ${runStatus.status}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', scrapeId);

          return NextResponse.json({
            scrapeId: scrapeRecord.id,
            status: 'failed',
            error: `Scraping failed with status: ${runStatus.status}`
          });
        }

        // Still running
        return NextResponse.json({
          scrapeId: scrapeRecord.id,
          status: 'processing',
          apifyStatus: runStatus.status,
          message: 'Scraping in progress...'
        });

      } catch (apifyError: any) {
        console.error('[Status API] Error checking Apify status:', apifyError);
        
        // Don't fail the scrape for transient API errors
        return NextResponse.json({
          scrapeId: scrapeRecord.id,
          status: 'processing',
          message: 'Scraping in progress (unable to check current status)'
        });
      }
    }

    // Pending status (shouldn't happen often)
    return NextResponse.json({
      scrapeId: scrapeRecord.id,
      status: scrapeRecord.status,
      message: 'Scraping pending'
    });

  } catch (error: any) {
    console.error('[Status API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check scrape status' },
      { status: 500 }
    );
  }
}