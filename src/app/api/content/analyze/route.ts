import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { transcriptionService } from '@/services/transcriptionService';
import { ContentAnalysis, AnalysisRequest, AnalysisResponse } from '@/types/analysis';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface EnhancedAnalysisRequest {
  contentId: string;
  forceReanalysis?: boolean;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check if we're in demo mode
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const enableAuth = process.env.NEXT_PUBLIC_ENABLE_AUTH !== 'false';
    
    // Use service role client for demo mode to bypass RLS
    const supabase = isDemoMode 
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )
      : createRouteHandlerClient({ cookies });
    
    let user = null;
    
    if (enableAuth && !isDemoMode) {
      // Get the authenticated user in production mode
      const { data: userData, error: authError } = await supabase.auth.getUser();
      
      if (authError || !userData.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      user = userData.user;
    } else {
      // Demo mode - create a mock user
      console.log('[Enhanced Analysis] Demo mode - using mock user');
      user = {
        id: process.env.NEXT_PUBLIC_DEMO_USER_ID || '550e8400-e29b-41d4-a716-446655440002',
        email: 'demo@example.com'
      };
    }
    
    const body: EnhancedAnalysisRequest = await request.json();
    const { contentId, forceReanalysis = false } = body;
    
    // Validate required fields
    if (!contentId) {
      return NextResponse.json({ 
        error: 'Missing required field: contentId' 
      }, { status: 400 });
    }
    
    console.log(`[Enhanced Analysis] Starting analysis for content ${contentId}`);
    
    // Get content from database
    console.log(`[Enhanced Analysis] Querying database for contentId: ${contentId}`);
    const { data: content, error: fetchError } = await supabase
      .from('creator_content')
      .select('*')
      .eq('id', contentId)
      .single();
    
    console.log(`[Enhanced Analysis] Database query result:`, {
      contentId,
      found: !!content,
      error: fetchError?.message,
      content: content ? { id: content.id, platform: content.platform, url: content.content_url } : null
    });
    
    if (fetchError || !content) {
      console.error(`[Enhanced Analysis] Content not found:`, { contentId, fetchError });
      return NextResponse.json({ 
        error: 'Content not found',
        details: fetchError?.message 
      }, { status: 404 });
    }
    
    // Check if analysis already exists and not forcing reanalysis
    if (!forceReanalysis && content.analysis_status === 'completed' && content.summary) {
      console.log(`[Enhanced Analysis] Returning existing analysis for content ${contentId}`);
      
      return NextResponse.json({
        success: true,
        contentId,
        analysis: {
          summary: content.summary,
          hook: content.hook_analysis,
          body: content.body_analysis,
          cta: content.cta_analysis,
          aiModel: content.ai_model_used,
          analyzedAt: content.analyzed_at
        },
        cached: true
      });
    }
    
    // Update status to analyzing
    await supabase
      .from('creator_content')
      .update({ 
        analysis_status: 'analyzing',
        updated_at: new Date().toISOString()
      })
      .eq('id', contentId);
    
    let transcript = content.transcript;
    
    // Get transcript if not available
    if (!transcript) {
      console.log(`[Enhanced Analysis] No transcript found, starting transcription for ${contentId}`);
      
      // Update status to transcribing
      await supabase
        .from('creator_content')
        .update({ 
          analysis_status: 'transcribing',
          updated_at: new Date().toISOString()
        })
        .eq('id', contentId);
      
      // Transcribe the video
      const transcriptionResult = await transcriptionService.transcribeVideo({
        contentId,
        videoUrl: content.video_url || content.content_url,
        platform: content.platform as 'youtube' | 'tiktok' | 'instagram'
      });
      
      if (transcriptionResult.success && transcriptionResult.transcript) {
        transcript = transcriptionResult.transcript.text;
        
        // Save transcript to database
        await supabase
          .from('creator_content')
          .update({ 
            transcript,
            analysis_status: 'analyzing',
            updated_at: new Date().toISOString()
          })
          .eq('id', contentId);
      } else {
        console.warn(`[Enhanced Analysis] Transcription failed for ${contentId}, using caption as fallback`);
        transcript = content.caption || 'No transcript or caption available';
      }
    }
    
    // Perform AI analysis
    const analysisResult = await performEnhancedAnalysis({
      contentId,
      transcript,
      metadata: {
        platform: content.platform,
        duration: content.duration_seconds,
        caption: content.caption,
        views: content.views,
        likes: content.likes,
        comments: content.comments
      }
    });
    
    if (analysisResult.success && analysisResult.analysis) {
      // Store analysis results in database
      const { error: updateError } = await supabase
        .from('creator_content')
        .update({
          summary: analysisResult.analysis.summary,
          hook_analysis: JSON.stringify(analysisResult.analysis.hook),
          body_analysis: JSON.stringify(analysisResult.analysis.body),
          cta_analysis: JSON.stringify(analysisResult.analysis.cta),
          analysis_status: 'completed',
          analyzed_at: new Date().toISOString(),
          ai_model_used: analysisResult.analysis.metadata.aiModel,
          updated_at: new Date().toISOString()
        })
        .eq('id', contentId);
      
      if (updateError) {
        console.error('[Enhanced Analysis] Failed to update content with analysis:', updateError);
        return NextResponse.json({ 
          error: 'Failed to save analysis results' 
        }, { status: 500 });
      }
      
      const processingTime = Date.now() - startTime;
      
      console.log(`[Enhanced Analysis] Analysis completed for ${contentId} in ${processingTime}ms`);
      
      return NextResponse.json({
        success: true,
        contentId,
        analysis: analysisResult.analysis,
        processingTime,
        costCredits: analysisResult.costCredits
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
      
      console.error(`[Enhanced Analysis] Analysis failed for ${contentId}:`, analysisResult.error);
      
      return NextResponse.json({
        success: false,
        contentId,
        error: analysisResult.error || 'Analysis failed'
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('[Enhanced Analysis] Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

async function performEnhancedAnalysis(request: AnalysisRequest): Promise<AnalysisResponse> {
  const startTime = Date.now();
  
  try {
    const { transcript, metadata } = request;
    
    // Create enhanced analysis prompt
    const analysisPrompt = createEnhancedAnalysisPrompt(transcript, metadata);
    
    // Call OpenAI GPT-4o-mini for analysis
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using GPT-4o-mini for cost efficiency
      messages: [
        {
          role: 'system',
          content: `You are an expert social media content analyst specializing in video content structure analysis. Your expertise includes:

1. HOOK ANALYSIS: Identifying attention-grabbing openings, measuring effectiveness, analyzing psychological triggers
2. BODY ANALYSIS: Evaluating content flow, engagement maintenance, value delivery, storytelling techniques  
3. CTA ANALYSIS: Assessing call-to-action clarity, placement, conversion potential, and persuasion techniques

Provide detailed, actionable insights that content creators can use to improve their content performance. Focus on specific techniques, timing, and psychological principles that drive engagement.`
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.2, // Lower temperature for more consistent analysis
      max_tokens: 2000,
      response_format: { type: "json_object" } // Request JSON response for easier parsing
    });
    
    const analysisText = completion.choices[0]?.message?.content;
    if (!analysisText) {
      throw new Error('No analysis returned from OpenAI');
    }
    
    // Parse the structured JSON analysis
    const analysisData = JSON.parse(analysisText);
    
    // Structure the analysis according to our ContentAnalysis interface
    const analysis: ContentAnalysis = {
      summary: analysisData.summary || 'Content analysis completed',
      hook: {
        text: analysisData.hook?.text || 'Hook not identified',
        analysis: analysisData.hook?.analysis || 'No hook analysis available',
        effectiveness: analysisData.hook?.effectiveness || 'medium',
        techniques: analysisData.hook?.techniques || []
      },
      body: {
        mainPoints: analysisData.body?.mainPoints || [],
        analysis: analysisData.body?.analysis || 'No body analysis available',
        structure: analysisData.body?.structure || 'educational',
        engagement: analysisData.body?.engagement || []
      },
      cta: {
        text: analysisData.cta?.text || 'No clear CTA identified',
        analysis: analysisData.cta?.analysis || 'No CTA analysis available',
        type: analysisData.cta?.type || 'none',
        clarity: analysisData.cta?.clarity || 'low'
      },
      metadata: {
        aiModel: 'gpt-4o-mini',
        analyzedAt: new Date(),
        processingTime: Date.now() - startTime,
        costCredits: estimateAnalysisCost(transcript.length)
      }
    };
    
    return {
      success: true,
      contentId: request.contentId,
      analysis,
      processingTime: Date.now() - startTime,
      costCredits: analysis.metadata.costCredits
    };
    
  } catch (error: any) {
    console.error('[Enhanced Analysis] Analysis error:', error);
    
    return {
      success: false,
      contentId: request.contentId,
      error: error.message || 'Analysis failed',
      processingTime: Date.now() - startTime
    };
  }
}

function createEnhancedAnalysisPrompt(transcript: string, metadata: any): string {
  // Check if this is a placeholder transcript (for platforms without audio extraction)
  const isPlaceholderTranscript = transcript.includes('placeholder') || 
                                  transcript.includes('will be implemented in a future update') ||
                                  transcript.includes('Audio transcription for');
  
  const transcriptSection = isPlaceholderTranscript ? 
    `**VIDEO TRANSCRIPT:**
${transcript}

**NOTE:** Since audio transcription is not yet available for ${metadata.platform}, this analysis will focus on platform-specific content patterns, typical engagement strategies for ${metadata.platform}, and general best practices based on the URL and metadata provided.` :
    `**VIDEO TRANSCRIPT:**
${transcript}`;

  return `Analyze this ${metadata.platform} video content with the following data:

${transcriptSection}

**METADATA:**
- Platform: ${metadata.platform}
- Duration: ${metadata.duration ? `${metadata.duration} seconds` : 'Unknown'}
- Views: ${metadata.views || 0}
- Likes: ${metadata.likes || 0}  
- Comments: ${metadata.comments || 0}
- Caption: ${metadata.caption || 'None'}

**ANALYSIS REQUIREMENTS:**
${isPlaceholderTranscript ? 
  `Since audio transcription is not available, provide a platform-specific analysis based on typical ${metadata.platform} content patterns and best practices. Focus on general recommendations and common strategies for ${metadata.platform} content creators.` :
  'Provide a comprehensive analysis based on the actual transcript content.'
}

Provide analysis in JSON format with the following structure:

{
  "summary": "${isPlaceholderTranscript ? 
    `General summary based on ${metadata.platform} content patterns and best practices` :
    'Brief 2-3 sentence summary of the video content and its main value proposition'
  }",
  "hook": {
    "text": "${isPlaceholderTranscript ? 
      `Typical ${metadata.platform} hook strategies (since transcript unavailable)` :
      'Exact text/description of the opening hook (first 3-5 seconds)'
    }",
    "analysis": "${isPlaceholderTranscript ?
      `Analysis of effective hook strategies for ${metadata.platform} content` :
      'Detailed analysis of hook effectiveness, techniques used, and psychological impact'
    }",
    "effectiveness": "high|medium|low",
    "techniques": ["technique1", "technique2", "technique3"]
  },
  "body": {
    "mainPoints": ["point1", "point2", "point3"],
    "analysis": "${isPlaceholderTranscript ?
      `Analysis of typical ${metadata.platform} content structure and engagement strategies` :
      'Analysis of content structure, flow, value delivery, and engagement maintenance'
    }",
    "structure": "narrative|educational|entertainment|promotional",
    "engagement": ["engagement_technique1", "engagement_technique2"]
  },
  "cta": {
    "text": "${isPlaceholderTranscript ?
      `Common ${metadata.platform} call-to-action patterns` :
      'Exact call-to-action text or description'
    }",
    "analysis": "${isPlaceholderTranscript ?
      `Analysis of effective CTA strategies for ${metadata.platform}` :
      'Analysis of CTA placement, clarity, persuasion techniques, and conversion potential'
    }",
    "type": "subscribe|like|comment|visit|buy|follow|none",
    "clarity": "high|medium|low"
  }
}

**FOCUS AREAS:**
1. Hook Analysis: Opening seconds, attention-grabbing techniques, curiosity gaps, pattern interrupts
2. Body Analysis: Content flow, value delivery, storytelling, engagement maintenance, pacing
3. CTA Analysis: Placement, clarity, urgency, social proof, conversion optimization
4. Platform-specific optimizations and best practices
5. Psychological triggers and persuasion techniques used

Provide specific, actionable insights that can be applied to improve content performance.`;
}

function estimateAnalysisCost(transcriptLength: number): number {
  // GPT-4o-mini pricing: ~$0.00015 per 1K input tokens, ~$0.0006 per 1K output tokens
  // Rough estimate: ~0.75 tokens per character for input, ~500 tokens output
  const inputTokens = Math.ceil(transcriptLength * 0.75);
  const outputTokens = 500;
  
  const inputCost = (inputTokens / 1000) * 0.00015;
  const outputCost = (outputTokens / 1000) * 0.0006;
  
  return Math.ceil((inputCost + outputCost) * 1000); // Return in micro-dollars for precision
}

export async function GET(request: NextRequest) {
  try {
    // Check if we're in demo mode for GET requests too
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const enableAuth = process.env.NEXT_PUBLIC_ENABLE_AUTH !== 'false';
    
    // Use service role client for demo mode to bypass RLS
    const supabase = isDemoMode 
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )
      : createRouteHandlerClient({ cookies });
    
    let user = null;
    
    if (enableAuth && !isDemoMode) {
      // Get the authenticated user in production mode
      const { data: userData, error: authError } = await supabase.auth.getUser();
      
      if (authError || !userData.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      user = userData.user;
    }
    
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');
    
    if (!contentId) {
      return NextResponse.json({ error: 'contentId parameter required' }, { status: 400 });
    }
    
    // Get analysis from database
    const { data: content, error } = await supabase
      .from('creator_content')
      .select('id, summary, hook_analysis, body_analysis, cta_analysis, analysis_status, analyzed_at, ai_model_used')
      .eq('id', contentId)
      .single();
    
    if (error || !content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      contentId: content.id,
      analysis: {
        summary: content.summary,
        hook: content.hook_analysis ? JSON.parse(content.hook_analysis) : null,
        body: content.body_analysis ? JSON.parse(content.body_analysis) : null,
        cta: content.cta_analysis ? JSON.parse(content.cta_analysis) : null,
        aiModel: content.ai_model_used,
        analyzedAt: content.analyzed_at
      },
      status: content.analysis_status
    });
    
  } catch (error: any) {
    console.error('[Enhanced Analysis] Error fetching analysis:', error);
    
    return NextResponse.json({
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}