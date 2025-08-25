import { ScrapedContent } from './apifyService';
import YouTubeCaptionService from './youtubeCaptionService';

interface YouTubeVideoDetails {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
      standard?: { url: string; width: number; height: number };
      maxres?: { url: string; width: number; height: number };
    };
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
  contentDetails?: {
    duration: string;
    dimension: string;
    definition: string;
  };
}

/**
 * Alternative YouTube data service using official YouTube Data API v3
 * This provides a cost-effective alternative to Apify for YouTube content
 */
class YouTubeDataService {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.YOUTUBE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[YouTubeDataService] No YouTube API key provided. Service will have limited functionality.');
    }
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'your_youtube_api_key_here';
  }

  /**
   * Extract video ID from various YouTube URL formats
   */
  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Fetch video details using YouTube Data API v3
   */
  async fetchVideoDetails(videoId: string): Promise<YouTubeVideoDetails | null> {
    if (!this.isConfigured()) {
      console.error('[YouTubeDataService] API key not configured');
      return null;
    }

    try {
      const parts = 'snippet,statistics,contentDetails';
      const url = `${this.baseUrl}/videos?part=${parts}&id=${videoId}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('[YouTubeDataService] API request failed:', response.status);
        return null;
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        console.error('[YouTubeDataService] No video found with ID:', videoId);
        return null;
      }

      return data.items[0];
    } catch (error) {
      console.error('[YouTubeDataService] Error fetching video details:', error);
      return null;
    }
  }

  /**
   * Convert YouTube API response to ScrapedContent format
   */
  async convertToScrapedContent(
    videoDetails: YouTubeVideoDetails,
    videoUrl: string
  ): Promise<ScrapedContent> {
    // Parse duration from ISO 8601 format
    const duration = this.parseDuration(videoDetails.contentDetails?.duration);
    
    // Determine video type
    let videoType: 'short' | 'regular' | 'long-form' = 'regular';
    if (videoUrl.includes('/shorts/') || (duration && duration <= 60)) {
      videoType = 'short';
    } else if (duration && duration > 1200) {
      videoType = 'long-form';
    }

    // Extract thumbnail URL (highest quality available)
    const thumbnails = videoDetails.snippet.thumbnails;
    const thumbnailUrl = thumbnails.maxres?.url || 
                        thumbnails.standard?.url || 
                        thumbnails.high?.url || 
                        thumbnails.medium?.url || 
                        thumbnails.default?.url;

    // Extract hashtags and mentions from description
    const description = videoDetails.snippet.description || '';
    const hashtags = this.extractHashtags(description);
    const mentions = this.extractMentions(description);

    // Try to extract chapters from description
    const chapters = this.extractChaptersFromDescription(description, duration);

    // Attempt to fetch transcript
    let transcript: string | null = null;
    try {
      // First try direct caption fetch
      transcript = await YouTubeCaptionService.fetchTranscriptDirect(videoDetails.id);
      
      if (!transcript) {
        // Try alternative caption extraction
        const captionData = {
          captions: {
            captionTracks: [{
              url: `https://www.youtube.com/api/timedtext?v=${videoDetails.id}&lang=en`,
              languageCode: 'en'
            }]
          }
        };
        transcript = await YouTubeCaptionService.extractCaptions(captionData);
      }
    } catch (error) {
      console.error('[YouTubeDataService] Error fetching transcript:', error);
    }

    const scrapedContent: ScrapedContent = {
      platform: 'youtube',
      url: videoUrl,
      title: videoDetails.snippet.title,
      description: description,
      transcript: transcript,
      viewCount: parseInt(videoDetails.statistics?.viewCount || '0'),
      likeCount: parseInt(videoDetails.statistics?.likeCount || '0'),
      commentCount: parseInt(videoDetails.statistics?.commentCount || '0'),
      duration: duration,
      uploadDate: videoDetails.snippet.publishedAt,
      authorName: videoDetails.snippet.channelTitle,
      authorId: videoDetails.snippet.channelId,
      thumbnailUrl: thumbnailUrl,
      videoUrl: videoUrl, // Direct YouTube URL
      hashtags: hashtags,
      mentions: mentions,
      videoType: videoType,
      chapters: chapters,
      isLiveStream: false, // Would need additional API call to determine
      rawData: {
        source: 'youtube-data-api',
        apiResponse: videoDetails
      }
    };

    return scrapedContent;
  }

  /**
   * Main method to scrape YouTube content using official API
   */
  async scrapeYouTube(url: string): Promise<ScrapedContent | null> {
    console.log('[YouTubeDataService] Starting YouTube scrape via official API');

    // Extract video ID
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      console.error('[YouTubeDataService] Could not extract video ID from URL:', url);
      return null;
    }

    // Fetch video details
    const videoDetails = await this.fetchVideoDetails(videoId);
    if (!videoDetails) {
      return null;
    }

    // Convert to ScrapedContent format
    const scrapedContent = await this.convertToScrapedContent(videoDetails, url);
    
    console.log('[YouTubeDataService] Scrape completed successfully:', {
      title: scrapedContent.title,
      hasTranscript: !!scrapedContent.transcript,
      videoType: scrapedContent.videoType,
      duration: scrapedContent.duration
    });

    return scrapedContent;
  }

  /**
   * Check API quota usage
   */
  async checkQuotaUsage(): Promise<{ used: number; limit: number } | null> {
    // YouTube Data API v3 has a daily quota of 10,000 units
    // Each video request costs 1 unit
    // This is a placeholder - actual implementation would track usage
    return {
      used: 0,
      limit: 10000
    };
  }

  // Helper methods
  private parseDuration(duration?: string): number | undefined {
    if (!duration) return undefined;
    
    // Parse ISO 8601 duration (PT1H2M10S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const hours = parseInt(match[1] || '0');
      const minutes = parseInt(match[2] || '0');
      const seconds = parseInt(match[3] || '0');
      return hours * 3600 + minutes * 60 + seconds;
    }
    
    return undefined;
  }

  private extractHashtags(text: string): string[] {
    const hashtags = text.match(/#[\w]+/g) || [];
    return [...new Set(hashtags)];
  }

  private extractMentions(text: string): string[] {
    const mentions = text.match(/@[\w.-]+/g) || [];
    return [...new Set(mentions)];
  }

  private extractChaptersFromDescription(
    description: string, 
    videoDuration?: number
  ): Array<{ title: string; startTime: number; endTime?: number }> {
    const chapters: Array<{ title: string; startTime: number; endTime?: number }> = [];
    const lines = description.split('\n');
    const timestampRegex = /(\d{1,2}:)?\d{1,2}:\d{2}\s*[-–—]?\s*(.+)/;
    
    for (const line of lines) {
      const match = line.match(timestampRegex);
      if (match) {
        const timeStr = match[0].split(/[-–—]/)[0].trim();
        const title = match[2].trim();
        const timeParts = timeStr.split(':').map(p => parseInt(p));
        
        let seconds = 0;
        if (timeParts.length === 3) {
          seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
        } else if (timeParts.length === 2) {
          seconds = timeParts[0] * 60 + timeParts[1];
        }
        
        if (title && seconds >= 0) {
          chapters.push({ title, startTime: seconds });
        }
      }
    }
    
    // Add end times
    for (let i = 0; i < chapters.length - 1; i++) {
      chapters[i].endTime = chapters[i + 1].startTime;
    }
    
    // Set last chapter end time to video duration if available
    if (chapters.length > 0 && videoDuration) {
      chapters[chapters.length - 1].endTime = videoDuration;
    }
    
    return chapters;
  }
}

export default YouTubeDataService;