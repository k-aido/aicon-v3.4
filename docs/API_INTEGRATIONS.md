# AICON v3 API Integration Architecture Specification

## Overview
This document defines the complete API integration architecture for AICON v3, managing all external AI services and ensuring reliable, cost-effective, and scalable API usage. The system handles OpenAI, Anthropic Claude, ElevenLabs, HeyGen, and Perplexity integrations with comprehensive error handling, rate limiting, and cost tracking.

## Technology Stack
- **Backend**: Node.js with TypeScript
- **API Framework**: Next.js API routes
- **Database**: Supabase PostgreSQL
- **Queue Management**: Built-in processing queue (using database)
- **Caching**: Redis for rate limiting and response caching
- **Environment**: Secure environment variable management

## External Services Integration

### 1. OpenAI Integration

#### Configuration
```typescript
interface OpenAIConfig {
  apiKey: string;
  organization?: string;
  baseURL: string;
  defaultModel: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
  maxTokens: {
    'gpt-4': 8192;
    'gpt-4-turbo': 128000;
    'gpt-3.5-turbo': 4096;
  };
  costPerToken: {
    'gpt-4': { input: 0.03, output: 0.06 };
    'gpt-4-turbo': { input: 0.01, output: 0.03 };
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 };
  };
}
```

#### OpenAI Service Implementation
```typescript
class OpenAIService {
  private client: OpenAI;
  
  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization
    });
  }
  
  async analyzeContent(content: ContentPiece): Promise<ContentAnalysis> {
    const prompt = this.buildAnalysisPrompt(content);
    
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a content analysis expert. Analyze the provided content and return structured JSON with hook, body, CTA, and style analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });
      
      // Log usage and cost
      await this.logAPIUsage({
        service: 'openai',
        endpoint: 'chat/completions',
        model: 'gpt-4-turbo',
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        cost: this.calculateCost(response.usage, 'gpt-4-turbo')
      });
      
      return this.parseAnalysisResponse(response.choices[0].message.content);
      
    } catch (error) {
      await this.handleAPIError('openai', 'content_analysis', error);
      throw error;
    }
  }
  
  async rewriteScript(originalScript: string, researchPerspectives: any[], userPersona: UserProfile): Promise<string> {
    const prompt = this.buildRewritePrompt(originalScript, researchPerspectives, userPersona);
    
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a content creation expert. Rewrite the provided script incorporating research perspectives and user brand persona for maximum engagement.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });
      
      await this.logAPIUsage({
        service: 'openai',
        endpoint: 'chat/completions',
        model: 'gpt-4-turbo',
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        cost: this.calculateCost(response.usage, 'gpt-4-turbo')
      });
      
      return response.choices[0].message.content;
      
    } catch (error) {
      await this.handleAPIError('openai', 'script_rewrite', error);
      throw error;
    }
  }
  
  async transcribeContent(audioUrl: string): Promise<string> {
    const response = await this.client.audio.transcriptions.create({
      file: await this.downloadFileForTranscription(audioUrl),
      model: 'whisper-1',
      language: 'en'
    });
    
    return response.text;
  }
  
  private buildAnalysisPrompt(content: ContentPiece): string {
    return `
Analyze this ${content.content_type} content:

Title: ${content.title || 'No title'}
Platform: ${content.platform}
Description: ${content.description || 'No description'}
Transcript: ${content.transcript || 'No transcript available'}

Please provide a detailed analysis in JSON format with these fields:
{
  "hookAnalysis": "Analysis of the opening/hook effectiveness",
  "bodyAnalysis": "Analysis of the main content structure and flow",
  "ctaAnalysis": "Analysis of the call-to-action effectiveness",
  "contentStyleAnalysis": "Overall style, tone, and approach analysis",
  "hashtags": ["relevant", "hashtags"],
  "mentions": ["@mentions", "found"],
  "engagementScore": 0.85,
  "trendingElements": ["element1", "element2"]
}
    `;
  }
  
  private calculateCost(usage: any, model: string): number {
    if (!usage) return 0;
    
    const costs = this.config.costPerToken[model];
    const inputCost = (usage.prompt_tokens / 1000) * costs.input;
    const outputCost = (usage.completion_tokens / 1000) * costs.output;
    
    return inputCost + outputCost;
  }
}
```

### 2. Anthropic Claude Integration

