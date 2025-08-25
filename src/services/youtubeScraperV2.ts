import { ScrapedContent } from './apifyService';
import YouTubeDataService from './youtubeDataService';
import YouTubeCaptionService from './youtubeCaptionService';
import YouTubeTranscriptionService from './youtubeTranscriptionService';
import ApifyService from './apifyService';

interface ScrapeOptions {
  preferFreeApi?: boolean;
  includeTranscript?: boolean;
  maxTranscriptionDuration?: number;
  fallbackToApify?: boolean;
}

interface ScrapeResult {
  content: ScrapedContent | null;
  method: 'youtube-api' | 'apify' | 'hybrid';
  cost: {
    credits: number;
    apiCalls: number;
    estimatedUsd: number;
  };
  errors?: string[];
}

/**
 * Enhanced YouTube scraper that intelligently chooses the best method
 * Priority: YouTube API (free) > Direct methods > Apify (paid)
 */
class YouTubeScraperV2 {
  private youtubeDataService: YouTubeDataService;
  private captionService: typeof YouTubeCaptionService;
  private transcriptionService: YouTubeTranscriptionService | null;
  private apifyService: ApifyService | null;

  constructor() {
    this.youtubeDataService = new YouTubeDataService();
    this.captionService = YouTubeCaptionService;
    
    // Initialize optional services
    try {
      this.transcriptionService = new YouTubeTranscriptionService();
    } catch {
      this.transcriptionService = null;
    }

    try {
      this.apifyService = new ApifyService();
    } catch {
      this.apifyService = null;
    }
  }

  /**
   * Main scraping method with intelligent fallbacks
   */
  async scrapeYouTube(
    url: string,
    options: ScrapeOptions = {}
  ): Promise<ScrapeResult> {
    const {
      preferFreeApi = true,
      includeTranscript = true,
      maxTranscriptionDuration = 600,
      fallbackToApify = true
    } = options;

    const errors: string[] = [];
    let result: ScrapeResult = {
      content: null,
      method: 'youtube-api',
      cost: { credits: 0, apiCalls: 0, estimatedUsd: 0 },
      errors
    };

    console.log('[YouTubeScraperV2] Starting intelligent YouTube scrape:', {
      url,
      preferFreeApi,
      includeTranscript
    });

    // Method 1: Try YouTube Data API (free within quota)
    if (preferFreeApi && this.youtubeDataService.isConfigured()) {
      console.log('[YouTubeScraperV2] Attempting YouTube Data API method');
      try {
        const content = await this.youtubeDataService.scrapeYouTube(url);
        if (content) {
          result.content = content;
          result.method = 'youtube-api';
          result.cost.apiCalls = 1;
          
          // If transcript is missing and needed, try to get it
          if (includeTranscript && !content.transcript) {
            await this.enhanceWithTranscript(content, maxTranscriptionDuration);
          }
          
          console.log('[YouTubeScraperV2] Success with YouTube API method');
          return result;
        }
      } catch (error: any) {
        errors.push(`YouTube API error: ${error.message}`);
        console.error('[YouTubeScraperV2] YouTube API failed:', error);
      }
    }

    // Method 2: Try direct scraping methods
    if (!result.content) {
      console.log('[YouTubeScraperV2] Attempting direct scraping methods');
      try {
        const content = await this.directScrape(url, includeTranscript, maxTranscriptionDuration);
        if (content) {
          result.content = content;
          result.method = 'hybrid';
          console.log('[YouTubeScraperV2] Success with direct methods');
          return result;
        }
      } catch (error: any) {
        errors.push(`Direct scraping error: ${error.message}`);
        console.error('[YouTubeScraperV2] Direct methods failed:', error);
      }
    }

    // Method 3: Fall back to Apify (paid)
    if (!result.content && fallbackToApify && this.apifyService) {
      console.log('[YouTubeScraperV2] Falling back to Apify method');
      try {
        const { runId } = await this.apifyService.scrapeYouTube(url);
        
        // Poll for results (simplified for this example)
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const content = await this.apifyService.getRunResults(runId);
        if (content) {
          result.content = content;
          result.method = 'apify';
          result.cost.credits = 50; // Based on your credit system
          result.cost.estimatedUsd = 0.05; // Estimate
          console.log('[YouTubeScraperV2] Success with Apify method');
          return result;
        }
      } catch (error: any) {
        errors.push(`Apify error: ${error.message}`);
        console.error('[YouTubeScraperV2] Apify failed:', error);
      }
    }

    // All methods failed
    console.error('[YouTubeScraperV2] All scraping methods failed');
    return result;
  }

