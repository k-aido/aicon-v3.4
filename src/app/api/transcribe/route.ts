import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { transcriptionService } from '@/services/transcriptionService';
import { TranscriptionRequest } from '@/types/analysis';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body: TranscriptionRequest = await request.json();
    const { contentId, videoUrl, platform, language } = body;
    
    // Validate required fields
    if (!contentId || !videoUrl || !platform) {
      return NextResponse.json({ 
        error: 'Missing required fields: contentId, videoUrl, platform' 
      }, { status: 400 });
    }
    
    // Validate video URL format
    if (!transcriptionService.validateVideoUrl(videoUrl, platform)) {
      return NextResponse.json({ 
        error: `Invalid ${platform} video URL format` 
      }, { status: 400 });
    }
    
    console.log(`[Transcription API] Starting transcription for content ${contentId}`);
    
    // Update content status to transcribing
    await supabase
      .from('creator_content')
      .update({ 
        analysis_status: 'transcribing',
        updated_at: new Date().toISOString()
      })
      .eq('id', contentId);
    
    // Start transcription
    const transcriptionResult = await transcriptionService.transcribeVideo({
      contentId,
      videoUrl,
      platform: platform as 'youtube' | 'tiktok' | 'instagram',
      language
    });
    
    if (transcriptionResult.success && transcriptionResult.transcript) {
      // Store transcript in database
      const { error: updateError } = await supabase
        .from('creator_content')
        .update({ 
          transcript: transcriptionResult.transcript.text,
          analysis_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', contentId);
      
      if (updateError) {
        console.error('[Transcription API] Failed to update content with transcript:', updateError);
        return NextResponse.json({ 
          error: 'Failed to save transcript' 
        }, { status: 500 });
      }
      
      console.log(`[Transcription API] Transcription completed for content ${contentId}`);
      
      return NextResponse.json({
        success: true,
        contentId,
        transcript: transcriptionResult.transcript,
        processingTime: transcriptionResult.processingTime
      });
      
    } else {
      // Update status to failed
      await supabase
        .from('creator_content')
        .update({ 
          analysis_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', contentId);
      
      console.error(`[Transcription API] Transcription failed for content ${contentId}:`, transcriptionResult.error);
      
      return NextResponse.json({
        success: false,
        contentId,
        error: transcriptionResult.error || 'Transcription failed'
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('[Transcription API] Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');
    
    if (!contentId) {
      return NextResponse.json({ error: 'contentId parameter required' }, { status: 400 });
    }
    
    // Get transcript from database
    const { data: content, error } = await supabase
      .from('creator_content')
      .select('id, transcript, analysis_status, analyzed_at')
      .eq('id', contentId)
      .single();
    
    if (error || !content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      contentId: content.id,
      transcript: content.transcript,
      status: content.analysis_status,
      analyzedAt: content.analyzed_at
    });
    
  } catch (error: any) {
    console.error('[Transcription API] Error fetching transcript:', error);
    
    return NextResponse.json({
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}