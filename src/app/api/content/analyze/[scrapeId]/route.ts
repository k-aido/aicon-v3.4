import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

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

// Initialize OpenAI client (if available)
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Note: Credits are deducted when scraping completes (50 credits for combined scrape + analysis)
// This endpoint doesn't deduct credits separately

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
    const { addToLibrary = false } = await request.json();

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

    // Check if this is a mock scrape first
    let scrapeRecord: any;
    let userData: any;
    
    if (scrapeId.startsWith('mock-')) {
      const mockScrape = global.mockScrapes?.get(scrapeId);
      if (!mockScrape) {
        return NextResponse.json(
          { error: 'Mock scrape record not found' },
          { status: 404 }
        );
      }
      scrapeRecord = mockScrape;
      // For mock scrapes, we still need user data for billing usage tracking
      const { data: userDataResult, error: userError } = await supabase
        .from('users')
        .select('account_id')
        .eq('id', userId)
        .single();
      
      if (userError || !userDataResult?.account_id) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
      userData = userDataResult;
    } else {
      // Get user's account for credit check
      const { data: userDataResult, error: userError } = await supabase
        .from('users')
        .select('account_id')
        .eq('id', userId)
        .single();

      if (userError || !userDataResult?.account_id) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
      userData = userDataResult;

      // Get scrape record with processed data
      const { data: scrapeRecordResult, error: scrapeError } = await supabase
        .from('content_scrapes')
        .select('*')
        .eq('id', scrapeId)
        .eq('user_id', userId)
        .single();

      if (scrapeError || !scrapeRecordResult) {
        return NextResponse.json(
          { error: 'Scrape record not found' },
          { status: 404 }
        );
      }
      scrapeRecord = scrapeRecordResult;
    }

    if (scrapeRecord.status !== 'completed') {
      return NextResponse.json(
        { error: 'Scraping must be completed before analysis' },
        { status: 400 }
      );
    }

    // Check if analysis already exists (skip for mock scrapes)
    if (!scrapeId.startsWith('mock-')) {
      const { data: existingAnalysis } = await supabase
        .from('content_analysis')
        .select('*')
        .eq('scrape_id', scrapeId)
        .single();

      if (existingAnalysis) {
        console.log('[Analyze API] Using existing analysis:', existingAnalysis.id);
        
        // If requested, add to library
        if (addToLibrary) {
          await addToContentLibrary(existingAnalysis, scrapeRecord.project_id, userId);
        }
        
        return NextResponse.json({
          success: true,
          analysisId: existingAnalysis.id,
          analysis: existingAnalysis,
          cached: true
        });
      }
    }

    // Credits have already been deducted when scraping completed
    // No need to check or deduct credits here

    // Prepare content for analysis
    const contentData = scrapeRecord.processed_data || {};
    const platform = scrapeRecord.platform;
    
    // Perform AI analysis
    let analysisResult;
    if (openai) {
      analysisResult = await performAIAnalysis(contentData, platform);
    } else {
      analysisResult = createMockAnalysis(contentData, platform);
    }

    // For mock scrapes, return analysis directly without storing
    if (scrapeId.startsWith('mock-')) {
      const mockAnalysis = {
        id: `mock-analysis-${Date.now()}`,
        scrape_id: scrapeId,
        project_id: scrapeRecord.project_id,
        title: contentData.title || contentData.caption?.substring(0, 100),
        description: contentData.description,
        transcript: contentData.transcript,
        captions: contentData.caption,
        metrics: contentData.metrics,
        hook_analysis: analysisResult.hookAnalysis,
        body_analysis: analysisResult.bodyAnalysis,
        cta_analysis: analysisResult.ctaAnalysis,
        key_topics: analysisResult.keyTopics,
        engagement_tactics: analysisResult.engagementTactics,
        sentiment: analysisResult.sentiment,
        complexity: analysisResult.complexity,
        ai_model_used: analysisResult.modelUsed,
        tokens_used: analysisResult.tokensUsed,
        analyzed_at: new Date().toISOString()
      };
      
      console.log(`[Analyze API] Mock analysis completed for scrape ${scrapeId}`);
      
      return NextResponse.json({
        success: true,
        analysisId: mockAnalysis.id,
        analysis: mockAnalysis
      });
    }

    // Store analysis in database for real scrapes
    const { data: newAnalysis, error: analysisError } = await supabase
      .from('content_analysis')
      .insert({
        scrape_id: scrapeId,
        project_id: scrapeRecord.project_id,
        title: contentData.title || contentData.caption?.substring(0, 100),
        description: contentData.description,
        transcript: contentData.transcript,
        captions: contentData.caption,
        metrics: contentData.metrics,
        hook_analysis: analysisResult.hookAnalysis,
        body_analysis: analysisResult.bodyAnalysis,
        cta_analysis: analysisResult.ctaAnalysis,
        key_topics: analysisResult.keyTopics,
        engagement_tactics: analysisResult.engagementTactics,
        sentiment: analysisResult.sentiment,
        complexity: analysisResult.complexity,
        ai_model_used: analysisResult.modelUsed,
        tokens_used: analysisResult.tokensUsed,
        analyzed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (analysisError || !newAnalysis) {
      console.error('[Analyze API] Error storing analysis:', analysisError);
      return NextResponse.json({ error: 'Failed to store analysis' }, { status: 500 });
    }

    // Billing usage is already updated when scraping completes
    // Just update the analysis count in usage details
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
      usageDetails.content_analysis = (usageDetails.content_analysis || 0) + 1;

      await supabase
        .from('billing_usage')
        .update({
          usage_details: usageDetails,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUsage.id);
    }

    // If requested, add to content library
    if (addToLibrary) {
      await addToContentLibrary(newAnalysis, scrapeRecord.project_id, userId);
    }

    console.log(`[Analyze API] Analysis completed for scrape ${scrapeId}`);

    return NextResponse.json({
      success: true,
      analysisId: newAnalysis.id,
      analysis: newAnalysis
    });

  } catch (error: any) {
    console.error('[Analyze API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze content' },
      { status: 500 }
    );
  }
}

