import { ContentData } from './ai-service';

interface YouTubeData {
  title?: string;
  description?: string;
  transcript?: string;
}

interface InstagramData {
  caption?: string;
  description?: string;
}

interface TikTokData {
  description?: string;
  caption?: string;
}

export class ContentExtractor {
  
  /**
   * Extract YouTube video ID from URL
   */
  private extractYouTubeId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
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
   * Extract Instagram post ID from URL
   */
  private extractInstagramId(url: string): string | null {
    const match = url.match(/instagram\.com\/p\/([^\/\?]+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract TikTok video ID from URL
   */
  private extractTikTokId(url: string): string | null {
    const patterns = [
      /tiktok\.com\/@[^\/]+\/video\/(\d+)/,
      /tiktok\.com\/v\/(\d+)/,
      /vm\.tiktok\.com\/([^\/\?]+)/
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
   * Fetch YouTube video metadata using oEmbed API
   */
  private async fetchYouTubeData(videoId: string): Promise<YouTubeData> {
    try {
      // Use YouTube oEmbed API for basic metadata
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oembedUrl);
      
      if (!response.ok) {
        throw new Error(`YouTube oEmbed API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        title: data.title,
        description: data.author_name ? `By ${data.author_name}` : undefined,
        // Note: Transcript would require YouTube Data API v3 or third-party service
        transcript: 'Transcript extraction requires YouTube Data API key or third-party service'
      };
    } catch (error) {
      console.warn('Failed to fetch YouTube data:', error);
      return {
        title: 'YouTube Video',
        description: 'Unable to fetch video details'
      };
    }
  }

  /**
   * Fetch Instagram post metadata (limited due to API restrictions)
   */
  private async fetchInstagramData(postId: string): Promise<InstagramData> {
    // Instagram's oEmbed API requires authentication for most posts
    // For now, return basic structure
    return {
      caption: 'Instagram content analysis (caption extraction requires Instagram API access)',
      description: 'Instagram post content'
    };
  }

  /**
   * Fetch TikTok post metadata (limited due to API restrictions)
   */
  private async fetchTikTokData(videoId: string): Promise<TikTokData> {
    // TikTok's API requires authentication
    // For now, return basic structure
    return {
      caption: 'TikTok content analysis (requires TikTok API access)',
      description: 'TikTok video content'
    };
  }

  /**
   * Extract content from generic URLs
   */
  private async fetchGenericContent(url: string): Promise<{ title?: string; description?: string; text?: string }> {
    try {
      // Note: This would require a web scraping service or API
      // For now, return basic URL info
      const urlObj = new URL(url);
      return {
        title: `Content from ${urlObj.hostname}`,
        description: `Web content from ${url}`,
        text: 'Generic web content analysis (requires web scraping service)'
      };
    } catch (error) {
      return {
        title: 'Web Content',
        description: 'Unable to extract content details'
      };
    }
  }

  /**
   * Main extraction method that routes to appropriate extractor
   */
  async extractContent(url: string, platform: string): Promise<ContentData> {
    const baseData: ContentData = {
      url,
      platform
    };

    try {
      switch (platform.toLowerCase()) {
        case 'youtube': {
          const videoId = this.extractYouTubeId(url);
          if (videoId) {
            const youtubeData = await this.fetchYouTubeData(videoId);
            return { ...baseData, ...youtubeData };
          }
          break;
        }

        case 'instagram': {
          const postId = this.extractInstagramId(url);
          if (postId) {
            const instagramData = await this.fetchInstagramData(postId);
            return { ...baseData, ...instagramData };
          }
          break;
        }

        case 'tiktok': {
          const videoId = this.extractTikTokId(url);
          if (videoId) {
            const tiktokData = await this.fetchTikTokData(videoId);
            return { ...baseData, ...tiktokData };
          }
          break;
        }

        default: {
          const genericData = await this.fetchGenericContent(url);
          return { ...baseData, ...genericData };
        }
      }
    } catch (error) {
      console.warn(`Failed to extract ${platform} content:`, error);
    }

    // Fallback data
    return {
      ...baseData,
      title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Content`,
      description: `Content from ${url}`,
      text: 'Limited content extraction - consider implementing platform-specific APIs for richer analysis'
    };
  }

  /**
   * Validate if URL is supported
   */
  isSupportedUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      return (
        hostname.includes('youtube.com') ||
        hostname.includes('youtu.be') ||
        hostname.includes('instagram.com') ||
        hostname.includes('tiktok.com') ||
        hostname.includes('vm.tiktok.com')
      );
    } catch {
      return false;
    }
  }

  /**
   * Get platform-specific limitations info
   */
  getPlatformLimitations(platform: string): string[] {
    const limitations: Record<string, string[]> = {
      youtube: [
        'Transcript extraction requires YouTube Data API v3',
        'Some videos may have restricted metadata access'
      ],
      instagram: [
        'Caption extraction requires Instagram Basic Display API',
        'Many posts require user authentication to access'
      ],
      tiktok: [
        'Content extraction requires TikTok API access',
        'Video descriptions and captions need authentication'
      ]
    };

    return limitations[platform.toLowerCase()] || [
      'Generic content extraction has limited capabilities',
      'Consider implementing platform-specific APIs for better analysis'
    ];
  }
}

export const contentExtractor = new ContentExtractor();