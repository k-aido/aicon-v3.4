import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import YouTubeCaptionService from '@/services/youtubeCaptionService';
import YouTubeTranscriptionService from '@/services/youtubeTranscriptionService';

// Initialize Supabase client
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ scrapeId: string }> }
) {
  try {
    const { scrapeId } = await params;
    
    // Get user authentication
    let userId = await getUserIdFromCookies();
    
    // In demo mode, use the demo user ID
    if (!userId && process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      userId = process.env.NEXT_PUBLIC_DEMO_USER_ID || '550e8400-e29b-41d4-a716-446655440002';
    }
    
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
      return NextResponse.json({ error: 'Scrape record not found' }, { status: 404 });
    }

    if (scrapeRecord.platform !== 'youtube') {
      return NextResponse.json({ error: 'Transcript fetch only supported for YouTube' }, { status: 400 });
    }

    // Check if we already have a transcript
    const processedData = scrapeRecord.processed_data || {};
    if (processedData.transcript) {
      return NextResponse.json({ 
        success: true, 
        transcript: processedData.transcript,
        cached: true 
      });
    }

    // Extract video ID from raw data
    const videoId = scrapeRecord.raw_data?.videoId || scrapeRecord.raw_data?.apiResponse?.id;
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID not found in scrape data' }, { status: 400 });
    }

    console.log(`[Transcript API] Fetching transcript for video ${videoId}`);

    // Try to fetch transcript
    let transcript: string | null = null;
    let transcriptSource = 'none';

    try {
      // First try direct caption fetch
      transcript = await YouTubeCaptionService.fetchTranscriptDirect(videoId);
      if (transcript) {
        transcriptSource = 'youtube-captions';
      }
    } catch (error) {
      console.error('[Transcript API] Direct caption fetch failed:', error);
    }

    // If no transcript and video is short enough, try transcription
    if (!transcript && processedData.duration && processedData.duration < 600) {
      try {
        const transcriptionService = new YouTubeTranscriptionService();
        const videoUrl = scrapeRecord.url;
        const videoId = processedData.videoId || undefined;
        const transcriptionResult = await transcriptionService.transcribeYouTubeVideo(videoUrl, videoId);
        
        if (transcriptionResult) {
          transcript = transcriptionResult;
          transcriptSource = 'whisper-transcription';
        }
      } catch (error) {
        console.error('[Transcript API] Transcription failed:', error);
      }
    }

    // Update the scrape record with transcript
    if (transcript) {
      processedData.transcript = transcript;
      processedData.transcriptSource = transcriptSource;
      
      await supabase
        .from('content_scrapes')
        .update({
          processed_data: processedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', scrapeId);

      console.log(`[Transcript API] Successfully fetched transcript (${transcript.length} chars) via ${transcriptSource}`);
    }

    return NextResponse.json({
      success: true,
      transcript: transcript || null,
      source: transcriptSource
    });

  } catch (error: any) {
    console.error('[Transcript API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transcript' },
      { status: 500 }
    );
  }
}