#### Configuration
```typescript
interface AnthropicConfig {
  apiKey: string;
  baseURL: string;
  defaultModel: 'claude-3-sonnet-20240229' | 'claude-3-opus-20240229' | 'claude-3-haiku-20240307';
  maxTokens: {
    'claude-3-sonnet': 200000;
    'claude-3-opus': 200000;
    'claude-3-haiku': 200000;
  };
  costPerToken: {
    'claude-3-sonnet': { input: 0.003, output: 0.015 };
    'claude-3-opus': { input: 0.015, output: 0.075 };
    'claude-3-haiku': { input: 0.00025, output: 0.00125 };
  };
}
```

#### Claude Service Implementation
```typescript
class AnthropicService {
  private client: Anthropic;
  
  constructor(config: AnthropicConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey
    });
  }
  
  async analyzeContentAdvanced(content: ContentPiece, context: string[]): Promise<ContentAnalysis> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: this.buildAdvancedAnalysisPrompt(content, context)
          }
        ]
      });
      
      await this.logAPIUsage({
        service: 'anthropic',
        endpoint: 'messages',
        model: 'claude-3-sonnet',
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cost: this.calculateCost(response.usage, 'claude-3-sonnet')
      });
      
      return this.parseAnalysisResponse(response.content[0].text);
      
    } catch (error) {
      await this.handleAPIError('anthropic', 'advanced_analysis', error);
      throw error;
    }
  }
  
  async generateScriptWithContext(prompt: string, connectedContent: ContentPiece[], userPersona: UserProfile): Promise<string> {
    const contextPrompt = this.buildContextualPrompt(prompt, connectedContent, userPersona);
    
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: contextPrompt
          }
        ]
      });
      
      await this.logAPIUsage({
        service: 'anthropic',
        endpoint: 'messages',
        model: 'claude-3-sonnet',
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cost: this.calculateCost(response.usage, 'claude-3-sonnet')
      });
      
      return response.content[0].text;
      
    } catch (error) {
      await this.handleAPIError('anthropic', 'script_generation', error);
      throw error;
    }
  }
}
```

### 3. ElevenLabs Integration

#### Configuration
```typescript
interface ElevenLabsConfig {
  apiKey: string;
  baseURL: string;
  defaultVoiceSettings: {
    stability: 0.75;
    similarity_boost: 0.75;
    style: 0.0;
    use_speaker_boost: true;
  };
  costPerCharacter: 0.0001;
  maxCharactersPerRequest: 5000;
}
```

#### ElevenLabs Service Implementation
```typescript
class ElevenLabsService {
  private client: any; // ElevenLabs SDK
  
  constructor(config: ElevenLabsConfig) {
    this.client = new ElevenLabs({
      apiKey: config.apiKey
    });
  }
  
  async createVoiceModel(userId: string, audioSamples: string[]): Promise<VoiceModel> {
    try {
      // Upload audio samples
      const sampleFiles = await Promise.all(
        audioSamples.map(url => this.downloadAndPrepareAudio(url))
      );
      
      // Create voice clone
      const response = await this.client.voices.clone({
        name: `AICON_Voice_${userId}_${Date.now()}`,
        files: sampleFiles,
        description: 'AICON user voice model'
      });
      
      // Store voice model in database
      const voiceModel = await this.saveVoiceModel({
        userId,
        elevenlabsVoiceId: response.voice_id,
        name: response.name,
        status: 'training'
      });
      
      await this.logAPIUsage({
        service: 'elevenlabs',
        endpoint: 'voices/clone',
        requestType: 'voice_creation',
        cost: this.calculateVoiceCreationCost(sampleFiles)
      });
      
      return voiceModel;
      
    } catch (error) {
      await this.handleAPIError('elevenlabs', 'voice_creation', error);
      throw error;
    }
  }
  
  async generateAudio(text: string, voiceModelId: string): Promise<GeneratedContent> {
    try {
      const voiceModel = await this.getVoiceModel(voiceModelId);
      
      const response = await this.client.textToSpeech.generate({
        voice_id: voiceModel.elevenlabsVoiceId,
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: this.config.defaultVoiceSettings
      });
      
      // Upload audio to Supabase Storage
      const audioUrl = await this.uploadGeneratedAudio(response.audio, voiceModelId);
      
      // Save generated content record
      const generatedContent = await this.saveGeneratedContent({
        voiceModelId,
        contentType: 'audio',
        fileUrl: audioUrl,
        duration: await this.getAudioDuration(response.audio),
        status: 'completed'
      });
      
      await this.logAPIUsage({
        service: 'elevenlabs',
        endpoint: 'text-to-speech',
        requestType: 'audio_generation',
        charactersUsed: text.length,
        cost: this.calculateAudioGenerationCost(text.length)
      });
      
      return generatedContent;
      
    } catch (error) {
      await this.handleAPIError('elevenlabs', 'audio_generation', error);
      throw error;
    }
  }
}
```

