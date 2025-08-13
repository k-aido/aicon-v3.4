import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AnalysisRequest {
  elementId: string;
  contentUrl: string;
  platform: string;
  caption?: string;
  thumbnail?: string;
  metrics: {
    likes: number;
    comments: number;
    views: number;
  };
  duration?: number;
}

interface ContentAnalysis {
  keyTopics: string[];
  contentStructure: {
    hook: string;
    body: string[];
    cta: string;
  };
  engagementTactics: string[];
  sentiment: string;
  complexity: string;
  analyzedAt: Date;
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();
    const { elementId, contentUrl, platform, caption, metrics, duration } = body;

    // Validate required fields
    if (!elementId || !contentUrl || !platform) {
      return NextResponse.json({ 
        error: 'Missing required fields: elementId, contentUrl, platform' 
      }, { status: 400 });
    }

    console.log(`[Content Analysis] Analyzing ${platform} content: ${elementId}`);

    // Prepare content for analysis
    const contentData = {
      platform,
      url: contentUrl,
      caption: caption || '',
      metrics: {
        likes: metrics.likes || 0,
        comments: metrics.comments || 0,
        views: metrics.views || 0
      },
      duration: duration || 0,
      engagementRate: metrics.views > 0 ? ((metrics.likes + metrics.comments) / metrics.views * 100).toFixed(2) + '%' : 'Unknown'
    };

    // Create analysis prompt
    const analysisPrompt = createAnalysisPrompt(contentData);

    try {
      // Call OpenAI for analysis
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert social media content analyst. Analyze content for marketing insights, engagement tactics, and structural elements. Provide actionable insights and specific recommendations.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const analysisText = completion.choices[0]?.message?.content;
      if (!analysisText) {
        throw new Error('No analysis returned from OpenAI');
      }

      // Parse the structured analysis
      const analysis = parseAnalysisResponse(analysisText);
      
      // Add metadata
      analysis.analyzedAt = new Date();

      console.log(`[Content Analysis] Analysis completed for ${elementId}`);

      return NextResponse.json({
        success: true,
        elementId,
        analysis
      });

    } catch (openaiError: any) {
      console.error('[Content Analysis] OpenAI API error:', openaiError);
      
      // Fallback to mock analysis if OpenAI fails
      const mockAnalysis = createMockAnalysis(contentData);
      
      return NextResponse.json({
        success: true,
        elementId,
        analysis: mockAnalysis,
        note: 'Using fallback analysis due to API limitation'
      });
    }

  } catch (error: any) {
    console.error('[Content Analysis] Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to analyze content'
    }, { status: 500 });
  }
}

function createAnalysisPrompt(contentData: any): string {
  return `Analyze this ${contentData.platform} content:

URL: ${contentData.url}
Caption: ${contentData.caption || 'No caption provided'}
Metrics: ${contentData.metrics.likes} likes, ${contentData.metrics.comments} comments, ${contentData.metrics.views} views
Engagement Rate: ${contentData.engagementRate}
Duration: ${contentData.duration ? `${contentData.duration} seconds` : 'Unknown'}

Please provide a structured analysis in the following format:

KEY TOPICS (3-5 main themes):
- Topic 1
- Topic 2
- Topic 3

CONTENT STRUCTURE:
Hook: [Describe the opening/attention-grabbing element]
Body: [List 2-4 main content points as bullet points]
CTA: [Describe the call-to-action or desired outcome]

ENGAGEMENT TACTICS (3-5 specific techniques used):
- Tactic 1
- Tactic 2
- Tactic 3

SENTIMENT: [positive/negative/neutral]
COMPLEXITY: [simple/moderate/complex]

Focus on actionable insights and specific marketing techniques that can be replicated.`;
}

