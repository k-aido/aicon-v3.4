import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

interface AnalysisResult {
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  topics: Array<{ name: string; confidence: number }>;
  hooks: string[];
  engagementScore: number;
  complexity: 'simple' | 'moderate' | 'complex';
  language: string;
  analyzedAt: Date;
}

interface ContentData {
  title?: string;
  description?: string;
  transcript?: string;
  caption?: string;
  text?: string;
  author?: string;
  thumbnail?: string;
  duration?: string;
  platform: string;
  url: string;
  metadata?: Record<string, any>;
  extractionMethod?: string;
}

class AIService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;

  constructor() {
    try {
      if (process.env.OPENAI_API_KEY) {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
      }
      
      if (process.env.ANTHROPIC_API_KEY) {
        this.anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
      }
    } catch (error) {
      console.warn('Failed to initialize AI services:', error);
    }
  }

  private createAnalysisPrompt(content: ContentData): string {
    const contentSections = [
      content.title && `Title: ${content.title}`,
      content.author && `Author/Creator: ${content.author}`,
      content.description && `Description: ${content.description}`,
      content.caption && `Caption: ${content.caption}`,
      content.transcript && `Transcript: ${content.transcript}`,
      content.text && `Main Content: ${content.text}`,
      content.duration && `Duration: ${content.duration}`
    ].filter(Boolean).join('\n\n');

    const metadataInfo = content.metadata ? 
      `\nMetadata: ${JSON.stringify(content.metadata, null, 2)}` : '';

    return `Analyze this ${content.platform} content and provide a structured analysis:

${contentSections}

Platform: ${content.platform}
URL: ${content.url}
Extraction Method: ${content.extractionMethod || 'standard'}${metadataInfo}

Please provide a JSON response with the following structure:
{
  "summary": "A concise 2-3 sentence summary of the content",
  "keyPoints": ["Array of 3-5 key points or takeaways"],
  "sentiment": "positive|negative|neutral",
  "topics": [{"name": "topic name", "confidence": 0.0-1.0}],
  "hooks": ["Array of attention-grabbing elements or phrases"],
  "engagementScore": 0-100,
  "complexity": "simple|moderate|complex",
  "language": "detected language code (e.g., 'en', 'es')"
}

Focus on:
- Content quality and value proposition
- Emotional impact and sentiment
- Key themes and topics
- Engagement potential
- Hook effectiveness
- Overall complexity level

Return only valid JSON without any markdown formatting or additional text.`;
  }

  async analyzeWithOpenAI(content: ContentData): Promise<AnalysisResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert content analyst. Analyze content and return structured JSON responses only. Be precise and objective.'
        },
        {
          role: 'user',
          content: this.createAnalysisPrompt(content)
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    try {
      const analysis = JSON.parse(response);
      return {
        ...analysis,
        analyzedAt: new Date()
      };
    } catch (error) {
      throw new Error('Invalid JSON response from OpenAI');
    }
  }

  async analyzeWithClaude(content: ContentData): Promise<AnalysisResult> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    const message = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: this.createAnalysisPrompt(content)
        }
      ]
    });

    const response = message.content[0];
    if (response.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    try {
      // Extract JSON from response (Claude might include extra text)
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      return {
        ...analysis,
        analyzedAt: new Date()
      };
    } catch (error) {
      throw new Error('Invalid JSON response from Claude');
    }
  }

  async analyzeContent(content: ContentData): Promise<AnalysisResult> {
    const errors: string[] = [];

    // Try OpenAI first
    if (this.openai) {
      try {
        console.log('Attempting analysis with OpenAI...');
        return await this.analyzeWithOpenAI(content);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown OpenAI error';
        console.warn('OpenAI analysis failed:', errorMsg);
        errors.push(`OpenAI: ${errorMsg}`);
      }
    }

    // Fallback to Claude
    if (this.anthropic) {
      try {
        console.log('Attempting analysis with Claude...');
        return await this.analyzeWithClaude(content);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown Claude error';
        console.warn('Claude analysis failed:', errorMsg);
        errors.push(`Claude: ${errorMsg}`);
      }
    }

    // If both fail, throw consolidated error
    throw new Error(`All AI services failed: ${errors.join('; ')}`);
  }

  isAvailable(): boolean {
    return !!(this.openai || this.anthropic);
  }

  getAvailableServices(): string[] {
    const services: string[] = [];
    if (this.openai) services.push('OpenAI');
    if (this.anthropic) services.push('Claude');
    return services;
  }
}

// Export singleton instance
export const aiService = new AIService();
export type { AnalysisResult, ContentData };