  /**
   * Direct scraping using ytdl-core and other methods
   */
  private async directScrape(
    url: string,
    includeTranscript: boolean,
    maxTranscriptionDuration: number
  ): Promise<ScrapedContent | null> {
    // Extract video ID
    const videoId = this.captionService.extractVideoId(url);
    if (!videoId) {
      throw new Error('Could not extract video ID from URL');
    }

    // Create basic content structure
    const content: ScrapedContent = {
      platform: 'youtube',
      url,
      title: `YouTube Video ${videoId}`,
      videoType: 'regular',
      rawData: {
        source: 'direct-scrape',
        videoId
      }
    };

    // Try to get transcript
    if (includeTranscript) {
      try {
        // Try direct caption fetch first
        const transcript = await this.captionService.fetchTranscriptDirect(videoId);
        if (transcript) {
          content.transcript = transcript;
          content.rawData.transcriptSource = 'direct-captions';
        }
      } catch (error) {
        console.error('[YouTubeScraperV2] Direct caption fetch failed:', error);
      }

      // Try audio transcription if no captions
      if (!content.transcript && this.transcriptionService) {
        try {
          const transcript = await this.transcriptionService.transcribeYouTubeVideo(url, videoId);
          if (transcript) {
            content.transcript = transcript;
            content.rawData.transcriptSource = 'audio-transcription';
          }
        } catch (error) {
          console.error('[YouTubeScraperV2] Audio transcription failed:', error);
        }
      }
    }

    return content;
  }

  /**
   * Enhance existing content with transcript
   */
  private async enhanceWithTranscript(
    content: ScrapedContent,
    maxTranscriptionDuration: number
  ): Promise<void> {
    const videoId = content.rawData?.apiResponse?.id || this.captionService.extractVideoId(content.url);
    if (!videoId) return;

    // Try caption fetch
    try {
      const transcript = await this.captionService.fetchTranscriptDirect(videoId);
      if (transcript) {
        content.transcript = transcript;
        content.rawData.transcriptSource = 'captions';
        return;
      }
    } catch (error) {
      console.error('[YouTubeScraperV2] Caption fetch failed:', error);
    }

    // Try audio transcription for shorter videos
    if (content.duration && content.duration <= maxTranscriptionDuration && this.transcriptionService) {
      try {
        const transcript = await this.transcriptionService.transcribeYouTubeVideo(content.url, videoId);
        if (transcript) {
          content.transcript = transcript;
          content.rawData.transcriptSource = 'audio-transcription';
        }
      } catch (error) {
        console.error('[YouTubeScraperV2] Audio transcription failed:', error);
      }
    }
  }

  /**
   * Estimate cost for different methods
   */
  estimateCost(method: 'youtube-api' | 'apify' | 'hybrid'): {
    credits: number;
    estimatedUsd: number;
    description: string;
  } {
    switch (method) {
      case 'youtube-api':
        return {
          credits: 0,
          estimatedUsd: 0,
          description: 'Free within YouTube API quota (10,000 units/day)'
        };
      case 'hybrid':
        return {
          credits: 0,
          estimatedUsd: 0.01, // Small cost for potential Whisper API usage
          description: 'Minimal cost, may use Whisper API for transcription'
        };
      case 'apify':
        return {
          credits: 50,
          estimatedUsd: 0.05,
          description: 'Apify actor usage + credit consumption'
        };
    }
  }

  /**
   * Get recommended method based on requirements
   */
  getRecommendedMethod(requirements: {
    needsTranscript: boolean;
    videoDuration?: number;
    budgetSensitive: boolean;
  }): 'youtube-api' | 'apify' | 'hybrid' {
    const { needsTranscript, videoDuration, budgetSensitive } = requirements;

    // For budget-sensitive users, always try free methods first
    if (budgetSensitive) {
      return 'youtube-api';
    }

    // For long videos needing transcripts, Apify might be more reliable
    if (needsTranscript && videoDuration && videoDuration > 600) {
      return 'apify';
    }

    // Default to YouTube API
    return 'youtube-api';
  }
}

export default YouTubeScraperV2;
export type { ScrapeOptions, ScrapeResult };