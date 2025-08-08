import * as cheerio from 'cheerio';
import { YoutubeTranscript } from 'youtube-transcript';

interface ExtractedContent {
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
  extractionMethod: string;
  extractionTimestamp: Date;
}

interface ExtractionResult {
  success: boolean;
  content?: ExtractedContent;
  error?: string;
  fallbackUsed: boolean;
}

export class EnhancedContentExtractor {
  private readonly REQUEST_TIMEOUT = 15000; // 15 seconds
  private readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  /**
   * Extract YouTube video ID from various URL formats
   */
  private extractYouTubeId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
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
   * Enhanced YouTube content extraction with multiple methods
   */
  private async extractYouTubeContent(url: string): Promise<ExtractionResult> {
    const videoId = this.extractYouTubeId(url);
    if (!videoId) {
      return { success: false, error: 'Invalid YouTube URL', fallbackUsed: false };
    }

    const baseContent: ExtractedContent = {
      url,
      platform: 'youtube',
      extractionMethod: 'unknown',
      extractionTimestamp: new Date()
    };

    // Method 1: Try to get transcript
    try {
      console.log(`Attempting transcript extraction for YouTube video: ${videoId}`);
      
      const transcriptData = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: 'en',
        country: 'US'
      });

      if (transcriptData && transcriptData.length > 0) {
        const transcript = transcriptData
          .map(item => item.text)
          .join(' ')
          .replace(/\[.*?\]/g, '') // Remove time markers
          .trim();

        console.log(`Transcript extracted: ${transcript.length} characters`);

        // Get additional metadata from oEmbed
        const metadata = await this.getYouTubeMetadata(videoId);
        
        return {
          success: true,
          content: {
            ...baseContent,
            ...metadata,
            transcript,
            extractionMethod: 'youtube-transcript',
            text: transcript
          },
          fallbackUsed: false
        };
      }
    } catch (error) {
      console.warn('YouTube transcript extraction failed:', error);
    }

    // Method 2: YouTube Data API (if API key is available)
    if (process.env.YOUTUBE_API_KEY) {
      try {
        console.log('Attempting YouTube Data API extraction');
        const apiResult = await this.extractYouTubeWithAPI(videoId);
        if (apiResult.success) {
          return apiResult;
        }
      } catch (error) {
        console.warn('YouTube Data API extraction failed:', error);
      }
    }

    // Method 3: Fallback to oEmbed + web scraping
    try {
      console.log('Using fallback YouTube extraction');
      const metadata = await this.getYouTubeMetadata(videoId);
      const scrapedData = await this.scrapeYouTubePage(url);
      
      return {
        success: true,
        content: {
          ...baseContent,
          ...metadata,
          ...scrapedData,
          extractionMethod: 'oembed-scraping',
        },
        fallbackUsed: true
      };
    } catch (error) {
      return {
        success: false,
        error: `All YouTube extraction methods failed: ${error}`,
        fallbackUsed: true
      };
    }
  }

  /**
   * Get YouTube metadata using oEmbed API
   */
  private async getYouTubeMetadata(videoId: string): Promise<Partial<ExtractedContent>> {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oembedUrl, {
        headers: { 'User-Agent': this.USER_AGENT },
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`oEmbed API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        title: data.title,
        author: data.author_name,
        thumbnail: data.thumbnail_url,
        description: `YouTube video by ${data.author_name}`,
        metadata: {
          width: data.width,
          height: data.height,
          provider: data.provider_name
        }
      };
    } catch (error) {
      console.warn('YouTube oEmbed failed:', error);
      return {};
    }
  }

  /**
   * YouTube Data API extraction (requires API key)
   */
  private async extractYouTubeWithAPI(videoId: string): Promise<ExtractionResult> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YouTube API key not configured');
    }

    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails,statistics`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      const video = data.items?.[0];
      
      if (!video) {
        throw new Error('Video not found');
      }

      const snippet = video.snippet;
      const contentDetails = video.contentDetails;

      return {
        success: true,
        content: {
          url: `https://www.youtube.com/watch?v=${videoId}`,
          platform: 'youtube',
          title: snippet.title,
          description: snippet.description,
          author: snippet.channelTitle,
          thumbnail: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url,
          duration: contentDetails.duration,
          extractionMethod: 'youtube-api',
          extractionTimestamp: new Date(),
          metadata: {
            publishedAt: snippet.publishedAt,
            viewCount: video.statistics?.viewCount,
            likeCount: video.statistics?.likeCount,
            tags: snippet.tags
          }
        },
        fallbackUsed: false
      };
    } catch (error) {
      throw new Error(`YouTube API extraction failed: ${error}`);
    }
  }

  /**
   * Scrape YouTube page for additional data
   */
  private async scrapeYouTubePage(url: string): Promise<Partial<ExtractedContent>> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': this.USER_AGENT },
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract description from meta tags
      const description = $('meta[name="description"]').attr('content') ||
                         $('meta[property="og:description"]').attr('content') ||
                         '';

      return {
        description,
        text: description
      };
    } catch (error) {
      console.warn('YouTube page scraping failed:', error);
      return {};
    }
  }

  /**
   * Extract Instagram content
   */
  private async extractInstagramContent(url: string): Promise<ExtractionResult> {
    const baseContent: ExtractedContent = {
      url,
      platform: 'instagram',
      extractionMethod: 'unknown',
      extractionTimestamp: new Date()
    };

    try {
      // Method 1: Instagram oEmbed (requires Facebook app)
      if (process.env.INSTAGRAM_ACCESS_TOKEN) {
        const oembedResult = await this.extractInstagramOEmbed(url);
        if (oembedResult.success) {
          return oembedResult;
        }
      }

      // Method 2: Web scraping
      console.log('Using Instagram web scraping');
      const response = await fetch(url, {
        headers: { 
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Instagram page: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract from meta tags
      const title = $('meta[property="og:title"]').attr('content') || 'Instagram Post';
      const description = $('meta[property="og:description"]').attr('content') || 
                         $('meta[name="description"]').attr('content') || '';
      const thumbnail = $('meta[property="og:image"]').attr('content');

      // Try to extract from JSON-LD
      let caption = '';
      $('script[type="application/ld+json"]').each((_, element) => {
        try {
          const jsonData = JSON.parse($(element).html() || '');
          if (jsonData.caption) {
            caption = jsonData.caption;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      });

      return {
        success: true,
        content: {
          ...baseContent,
          title,
          description,
          caption: caption || description,
          thumbnail,
          text: caption || description,
          extractionMethod: 'web-scraping'
        },
        fallbackUsed: true
      };

    } catch (error) {
      return {
        success: false,
        error: `Instagram extraction failed: ${error}`,
        fallbackUsed: true
      };
    }
  }

  /**
   * Instagram oEmbed extraction
   */
  private async extractInstagramOEmbed(url: string): Promise<ExtractionResult> {
    try {
      const oembedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`;
      
      const response = await fetch(oembedUrl, {
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`Instagram oEmbed error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        content: {
          url,
          platform: 'instagram',
          title: 'Instagram Post',
          description: data.title || '',
          thumbnail: data.thumbnail_url,
          author: data.author_name,
          extractionMethod: 'instagram-oembed',
          extractionTimestamp: new Date()
        },
        fallbackUsed: false
      };
    } catch (error) {
      throw new Error(`Instagram oEmbed failed: ${error}`);
    }
  }

  /**
   * Extract TikTok content
   */
  private async extractTikTokContent(url: string): Promise<ExtractionResult> {
    const baseContent: ExtractedContent = {
      url,
      platform: 'tiktok',
      extractionMethod: 'web-scraping',
      extractionTimestamp: new Date()
    };

    try {
      // TikTok oEmbed
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      const response = await fetch(oembedUrl, {
        headers: { 'User-Agent': this.USER_AGENT },
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT)
      });

      if (response.ok) {
        const data = await response.json();
        
        return {
          success: true,
          content: {
            ...baseContent,
            title: data.title || 'TikTok Video',
            description: data.title || '',
            author: data.author_name,
            thumbnail: data.thumbnail_url,
            text: data.title || '',
            extractionMethod: 'tiktok-oembed'
          },
          fallbackUsed: false
        };
      }

      // Fallback to web scraping
      const pageResponse = await fetch(url, {
        headers: { 'User-Agent': this.USER_AGENT },
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT)
      });

      if (!pageResponse.ok) {
        throw new Error(`Failed to fetch TikTok page: ${pageResponse.status}`);
      }

      const html = await pageResponse.text();
      const $ = cheerio.load(html);

      const title = $('meta[property="og:title"]').attr('content') || 'TikTok Video';
      const description = $('meta[property="og:description"]').attr('content') || '';
      const thumbnail = $('meta[property="og:image"]').attr('content');

      return {
        success: true,
        content: {
          ...baseContent,
          title,
          description,
          caption: description,
          thumbnail,
          text: description,
          extractionMethod: 'web-scraping'
        },
        fallbackUsed: true
      };

    } catch (error) {
      return {
        success: false,
        error: `TikTok extraction failed: ${error}`,
        fallbackUsed: true
      };
    }
  }

  /**
   * Enhanced generic web content extraction
   */
  private async extractGenericContent(url: string): Promise<ExtractionResult> {
    const baseContent: ExtractedContent = {
      url,
      platform: 'web',
      extractionMethod: 'web-scraping',
      extractionTimestamp: new Date()
    };

    try {
      const response = await fetch(url, {
        headers: { 
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract title
      const title = $('meta[property="og:title"]').attr('content') ||
                   $('meta[name="twitter:title"]').attr('content') ||
                   $('title').text() ||
                   'Web Content';

      // Extract description
      const description = $('meta[property="og:description"]').attr('content') ||
                         $('meta[name="twitter:description"]').attr('content') ||
                         $('meta[name="description"]').attr('content') ||
                         '';

      // Extract main content
      let mainText = '';
      
      // Try to find article content
      const articleSelectors = [
        'article',
        '[role="main"]',
        '.content',
        '.post-content',
        '.entry-content',
        'main',
        '.main-content'
      ];

      for (const selector of articleSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          mainText = element.text().trim();
          if (mainText.length > 100) break; // Use if substantial content found
        }
      }

      // Fallback to paragraphs
      if (!mainText || mainText.length < 100) {
        mainText = $('p').map((_, el) => $(el).text().trim()).get()
          .filter(text => text.length > 20)
          .slice(0, 10) // First 10 substantial paragraphs
          .join(' ');
      }

      // Clean up text
      mainText = mainText.replace(/\s+/g, ' ').trim();

      // Extract metadata
      const thumbnail = $('meta[property="og:image"]').attr('content') ||
                       $('meta[name="twitter:image"]').attr('content');

      const author = $('meta[name="author"]').attr('content') ||
                    $('meta[property="article:author"]').attr('content') ||
                    $('.author').first().text().trim();

      return {
        success: true,
        content: {
          ...baseContent,
          title: title.trim(),
          description: description.trim(),
          text: mainText,
          thumbnail,
          author: author || undefined,
          metadata: {
            contentLength: mainText.length,
            hasStructuredData: $('script[type="application/ld+json"]').length > 0
          }
        },
        fallbackUsed: false
      };

    } catch (error) {
      return {
        success: false,
        error: `Generic content extraction failed: ${error}`,
        fallbackUsed: true
      };
    }
  }

  /**
   * Main extraction method that routes to appropriate extractor
   */
  async extractContent(url: string, platform: string): Promise<ExtractionResult> {
    console.log(`Starting enhanced extraction for ${platform}: ${url}`);

    try {
      let result: ExtractionResult;

      switch (platform.toLowerCase()) {
        case 'youtube':
          result = await this.extractYouTubeContent(url);
          break;
        case 'instagram':
          result = await this.extractInstagramContent(url);
          break;
        case 'tiktok':
          result = await this.extractTikTokContent(url);
          break;
        default:
          result = await this.extractGenericContent(url);
          break;
      }

      // If extraction failed, provide fallback content
      if (!result.success) {
        console.warn(`Extraction failed for ${url}, using fallback`);
        const urlObj = new URL(url);
        
        result = {
          success: true,
          content: {
            url,
            platform,
            title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Content`,
            description: `Content from ${urlObj.hostname}`,
            text: `Content extraction failed, but AI can still analyze this ${platform} URL for basic insights.`,
            extractionMethod: 'fallback',
            extractionTimestamp: new Date()
          },
          fallbackUsed: true
        };
      }

      console.log(`Extraction completed for ${url}:`, {
        success: result.success,
        method: result.content?.extractionMethod,
        contentLength: result.content?.text?.length || 0,
        fallbackUsed: result.fallbackUsed
      });

      return result;

    } catch (error) {
      console.error(`Extraction error for ${url}:`, error);
      
      // Return minimal fallback content
      return {
        success: true,
        content: {
          url,
          platform,
          title: 'Content',
          description: 'Content analysis available with limited information',
          text: 'Basic content analysis can still be performed on this URL.',
          extractionMethod: 'error-fallback',
          extractionTimestamp: new Date()
        },
        fallbackUsed: true
      };
    }
  }

  /**
   * Validate if URL is supported for enhanced extraction
   */
  isEnhancedExtractionSupported(url: string): boolean {
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
   * Get extraction capabilities for a platform
   */
  getExtractionCapabilities(platform: string): string[] {
    const capabilities: Record<string, string[]> = {
      youtube: [
        'Video transcripts (when available)',
        'Title and description',
        'Author and thumbnail',
        'Video duration and metadata',
        'View counts and engagement stats (with API key)'
      ],
      instagram: [
        'Post captions and descriptions',
        'Author information',
        'Thumbnail images',
        'Basic metadata extraction'
      ],
      tiktok: [
        'Video descriptions and captions',
        'Author information',
        'Thumbnail extraction',
        'Basic video metadata'
      ],
      web: [
        'Page title and description',
        'Main article content',
        'Author information (when available)',
        'Structured data extraction',
        'Social media metadata'
      ]
    };

    return capabilities[platform.toLowerCase()] || [
      'Basic URL analysis',
      'Limited content extraction'
    ];
  }
}

export const enhancedContentExtractor = new EnhancedContentExtractor();
export type { ExtractedContent, ExtractionResult };