### 4. HeyGen Integration

#### Configuration
```typescript
interface HeyGenConfig {
  apiKey: string;
  baseURL: string;
  defaultSettings: {
    quality: 'high';
    ratio: '16:9';
    background: 'office';
  };
  costPerSecond: 0.05;
  maxVideoLength: 300; // 5 minutes
}
```

#### HeyGen Service Implementation
```typescript
class HeyGenService {
  private client: any; // HeyGen SDK
  
  constructor(config: HeyGenConfig) {
    this.client = new HeyGen({
      apiKey: config.apiKey
    });
  }
  
  async createAvatarModel(userId: string, photoUrls: string[]): Promise<AvatarModel> {
    try {
      // Download and prepare photos
      const photoFiles = await Promise.all(
        photoUrls.map(url => this.downloadAndPreparePhoto(url))
      );
      
      // Create avatar
      const response = await this.client.avatars.create({
        name: `AICON_Avatar_${userId}_${Date.now()}`,
        photos: photoFiles,
        avatar_type: 'talking_head'
      });
      
      // Save avatar model in database
      const avatarModel = await this.saveAvatarModel({
        userId,
        heygenAvatarId: response.avatar_id,
        name: response.name,
        status: 'processing'
      });
      
      await this.logAPIUsage({
        service: 'heygen',
        endpoint: 'avatars/create',
        requestType: 'avatar_creation',
        cost: this.calculateAvatarCreationCost(photoFiles.length)
      });
      
      return avatarModel;
      
    } catch (error) {
      await this.handleAPIError('heygen', 'avatar_creation', error);
      throw error;
    }
  }
  
  async generateVideo(script: string, avatarModelId: string, voiceModelId?: string): Promise<GeneratedContent> {
    try {
      const avatarModel = await this.getAvatarModel(avatarModelId);
      let audioUrl;
      
      // Generate audio first if voice model provided
      if (voiceModelId) {
        const audioGeneration = await this.elevenLabsService.generateAudio(script, voiceModelId);
        audioUrl = audioGeneration.fileUrl;
      }
      
      // Generate video with HeyGen
      const response = await this.client.videos.create({
        avatar_id: avatarModel.heygenAvatarId,
        script: script,
        voice_url: audioUrl,
        background: this.config.defaultSettings.background,
        ratio: this.config.defaultSettings.ratio
      });
      
      // Poll for completion
      const completedVideo = await this.pollVideoGeneration(response.video_id);
      
      // Upload video to Supabase Storage
      const videoUrl = await this.uploadGeneratedVideo(completedVideo.video_url, avatarModelId);
      
      // Save generated content record
      const generatedContent = await this.saveGeneratedContent({
        avatarModelId,
        voiceModelId,
        contentType: 'video',
        fileUrl: videoUrl,
        duration: completedVideo.duration,
        status: 'completed'
      });
      
      await this.logAPIUsage({
        service: 'heygen',
        endpoint: 'videos/create',
        requestType: 'video_generation',
        videoDuration: completedVideo.duration,
        cost: this.calculateVideoGenerationCost(completedVideo.duration)
      });
      
      return generatedContent;
      
    } catch (error) {
      await this.handleAPIError('heygen', 'video_generation', error);
      throw error;
    }
  }
}
```

### 5. Perplexity Integration

#### Configuration
```typescript
interface PerplexityConfig {
  apiKey: string;
  baseURL: string;
  defaultModel: 'llama-3.1-sonar-large-128k-online';
  maxTokens: 4000;
  costPerToken: {
    input: 0.001;
    output: 0.001;
  };
}
```

