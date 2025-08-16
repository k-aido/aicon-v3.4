import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import ApifyService from '@/services/apifyService';
import TranscriptionService from '@/services/transcriptionService';
import YouTubeTranscriptionService from '@/services/youtubeTranscriptionService';
import YouTubeCaptionService from '@/services/youtubeCaptionService';

// Credit cost for scraping and analysis combined
const SCRAPE_AND_ANALYSIS_CREDITS = 50;

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
        updatedAt: scrapeRecord.updated_at,
        creditsDeducted: scrapeRecord.status === 'completed' // Credits were deducted when it completed
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
            // Check if audio is available and perform transcription
            let transcriptionText = null;
            
            // Handle YouTube separately
            if (scrapedContent.platform === 'youtube') {
              console.log(`[Status API] YouTube content detected, attempting transcription for ${scrapeId}`);
              
              const videoId = scrapedContent.rawData?.id || scrapedContent.rawData?.videoId;
              
              // Try multiple approaches for YouTube transcription
              
              // Approach 1: Try to get captions from scraped data
              if (!transcriptionText && scrapedContent.rawData?.captions) {
                console.log(`[Status API] Attempting to extract YouTube captions from scraped data`);
                try {
                  transcriptionText = await YouTubeCaptionService.extractCaptions(scrapedContent.rawData);
                  if (transcriptionText) {
                    console.log(`[Status API] YouTube captions extracted, length: ${transcriptionText.length} characters`);
                  }
                } catch (error) {
                  console.error(`[Status API] Caption extraction error:`, error);
                }
              }
              
              // Approach 2: Try direct transcript fetch if we have video ID
              if (!transcriptionText && videoId) {
                console.log(`[Status API] Attempting direct YouTube transcript fetch for video: ${videoId}`);
                try {
                  transcriptionText = await YouTubeCaptionService.fetchTranscriptDirect(videoId);
                  if (transcriptionText) {
                    console.log(`[Status API] YouTube transcript fetched directly, length: ${transcriptionText.length} characters`);
                  }
                } catch (error) {
                  console.error(`[Status API] Direct transcript fetch error:`, error);
                }
              }
              
              // Approach 3: Try audio download and transcription (may fail due to ytdl-core issues)
              if (!transcriptionText && scrapedContent.url) {
                console.log(`[Status API] Attempting YouTube audio download and transcription`);
                try {
                  const youtubeService = new YouTubeTranscriptionService();
                  transcriptionText = await youtubeService.transcribeYouTubeVideo(
                    scrapedContent.url,
                    videoId
                  );
                  
                  if (transcriptionText) {
                    console.log(`[Status API] YouTube audio transcription successful, length: ${transcriptionText.length} characters`);
                  }
                } catch (error) {
                  console.error(`[Status API] YouTube audio transcription error:`, error);
                }
              }
              
              if (!transcriptionText) {
                console.log(`[Status API] All YouTube transcription methods failed`);
                // Log what data we have for debugging
                console.log(`[Status API] YouTube data available:`, {
                  hasUrl: !!scrapedContent.url,
                  hasVideoId: !!videoId,
                  hasCaptions: !!scrapedContent.rawData?.captions,
                  captionTracks: scrapedContent.rawData?.captions?.captionTracks?.length || 0
                });
                
                // Set a message indicating no transcript available
                if ((scrapedContent.rawData?.captions?.captionTracks?.length || 0) === 0) {
                  console.log(`[Status API] No captions available for this YouTube video`);
                  // Store a placeholder message for videos without captions
                  transcriptionText = "[Transcript not available - this video has no captions]";
                }
              }
            }
            // Handle other platforms (Instagram, TikTok)
            else if (TranscriptionService.needsTranscription(scrapedContent)) {
              console.log(`[Status API] Audio available, performing transcription for ${scrapeId}`);
              
              try {
                const transcriptionService = new TranscriptionService();
                const audioUrl = TranscriptionService.getAudioUrl(scrapedContent);
                
                if (audioUrl) {
                  console.log(`[Status API] Transcribing audio from: ${audioUrl.substring(0, 100)}...`);
                  
                  // Generate contextual prompt for better transcription
                  const prompt = TranscriptionService.generatePrompt(scrapedContent);
                  
                  const transcriptionResult = await transcriptionService.transcribeFromUrl(audioUrl, {
                    prompt,
                    response_format: 'verbose_json'
                  });
                  
                  if (transcriptionResult) {
                    transcriptionText = transcriptionResult.text;
                    console.log(`[Status API] Transcription successful, length: ${transcriptionText.length} characters`);
                  } else {
                    console.log(`[Status API] Transcription failed, continuing without transcript`);
                  }
                } else {
                  console.log(`[Status API] No audio URL found for transcription (${scrapedContent.platform})`);
                }
              } catch (transcriptionError) {
                console.error(`[Status API] Transcription error:`, transcriptionError);
                // Continue without transcription - don't fail the entire scraping process
              }
            }
            
            // If we got a transcript, add it to the scraped content
            if (transcriptionText) {
              scrapedContent.transcript = transcriptionText;
            }
            
            // Now deduct credits since scraping succeeded
            // Get user's account
            const { data: userData } = await supabase
              .from('users')
              .select('account_id')
              .eq('id', userId)
              .single();

            if (userData?.account_id) {
              const { data: account } = await supabase
                .from('accounts')
                .select('promotional_credits, monthly_credits_remaining')
                .eq('id', userData.account_id)
                .single();

              if (account) {
                // Deduct credits
                let promotionalUsed = 0;
                let monthlyUsed = 0;
                let remainingToDeduct = SCRAPE_AND_ANALYSIS_CREDITS;

                if (account.promotional_credits > 0) {
                  promotionalUsed = Math.min(account.promotional_credits, remainingToDeduct);
                  remainingToDeduct -= promotionalUsed;
                }

                if (remainingToDeduct > 0) {
                  monthlyUsed = remainingToDeduct;
                }

                await supabase
                  .from('accounts')
                  .update({
                    promotional_credits: Math.max(0, account.promotional_credits - promotionalUsed),
                    monthly_credits_remaining: Math.max(0, account.monthly_credits_remaining - monthlyUsed),
                  })
                  .eq('id', userData.account_id);

                // Update billing usage
                const currentMonth = new Date();
                const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                
                const { data: existingUsage } = await supabase
                  .from('billing_usage')
                  .select('*')
                  .eq('account_id', userData.account_id)
                  .eq('billing_period_start', startOfMonth.toISOString().split('T')[0])
                  .single();

                if (existingUsage) {
                  const usageDetails = existingUsage.usage_details || {};
                  usageDetails.content_scrapes = (usageDetails.content_scrapes || 0) + 1;

                  await supabase
                    .from('billing_usage')
                    .update({
                      promotional_credits_used: existingUsage.promotional_credits_used + promotionalUsed,
                      monthly_credits_used: existingUsage.monthly_credits_used + monthlyUsed,
                      total_credits_used: existingUsage.total_credits_used + SCRAPE_AND_ANALYSIS_CREDITS,
                      usage_details: usageDetails,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingUsage.id);
                }

                console.log(`[Status API] Credits deducted for successful scrape ${scrapeId}: ${SCRAPE_AND_ANALYSIS_CREDITS} credits`);
              }
            }
            // Process and store the scraped data
            const processedData = {
              title: scrapedContent.title,
              description: scrapedContent.description,
              caption: scrapedContent.caption,
              transcript: scrapedContent.transcript || transcriptionText, // Use scraped transcript or our transcription
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
              topComments: scrapedContent.comments?.slice(0, 10),
              transcriptionSource: scrapedContent.transcript ? 'scraper' : (transcriptionText ? 'captions' : null)
            };
            
            // Log transcript info
            if (processedData.transcript) {
              console.log(`[Status API] Transcript saved:`, {
                length: processedData.transcript.length,
                source: processedData.transcriptionSource,
                last50Chars: processedData.transcript.substring(processedData.transcript.length - 50)
              });
            }
            
            console.log(`[Status API] Processed data for ${scrapeId}:`, {
              title: processedData.title,
              thumbnailUrl: processedData.thumbnailUrl,
              platform: scrapeRecord.platform
            });

            // Log before saving to database
            console.log(`[Status API] Before DB save - transcript length: ${processedData.transcript?.length || 0}`);
            
            // Update scrape record with results
            const { error: updateError } = await supabase
              .from('content_scrapes')
              .update({
                status: 'completed',
                processed_data: processedData,
                raw_data: scrapedContent.rawData,
                updated_at: new Date().toISOString()
              })
              .eq('id', scrapeId);
              
            if (updateError) {
              console.error(`[Status API] Error updating scrape record:`, updateError);
            } else {
              console.log(`[Status API] Successfully saved to database`)
            }

            return NextResponse.json({
              scrapeId: scrapeRecord.id,
              status: 'completed',
              url: scrapeRecord.url,
              platform: scrapeRecord.platform,
              processedData: processedData,
              message: 'Scraping completed successfully',
              creditsDeducted: true
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