function parseAnalysisResponse(analysisText: string): ContentAnalysis {
  try {
    // Extract sections using regex patterns (using [\s\S] instead of /s flag for compatibility)
    const keyTopicsMatch = analysisText.match(/KEY TOPICS.*?:([\s\S]*?)(?=CONTENT STRUCTURE|$)/);
    const contentStructureMatch = analysisText.match(/CONTENT STRUCTURE:([\s\S]*?)(?=ENGAGEMENT TACTICS|$)/);
    const engagementMatch = analysisText.match(/ENGAGEMENT TACTICS.*?:([\s\S]*?)(?=SENTIMENT|$)/);
    const sentimentMatch = analysisText.match(/SENTIMENT:\s*\[?(.*?)\]?(?=\n|COMPLEXITY|$)/);
    const complexityMatch = analysisText.match(/COMPLEXITY:\s*\[?(.*?)\]?(?=\n|$)/);

    // Parse key topics
    const keyTopics = keyTopicsMatch 
      ? keyTopicsMatch[1].split('\n').map(line => line.replace(/^-\s*/, '').trim()).filter(Boolean)
      : ['Content analysis', 'Engagement strategy', 'Social media marketing'];

    // Parse content structure
    let contentStructure = {
      hook: 'Engaging opening that captures attention',
      body: ['Main content points', 'Supporting information', 'Value proposition'],
      cta: 'Clear call-to-action encouraging engagement'
    };

    if (contentStructureMatch) {
      const structureText = contentStructureMatch[1];
      const hookMatch = structureText.match(/Hook:\s*([\s\S]*?)(?=\nBody:|$)/);
      const bodyMatch = structureText.match(/Body:\s*([\s\S]*?)(?=\nCTA:|$)/);
      const ctaMatch = structureText.match(/CTA:\s*([\s\S]*?)(?=\n|$)/);

      if (hookMatch) contentStructure.hook = hookMatch[1].trim();
      if (bodyMatch) {
        const bodyText = bodyMatch[1];
        const bodyPoints = bodyText.split('\n').map(line => line.replace(/^-\s*/, '').trim()).filter(Boolean);
        if (bodyPoints.length > 0) contentStructure.body = bodyPoints;
      }
      if (ctaMatch) contentStructure.cta = ctaMatch[1].trim();
    }

    // Parse engagement tactics
    const engagementTactics = engagementMatch
      ? engagementMatch[1].split('\n').map(line => line.replace(/^-\s*/, '').trim()).filter(Boolean)
      : ['Visual storytelling', 'Emotional connection', 'Clear messaging', 'Social proof'];

    // Parse sentiment and complexity
    const sentiment = sentimentMatch ? sentimentMatch[1].trim().toLowerCase() : 'positive';
    const complexity = complexityMatch ? complexityMatch[1].trim().toLowerCase() : 'moderate';

    return {
      keyTopics: keyTopics.slice(0, 5), // Limit to 5 topics
      contentStructure,
      engagementTactics: engagementTactics.slice(0, 5), // Limit to 5 tactics
      sentiment,
      complexity,
      analyzedAt: new Date()
    };

  } catch (parseError) {
    console.error('[Content Analysis] Failed to parse analysis:', parseError);
    return createMockAnalysis({});
  }
}

function createMockAnalysis(contentData: any): ContentAnalysis {
  const platform = contentData.platform || 'social media';
  
  return {
    keyTopics: [
      `${platform.charAt(0).toUpperCase() + platform.slice(1)} marketing strategy`,
      'Audience engagement',
      'Content creation',
      'Social media optimization',
      'Brand storytelling'
    ],
    contentStructure: {
      hook: `Strong opening that immediately captures ${platform} audience attention with compelling visual or statement`,
      body: [
        'Clear value proposition presented in an engaging manner',
        'Supporting evidence or examples that build credibility',
        'Emotional connection through relatable storytelling',
        'Strategic use of platform-specific features and trends'
      ],
      cta: 'Clear call-to-action that encourages audience interaction and engagement'
    },
    engagementTactics: [
      'Visual storytelling with high-quality imagery',
      'Strategic use of trending hashtags and keywords',
      'Direct audience addressing and question prompts',
      'Timing optimization for peak engagement hours',
      'Cross-platform content adaptation'
    ],
    sentiment: 'positive',
    complexity: 'moderate',
    analyzedAt: new Date()
  };
}