#### Perplexity Service Implementation
```typescript
class PerplexityService {
  private client: any; // Perplexity SDK
  
  constructor(config: PerplexityConfig) {
    this.client = new Perplexity({
      apiKey: config.apiKey
    });
  }
  
  async researchPerspectives(originalScript: string, topic: string): Promise<ResearchPerspective[]> {
    try {
      const prompt = this.buildResearchPrompt(originalScript, topic);
      
      const response = await this.client.chat.completions.create({
        model: this.config.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are a research analyst. Find 3 unique, actionable perspectives to improve the given content script. Focus on current trends, different angles, and evidence-based insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: 0.4
      });
      
      await this.logAPIUsage({
        service: 'perplexity',
        endpoint: 'chat/completions',
        model: this.config.defaultModel,
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        cost: this.calculateCost(response.usage)
      });
      
      return this.parseResearchResponse(response.choices[0].message.content);
      
    } catch (error) {
      await this.handleAPIError('perplexity', 'research', error);
      throw error;
    }
  }
  
  async analyzeTrends(industry: string, contentType: string): Promise<TrendAnalysis> {
    const prompt = `Research current trends in ${industry} for ${contentType} content. Focus on:
    1. Emerging topics and themes
    2. Popular content formats and styles
    3. Effective engagement strategies
    4. Key influencers and thought leaders
    
    Provide actionable insights for content creators.`;
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.defaultModel,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: 0.3
      });
      
      return this.parseTrendAnalysis(response.choices[0].message.content);
      
    } catch (error) {
      await this.handleAPIError('perplexity', 'trend_analysis', error);
      throw error;
    }
  }
}
```

## API Management System

### 1. Unified API Manager

```typescript
class APIManager {
  private services: {
    openai: OpenAIService;
    anthropic: AnthropicService;
    elevenlabs: ElevenLabsService;
    heygen: HeyGenService;
    perplexity: PerplexityService;
  };
  
  private rateLimiter: RateLimiter;
  private costTracker: CostTracker;
  private errorHandler: APIErrorHandler;
  
  constructor() {
    this.services = {
      openai: new OpenAIService(config.openai),
      anthropic: new AnthropicService(config.anthropic),
      elevenlabs: new ElevenLabsService(config.elevenlabs),
      heygen: new HeyGenService(config.heygen),
      perplexity: new PerplexityService(config.perplexity)
    };
    
    this.rateLimiter = new RateLimiter();
    this.costTracker = new CostTracker();
    this.errorHandler = new APIErrorHandler();
  }
  
  async processContentAnalysis(contentPiece: ContentPiece, accountId: string): Promise<ContentAnalysis> {
    // Check account limits and rate limiting
    await this.rateLimiter.checkLimit(accountId, 'content_analysis');
    
    try {
      // Try OpenAI first, fallback to Claude if needed
      let analysis: ContentAnalysis;
      
      try {
        analysis = await this.services.openai.analyzeContent(contentPiece);
      } catch (openaiError) {
        console.warn('OpenAI analysis failed, trying Anthropic:', openaiError);
        analysis = await this.services.anthropic.analyzeContentAdvanced(contentPiece, []);
      }
      
      // Save to database
      await this.saveContentAnalysis(contentPiece.id, analysis);
      
      return analysis;
      
    } catch (error) {
      await this.errorHandler.handleError('content_analysis', error, { contentPieceId: contentPiece.id, accountId });
      throw error;
    }
  }
  
  async processScriptGeneration(
    originalScript: string,
    contentPieceId: string,
    userId: string,
    accountId: string
  ): Promise<GeneratedScript> {
    // 1. Research perspectives with Perplexity
    const researchPerspectives = await this.services.perplexity.researchPerspectives(
      originalScript,
      'content creation'
    );
    
    // 2. Get user persona
    const userProfile = await this.getUserProfile(userId);
    
    // 3. Rewrite script with OpenAI/Claude
    let rewrittenScript: string;
    try {
      rewrittenScript = await this.services.openai.rewriteScript(
        originalScript,
        researchPerspectives,
        userProfile
      );
    } catch (error) {
      rewrittenScript = await this.services.anthropic.generateScriptWithContext(
        originalScript,
        [],
        userProfile
      );
    }
    
    // 4. Save generated script
    const generatedScript = await this.saveGeneratedScript({
      contentPieceId,
      userId,
      accountId,
      originalScript,
      researchPerspectives,
      rewrittenScript,
      aiModelUsed: 'openai-gpt-4'
    });
    
    return generatedScript;
  }
}
```

### 2. Rate Limiting System

