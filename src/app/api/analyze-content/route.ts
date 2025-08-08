import { NextRequest, NextResponse } from 'next/server';
import { aiService, type AnalysisResult } from '@/lib/ai-service';
import { enhancedContentExtractor, type ExtractionResult } from '@/lib/enhanced-content-extractor';
import { detectPlatform } from '@/utils/platform';
import { serverCreditService, CREDIT_COSTS } from '@/services/creditService';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

interface AnalyzeContentRequest {
  url: string;
  elementId?: number;
  forceReanalyze?: boolean;
  accountId?: string; // Optional, will try to get from session
  userId?: string;    // Optional, will try to get from session
}

interface AnalyzeContentResponse {
  success: boolean;
  analysis?: AnalysisResult;
  error?: string;
  limitations?: string[];
  extractedContent?: {
    title?: string;
    description?: string;
    author?: string;
    thumbnail?: string;
    duration?: string;
    platform: string;
    extractionMethod: string;
    fallbackUsed: boolean;
  };
  extractionCapabilities?: string[];
  timing?: {
    totalProcessingTime: number;
    extractionTime: number;
    analysisTime: number;
    completedAt: string;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse request body
    const body: AnalyzeContentRequest = await request.json();
    const { url, elementId, forceReanalyze } = body;
    let { accountId, userId } = body;

    // Try to get user session if accountId/userId not provided
    if (!accountId || !userId) {
      const cookieStore = await cookies();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      
      const authTokenKey = `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`;
      const authToken = cookieStore.get(authTokenKey);
      
      if (authToken?.value) {
        try {
          const tokenData = JSON.parse(authToken.value);
          if (tokenData.user) {
            userId = userId || tokenData.user.id;
            accountId = accountId || tokenData.user.id; // Use user ID as account ID
          }
        } catch (e) {
          console.log('[AnalyzeContent] Could not parse auth token');
        }
      }
    }

    // Check credits if we have an account ID
    if (accountId) {
      const creditService = serverCreditService();
      const hasCredits = await creditService.canPerformOperation(accountId, 'CONTENT_ANALYSIS');
      
      if (!hasCredits) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient credits. Content analysis requires ${CREDIT_COSTS.CONTENT_ANALYSIS} credits.`,
            limitations: ['Insufficient credits']
          } as AnalyzeContentResponse,
          { status: 402 } // Payment Required
        );
      }
    } else {
      console.warn('[AnalyzeContent] No account ID provided, skipping credit check');
    }

    // Validate required fields
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'URL is required and must be a string'
        } as AnalyzeContentResponse,
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid URL format'
        } as AnalyzeContentResponse,
        { status: 400 }
      );
    }

    // Check if AI services are available
    if (!aiService.isAvailable()) {
      return NextResponse.json(
        {
          success: false,
          error: 'No AI services available. Please configure OpenAI or Anthropic API keys.',
          limitations: ['OpenAI API key missing', 'Anthropic API key missing']
        } as AnalyzeContentResponse,
        { status: 503 }
      );
    }

    console.log(`Starting content analysis for: ${url} (Element ID: ${elementId})`);
    console.log(`Available AI services: ${aiService.getAvailableServices().join(', ')}`);

    // Detect platform
    const platform = detectPlatform(url);
    console.log(`Detected platform: ${platform}`);

    // Check if URL is supported for enhanced extraction
    const isEnhancedSupported = enhancedContentExtractor.isEnhancedExtractionSupported(url);
    console.log(`Enhanced extraction supported: ${isEnhancedSupported}`);

    // Extract content from URL using enhanced extractor
    console.log('Starting enhanced content extraction...');
    const extractionResult: ExtractionResult = await enhancedContentExtractor.extractContent(url, platform);
    
    if (!extractionResult.success) {
      console.error('Content extraction failed:', extractionResult.error);
      return NextResponse.json(
        {
          success: false,
          error: `Content extraction failed: ${extractionResult.error}`,
          extractionCapabilities: enhancedContentExtractor.getExtractionCapabilities(platform)
        } as AnalyzeContentResponse,
        { status: 422 }
      );
    }

    const extractedContent = extractionResult.content!;
    console.log('Enhanced content extracted:', {
      title: extractedContent.title,
      hasDescription: !!extractedContent.description,
      hasTranscript: !!extractedContent.transcript,
      hasText: !!extractedContent.text,
      hasCaption: !!extractedContent.caption,
      author: extractedContent.author,
      extractionMethod: extractedContent.extractionMethod,
      fallbackUsed: extractionResult.fallbackUsed,
      contentLength: extractedContent.text?.length || 0,
      platform: extractedContent.platform
    });

    // Get platform capabilities
    const extractionCapabilities = enhancedContentExtractor.getExtractionCapabilities(platform);

    // Perform AI analysis
    console.log('Starting AI analysis...');
    const analysis = await aiService.analyzeContent(extractedContent);
    
    const processingTime = Date.now() - startTime;
    console.log(`Analysis completed in ${processingTime}ms`);

    // Log analysis summary
    console.log('Analysis summary:', {
      sentiment: analysis.sentiment,
      engagementScore: analysis.engagementScore,
      complexity: analysis.complexity,
      topicsCount: analysis.topics?.length || 0,
      keyPointsCount: analysis.keyPoints?.length || 0
    });

    // Deduct credits after successful analysis
    if (accountId && userId) {
      const creditService = serverCreditService();
      const deducted = await creditService.deductCredits(
        accountId,
        userId,
        'CONTENT_ANALYSIS',
        {
          url,
          elementId,
          platform: extractedContent.platform,
          processingTime
        }
      );
      
      if (!deducted) {
        console.warn('[AnalyzeContent] Failed to deduct credits, but analysis completed');
      } else {
        console.log(`[AnalyzeContent] Deducted ${CREDIT_COSTS.CONTENT_ANALYSIS} credits from account ${accountId}`);
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
      extractedContent: {
        title: extractedContent.title,
        description: extractedContent.description,
        author: extractedContent.author,
        thumbnail: extractedContent.thumbnail,
        duration: extractedContent.duration,
        platform: extractedContent.platform,
        extractionMethod: extractedContent.extractionMethod,
        fallbackUsed: extractionResult.fallbackUsed
      },
      extractionCapabilities,
      timing: {
        totalProcessingTime: processingTime,
        extractionTime: Math.round(processingTime * 0.6), // Estimated
        analysisTime: Math.round(processingTime * 0.4),   // Estimated
        completedAt: new Date().toISOString()
      }
    } as AnalyzeContentResponse);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('Content analysis failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime
    });

    // Determine error type and appropriate response
    let statusCode = 500;
    let errorMessage = 'Internal server error during analysis';

    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        statusCode = 401;
        errorMessage = 'AI service authentication failed. Check API keys.';
      } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
        statusCode = 429;
        errorMessage = 'AI service rate limit exceeded. Please try again later.';
      } else if (error.message.includes('timeout')) {
        statusCode = 408;
        errorMessage = 'Analysis request timed out. Please try again.';
      } else if (error.message.includes('All AI services failed')) {
        statusCode = 503;
        errorMessage = error.message;
      } else {
        errorMessage = `Analysis failed: ${error.message}`;
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      } as AnalyzeContentResponse,
      { status: statusCode }
    );
  }
}

export async function GET() {
  // Health check endpoint
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    aiServices: aiService.getAvailableServices(),
    isAvailable: aiService.isAvailable()
  });
}

// Export types for use in other files
export type { AnalyzeContentRequest, AnalyzeContentResponse };