async function performAIAnalysis(contentData: any, platform: string) {
  if (!openai) {
    return createMockAnalysis(contentData, platform);
  }

  const prompt = `Analyze this ${platform} content for marketing insights:

Title: ${contentData.title || 'N/A'}
Description/Caption: ${contentData.description || contentData.caption || 'N/A'}
Transcript: ${contentData.transcript?.substring(0, 2000) || 'N/A'}
Metrics: ${JSON.stringify(contentData.metrics || {})}
Duration: ${contentData.duration ? `${contentData.duration} seconds` : 'N/A'}
Hashtags: ${contentData.hashtags?.join(', ') || 'N/A'}

Provide a structured analysis with these exact sections:

1. HOOK ANALYSIS: How does the content grab attention in the first 3 seconds? (2-3 sentences)

2. BODY ANALYSIS: What storytelling techniques and value delivery methods are used? (2-3 sentences)

3. CTA ANALYSIS: What call-to-action or desired outcome is presented? (1-2 sentences)

4. KEY TOPICS: List exactly 3-5 main themes (bullet points only)
- Topic 1
- Topic 2
- Topic 3

5. ENGAGEMENT TACTICS: List exactly 3-5 techniques (bullet points only)
- Tactic 1
- Tactic 2
- Tactic 3

6. SENTIMENT: One word only (positive/negative/neutral)

7. COMPLEXITY: One word only (simple/moderate/complex)

Be concise and actionable. Focus on insights that can be replicated.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert social media content analyst specializing in viral content patterns and engagement optimization.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2500  // Increased from 1500 to prevent cutoffs
    });

    const response = completion.choices[0]?.message?.content || '';
    const usage = completion.usage;

    // Parse the response
    const hookMatch = response.match(/HOOK ANALYSIS[:\s]*([\s\S]*?)(?=\n\d\.|BODY ANALYSIS|$)/i);
    const bodyMatch = response.match(/BODY ANALYSIS[:\s]*([\s\S]*?)(?=\n\d\.|CTA ANALYSIS|$)/i);
    const ctaMatch = response.match(/CTA ANALYSIS[:\s]*([\s\S]*?)(?=\n\d\.|KEY TOPICS|$)/i);
    const topicsMatch = response.match(/KEY TOPICS[:\s]*([\s\S]*?)(?=\n\d\.|ENGAGEMENT TACTICS|$)/i);
    const tacticsMatch = response.match(/ENGAGEMENT TACTICS[:\s]*([\s\S]*?)(?=\n\d\.|SENTIMENT|$)/i);
    const sentimentMatch = response.match(/SENTIMENT[:\s]*([a-z]+)/i);
    const complexityMatch = response.match(/COMPLEXITY[:\s]*([a-z]+)/i);

    const extractList = (text: string): string[] => {
      return text
        .split('\n')
        .map(line => line.replace(/^[-*•]\s*/, '').trim())
        .filter(line => line.length > 0 && !line.match(/^\d+\./))
        .slice(0, 5);
    };

    return {
      hookAnalysis: hookMatch?.[1]?.trim() || 'Strong opening that captures attention immediately',
      bodyAnalysis: bodyMatch?.[1]?.trim() || 'Well-structured content with clear value proposition',
      ctaAnalysis: ctaMatch?.[1]?.trim() || 'Clear call-to-action encouraging engagement',
      keyTopics: topicsMatch ? extractList(topicsMatch[1]) : ['Content strategy', 'Audience engagement', 'Social media'],
      engagementTactics: tacticsMatch ? extractList(tacticsMatch[1]) : ['Visual storytelling', 'Emotional appeal', 'Social proof'],
      sentiment: sentimentMatch?.[1]?.toLowerCase() || 'positive',
      complexity: complexityMatch?.[1]?.toLowerCase() || 'moderate',
      modelUsed: 'gpt-4o-mini',
      tokensUsed: usage?.total_tokens || 0
    };

  } catch (error) {
    console.error('[AI Analysis] Error:', error);
    return createMockAnalysis(contentData, platform);
  }
}

function createMockAnalysis(contentData: any, platform: string) {
  const metrics = contentData.metrics || {};
  const engagementRate = metrics.views > 0 
    ? (metrics.likes + metrics.comments) / metrics.views * 100
    : 0;

  return {
    hookAnalysis: `The content opens with a compelling ${platform === 'youtube' ? 'thumbnail and title combination' : 'visual hook'} designed to stop scrolling and capture immediate attention. The first 3 seconds establish the value proposition clearly.`,
    bodyAnalysis: `The main content employs storytelling techniques including personal anecdotes, data-driven insights, and visual demonstrations. Information is presented in digestible segments with clear transitions between key points.`,
    ctaAnalysis: `The content concludes with a strong call-to-action encouraging viewers to engage through likes, comments, and shares. Additional CTAs direct traffic to profile/channel for more content.`,
    keyTopics: [
      `${platform.charAt(0).toUpperCase() + platform.slice(1)} content strategy`,
      'Audience engagement optimization',
      'Visual storytelling techniques',
      'Social media growth tactics',
      'Content performance metrics'
    ],
    engagementTactics: [
      'Pattern interrupts to maintain attention',
      'Questions to encourage comments',
      'Relatable scenarios for emotional connection',
      'Visual effects and transitions',
      'Strategic hashtag placement'
    ],
    sentiment: engagementRate > 5 ? 'positive' : 'neutral',
    complexity: contentData.duration > 180 ? 'complex' : contentData.duration > 60 ? 'moderate' : 'simple',
    modelUsed: 'mock-analysis',
    tokensUsed: 0
  };
}

async function addToContentLibrary(analysis: any, projectId: string, userId: string) {
  try {
    // Create a summary for the library entry
    const summary = `${analysis.hook_analysis?.substring(0, 200)}... Key topics: ${analysis.key_topics?.slice(0, 3).join(', ')}`;
    
    await supabase
      .from('project_content_library')
      .insert({
        project_id: projectId,
        analysis_id: analysis.id,
        user_id: userId,
        title: analysis.title || 'Untitled Content',
        summary: summary,
        tags: analysis.key_topics || [],
        is_active: true
      });
    
    console.log('[Analyze API] Added to content library');
  } catch (error) {
    console.error('[Analyze API] Error adding to library:', error);
    // Non-critical error, don't fail the request
  }
}