```typescript
class RateLimiter {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }
  
  async checkLimit(accountId: string, operation: string): Promise<void> {
    const limits = this.getLimitsForOperation(operation);
    const key = `rate_limit:${accountId}:${operation}`;
    
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, limits.window);
    }
    
    if (current > limits.max) {
      throw new RateLimitError(`Rate limit exceeded for ${operation}`, limits.window);
    }
  }
  
  private getLimitsForOperation(operation: string): { max: number; window: number } {
    const limits = {
      content_analysis: { max: 100, window: 3600 }, // 100 per hour
      script_generation: { max: 50, window: 3600 },  // 50 per hour
      voice_generation: { max: 20, window: 3600 },   // 20 per hour
      video_generation: { max: 10, window: 3600 },   // 10 per hour
      research: { max: 30, window: 3600 }             // 30 per hour
    };
    
    return limits[operation] || { max: 10, window: 3600 };
  }
}
```

### 3. Cost Tracking System

```typescript
class CostTracker {
  async trackUsage(usage: APIUsageLog): Promise<void> {
    // Save to api_usage_logs table
    await supabase.from('api_usage_logs').insert({
      account_id: usage.accountId,
      user_id: usage.userId,
      service_name: usage.service,
      endpoint: usage.endpoint,
      request_type: usage.requestType,
      tokens_used: usage.tokensUsed,
      credits_cost: usage.cost,
      response_time_ms: usage.responseTime,
      status_code: usage.statusCode,
      error_message: usage.errorMessage
    });
    
    // Update account usage stats
    await this.updateAccountUsageStats(usage.accountId, usage.cost);
  }
  
  async getAccountUsage(accountId: string, period: 'day' | 'week' | 'month'): Promise<UsageStats> {
    const { data } = await supabase
      .from('api_usage_logs')
      .select('service_name, credits_cost, created_at')
      .eq('account_id', accountId)
      .gte('created_at', this.getPeriodStart(period));
    
    return this.aggregateUsageStats(data);
  }
  
  async checkAccountLimits(accountId: string): Promise<{ withinLimits: boolean; usage: number; limit: number }> {
    const account = await this.getAccount(accountId);
    const monthlyUsage = await this.getAccountUsage(accountId, 'month');
    
    return {
      withinLimits: monthlyUsage.totalCost <= account.monthlyCredits,
      usage: monthlyUsage.totalCost,
      limit: account.monthlyCredits
    };
  }
}
```

## Frontend Integration

### 1. React Hooks for API Operations

```typescript
// Hook for content analysis
const useContentAnalysis = () => {
  const [analysisStatus, setAnalysisStatus] = useState<Record<string, 'idle' | 'analyzing' | 'completed' | 'error'>>({});
  const apiClient = new AICONAPIClient();
  
  const analyzeContent = useCallback(async (contentPieceId: string) => {
    setAnalysisStatus(prev => ({ ...prev, [contentPieceId]: 'analyzing' }));
    
    try {
      const analysis = await apiClient.analyzeContent(contentPieceId);
      setAnalysisStatus(prev => ({ ...prev, [contentPieceId]: 'completed' }));
      return analysis;
    } catch (error) {
      setAnalysisStatus(prev => ({ ...prev, [contentPieceId]: 'error' }));
      throw error;
    }
  }, []);
  
  return { analyzeContent, analysisStatus };
};

// Hook for script generation
const useScriptGeneration = () => {
  const [generationStatus, setGenerationStatus] = useState<Record<string, GenerationStatus>>({});
  const apiClient = new AICONAPIClient();
  
  const generateScript = useCallback(async (contentPieceId: string) => {
    setGenerationStatus(prev => ({ 
      ...prev, 
      [contentPieceId]: { status: 'generating', progress: 0 }
    }));
    
    try {
      const script = await apiClient.generateScript(contentPieceId);
      
      setGenerationStatus(prev => ({ 
        ...prev, 
        [contentPieceId]: { status: 'completed', progress: 100, result: script }
      }));
      
      return script;
    } catch (error) {
      setGenerationStatus(prev => ({ 
        ...prev, 
        [contentPieceId]: { status: 'error', progress: 0, error: error.message }
      }));
      throw error;
    }
  }, []);
  
  return { generateScript, generationStatus };
};

// Hook for voice model management
const useVoiceModels = () => {
  const [voiceModels, setVoiceModels] = useState<VoiceModel[]>([]);
  const [creationStatus, setCreationStatus] = useState<'idle' | 'creating' | 'completed' | 'error'>('idle');
  const apiClient = new AICONAPIClient();
  
  const createVoiceModel = useCallback(async (audioSamples: File[], name: string) => {
    setCreationStatus('creating');
    
    try {
      const voiceModel = await apiClient.createVoiceModel(audioSamples);
      setVoiceModels(prev => [...prev, voiceModel]);
      setCreationStatus('completed');
      return voiceModel;
    } catch (error) {
      setCreationStatus('error');
      throw error;
    }
  }, []);
  
  const generateAudio = useCallback(async (voiceModelId: string, script: string) => {
    return await apiClient.generateAudio(voiceModelId, script);
  }, []);
  
  return { 
    voiceModels, 
    createVoiceModel, 
    generateAudio, 
    creationStatus 
  };
};
```

## API Routes (Next.js)

### 1. Content Analysis Route

```typescript
// pages/api/content/[id]/analyze.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { id: contentPieceId } = req.query;
    const userId = await getUserIdFromToken(req);
    const accountId = await getAccountIdFromUser(userId);
    
    // Verify user can access this content
    const contentPiece = await getContentPiece(contentPieceId as string, accountId);
    if (!contentPiece) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Process analysis
    const apiManager = new APIManager();
    const analysis = await apiManager.processContentAnalysis(contentPiece, accountId);
    
    res.status(200).json(analysis);
    
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

### 2. Script Generation Route

```typescript
// pages/api/content/[id]/generate-script.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { id: contentPieceId } = req.query;
    const userId = await getUserIdFromToken(req);
    const accountId = await getAccountIdFromUser(userId);
    
    // Get content piece and original script
    const contentPiece = await getContentPiece(contentPieceId as string, accountId);
    if (!contentPiece || !contentPiece.transcript) {
      return res.status(400).json({ error: 'Content piece must have transcript' });
    }
    
    // Add to processing queue for async processing
    const queue = new ProcessingQueue();
    const jobId = await queue.addJob({
      accountId,
      userId,
      type: 'script_generation',
      data: {
        contentPieceId,
        originalScript: contentPiece.transcript
      },
      priority: 1,
      estimatedCredits: 50
    });
    
    res.status(202).json({ 
      message: 'Script generation started',
      jobId,
      estimatedTime: '2-3 minutes'
    });
    
  } catch (error) {
    console.error('Script generation error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

## Environment Configuration

### 1. Environment Variables

```bash
# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...
HEYGEN_API_KEY=...
PERPLEXITY_API_KEY=pplx-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Redis
REDIS_URL=redis://localhost:6379

# App Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW=3600
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Configuration Management

```typescript
// config/api.ts
export const apiConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4-turbo' as const,
    maxTokens: {
      'gpt-4': 8192,
      'gpt-4-turbo': 128000,
      'gpt-3.5-turbo': 4096
    },
    costPerToken: {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
    }
  },
  
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY!,
    baseURL: 'https://api.anthropic.com',
    defaultModel: 'claude-3-sonnet-20240229' as const,
    maxTokens: {
      'claude-3-sonnet': 200000,
      'claude-3-opus': 200000,
      'claude-3-haiku': 200000
    },
    costPerToken: {
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 }
    }
  },
  
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY!,
    baseURL: 'https://api.elevenlabs.io/v1',
    defaultVoiceSettings: {
      stability: 0.75,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true
    },
    costPerCharacter: 0.0001,
    maxCharactersPerRequest: 5000
  },
  
  heygen: {
    apiKey: process.env.HEYGEN_API_KEY!,
    baseURL: 'https://api.heygen.com/v1',
    defaultSettings: {
      quality: 'high' as const,
      ratio: '16:9' as const,
      background: 'office' as const
    },
    costPerSecond: 0.05,
    maxVideoLength: 300
  },
  
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY!,
    baseURL: 'https://api.perplexity.ai',
    defaultModel: 'llama-3.1-sonar-large-128k-online' as const,
    maxTokens: 4000,
    costPerToken: {
      input: 0.001,
      output: 0.001
    }
  }
};

// Validate configuration on startup
export function validateAPIConfig(): void {
  const requiredKeys = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY', 
    'ELEVENLABS_API_KEY',
    'HEYGEN_API_KEY',
    'PERPLEXITY_API_KEY'
  ];
  
  const missing = requiredKeys.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

This comprehensive API Integration Architecture provides all the necessary components for integrating external AI services into AICON v3 with proper error handling, cost tracking, and scalability.