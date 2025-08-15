import { ApifyClient } from 'apify-client';
import got from 'got';

interface ApifyRunResult {
  runId: string;
  status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMING-OUT' | 'TIMED-OUT' | 'ABORTING' | 'ABORTED';
  defaultDatasetId?: string;
}

interface YouTubeScraperInput {
  startUrls?: string[];
  youtubeHandles?: string[];
  keywords?: string[];
  uploadDate?: string;
  duration?: string;
  features?: string;
  sort?: string;
  maxItems?: number;
  customMapFunction?: string;
}

interface InstagramScraperInput {
  username: string[];
  resultsLimit?: number;
}

interface TikTokScraperInput {
  postURLs: string[];
  resultsPerPage?: number;
  shouldDownloadVideos?: boolean;
  shouldDownloadCovers?: boolean;
  shouldDownloadSubtitles?: boolean;
}

export interface ScrapedContent {
  platform: 'youtube' | 'instagram' | 'tiktok';
  url: string;
  title?: string;
  description?: string;
  caption?: string;
  transcript?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  duration?: number;
  uploadDate?: string;
  authorName?: string;
  authorId?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  hashtags?: string[];
  mentions?: string[];
  comments?: Array<{
    text: string;
    author: string;
    likes: number;
    timestamp: string;
  }>;
  rawData?: any;
}

class ApifyService {
  private client: ApifyClient;
  
  // Actor IDs for different platforms
  private readonly ACTORS = {
    youtube: 'apidojo/youtube-scraper',
    instagram: 'apify/instagram-post-scraper', 
    tiktok: 'clockworks/tiktok-video-scraper'
  };

  constructor(apiToken?: string) {
    const token = apiToken || process.env.APIFY_API_TOKEN;
    if (!token) {
      throw new Error('APIFY_API_TOKEN is required');
    }
    this.client = new ApifyClient({ token });
  }

  /**
   * Scrape YouTube video or channel content
   */
  async scrapeYouTube(url: string): Promise<{ runId: string }> {
    // The apidojo/youtube-scraper uses startUrls as an array of strings
    const input: YouTubeScraperInput = {
      startUrls: [url],
      maxItems: 1,  // Limit to 1 item since we're scraping a single video
      uploadDate: 'all',
      duration: 'all',
      features: 'all',
      sort: 'r'  // relevance
    };

    console.log('[ApifyService] Starting YouTube scrape with apidojo/youtube-scraper:', url);
    
    const run = await this.client.actor(this.ACTORS.youtube).call(input);
    return { runId: run.id };
  }

  /**
   * Scrape Instagram post or profile content
   */
  async scrapeInstagram(url: string): Promise<{ runId: string }> {
    // Instagram actor accepts URLs in the username array
    const input: InstagramScraperInput = {
      username: [url],
      resultsLimit: 30
    };

    const run = await this.client.actor(this.ACTORS.instagram).call(input);
    return { runId: run.id };
  }

  /**
   * Expand TikTok short URL to canonical format
   */
  private async expandTikTokUrl(url: string): Promise<string> {
    // Check if it's already a canonical URL
    if (url.includes('tiktok.com/@') && url.includes('/video/')) {
      return url;
    }

    // Check if it's a short URL that needs expansion
    if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com')) {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                       '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      
      try {
        // Try HEAD request first to get Location header without fetching the page
        const headResponse = await got.head(url, {
          followRedirect: false,
          headers: { 'User-Agent': userAgent },
          timeout: { request: 10000 }
        });
        
        if (headResponse.headers.location) {
          console.log('[ApifyService] Expanded TikTok URL via HEAD:', headResponse.headers.location);
          return headResponse.headers.location;
        }
      } catch (error) {
        // HEAD request failed or no location header, fall through to GET
        console.log('[ApifyService] HEAD request failed, trying GET:', error);
      }
      
      try {
        // Fallback: allow redirects and return the final URL
        const getResponse = await got(url, {
          followRedirect: true,
          headers: { 'User-Agent': userAgent },
          timeout: { request: 15000 }
        });
        
        console.log('[ApifyService] Expanded TikTok URL via GET:', getResponse.url);
        return getResponse.url;
      } catch (error) {
        console.error('[ApifyService] Failed to expand TikTok URL:', error);
        throw new Error('Failed to expand TikTok short URL. Please use the full TikTok video URL.');
      }
    }

    // Return original URL if it doesn't match short URL patterns
    return url;
  }

  /**
   * Scrape TikTok video content
   */
  async scrapeTikTok(url: string): Promise<{ runId: string }> {
    // Expand short URLs to canonical format
    const expandedUrl = await this.expandTikTokUrl(url);
    console.log('[ApifyService] Using TikTok URL:', expandedUrl);
    
    const input: TikTokScraperInput = {
      postURLs: [expandedUrl],
      resultsPerPage: 100,
      shouldDownloadCovers: true,  // Enable thumbnail download
      shouldDownloadSubtitles: true, // Enable subtitles for transcripts
      shouldDownloadVideos: false   // Skip video download to save time/cost
    };

    const run = await this.client.actor(this.ACTORS.tiktok).call(input);
    return { runId: run.id };
  }

  /**
   * Get the status of an Apify run
   */
  async getRunStatus(runId: string): Promise<ApifyRunResult> {
    const run = await this.client.run(runId).get();
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }
    return {
      runId: run.id,
      status: run.status,
      defaultDatasetId: run.defaultDatasetId
    };
  }

  /**
   * Get the results from a completed run
   */
  async getRunResults(runId: string): Promise<ScrapedContent | null> {
    const run = await this.client.run(runId).get();
    
    if (!run || run.status !== 'SUCCEEDED') {
      return null;
    }

    const { items } = await this.client.run(runId).dataset().listItems();
    
    if (!items || items.length === 0) {
      return null;
    }

    const rawData = items[0];
    return this.normalizeScrapedData(rawData);
  }

  /**
   * Normalize scraped data from different platforms into a common format
   */
  private normalizeScrapedData(data: any): ScrapedContent {
    // Detect platform from data structure
    let platform: 'youtube' | 'instagram' | 'tiktok';
    let normalized: ScrapedContent;

    // Check Instagram first (has specific fields like shortCode)
    if (data.shortCode || data.type === 'Post' || data.inputUrl?.includes('instagram.com')) {
      platform = 'instagram';
      
      // Instagram scraper may return different field names
      // Check multiple possible fields for thumbnail
      const thumbnailUrl = data.displayUrl || 
                          data.display_url || 
                          data.imageUrl || 
                          data.image_url || 
                          data.thumbnailUrl || 
                          data.thumbnail_url ||
                          data.images?.[0] ||
                          data.displayResources?.[0]?.src;
      
      console.log('[ApifyService] Instagram thumbnail extraction:', {
        displayUrl: data.displayUrl,
        display_url: data.display_url,
        imageUrl: data.imageUrl,
        thumbnailUrl: data.thumbnailUrl,
        extracted: thumbnailUrl
      });
      
      normalized = {
        platform,
        url: data.url || `https://instagram.com/p/${data.shortCode}`,
        title: data.caption?.substring(0, 100) || data.text?.substring(0, 100),
        caption: data.caption || data.text,
        viewCount: parseInt(data.videoViewCount || data.video_view_count || data.views || 0),
        likeCount: parseInt(data.likesCount || data.likes_count || data.likes || 0),
        commentCount: parseInt(data.commentsCount || data.comments_count || data.comments?.length || 0),
        uploadDate: data.timestamp || data.takenAt || data.taken_at,
        authorName: data.ownerUsername || data.owner_username || data.owner?.username,
        authorId: data.ownerId || data.owner_id || data.owner?.id,
        thumbnailUrl,
        videoUrl: data.videoUrl || data.video_url,
        hashtags: this.extractHashtags(data.caption || data.text || ''),
        mentions: this.extractMentions(data.caption || data.text || ''),
        comments: data.comments?.slice(0, 50)?.map((c: any) => ({
          text: c.text,
          author: c.ownerUsername,
          likes: c.likesCount || 0,
          timestamp: c.timestamp
        })),
        rawData: data
      };
    }
    // YouTube data normalization - check after Instagram but before TikTok
    else if (data.videoId || data.channelId || data.video_id || data.url?.includes('youtube.com') || data.url?.includes('youtu.be')) {
      platform = 'youtube';
      
      // Log raw data structure for debugging
      console.log('[ApifyService] YouTube raw data structure:', {
        hasVideoId: !!data.videoId,
        hasId: !!data.id,
        hasTitle: !!data.title,
        hasThumbnails: !!data.thumbnails,
        hasThumbnail: !!data.thumbnail,
        topLevelKeys: Object.keys(data).slice(0, 20)
      });
      
      // YouTube thumbnails can be in various fields
      // The apidojo scraper returns thumbnails as an array of objects
      let thumbnailUrl = data.thumbnailUrl || 
                        data.thumbnail_url || 
                        data.thumbnail;
      
      // Handle thumbnails array from apidojo/youtube-scraper
      if (!thumbnailUrl && data.thumbnails) {
        if (Array.isArray(data.thumbnails) && data.thumbnails.length > 0) {
          // Get the highest quality thumbnail (usually the last one in the array)
          thumbnailUrl = data.thumbnails[data.thumbnails.length - 1]?.url || 
                        data.thumbnails[0]?.url;
        } else if (typeof data.thumbnails === 'object') {
          // Handle YouTube API style thumbnail object
          thumbnailUrl = data.thumbnails.maxres?.url ||
                        data.thumbnails.high?.url ||
                        data.thumbnails.standard?.url ||
                        data.thumbnails.medium?.url ||
                        data.thumbnails.default?.url;
        }
      }
      
      console.log('[ApifyService] YouTube thumbnail extraction:', {
        thumbnailsType: Array.isArray(data.thumbnails) ? 'array' : typeof data.thumbnails,
        thumbnailsLength: Array.isArray(data.thumbnails) ? data.thumbnails.length : null,
        extracted: thumbnailUrl
      });
      
      // Handle different comment formats - might be an array or a count
      let commentsArray: any[] = [];
      if (Array.isArray(data.comments)) {
        commentsArray = data.comments;
      } else if (Array.isArray(data.commentsList)) {
        commentsArray = data.commentsList;
      }
      
      normalized = {
        platform,
        url: data.url || `https://youtube.com/watch?v=${data.videoId || data.video_id || data.id}`,
        title: data.title,
        description: data.description,
        transcript: data.subtitles?.[0]?.text || data.captions?.[0]?.text || data.transcript,
        viewCount: parseInt(data.viewCount || data.view_count || data.views || data.statistics?.viewCount || 0),
        likeCount: parseInt(data.likeCount || data.like_count || data.likes || data.statistics?.likeCount || 0),
        commentCount: parseInt(data.commentCount || data.comment_count || data.comments || data.statistics?.commentCount || 0),
        duration: data.duration || data.contentDetails?.duration,
        uploadDate: data.uploadDate || data.upload_date || data.publishedAt || data.published_at || data.snippet?.publishedAt,
        authorName: data.channelName || data.channel_name || data.channelTitle || data.channel_title || data.channel?.title || data.channel?.name || data.snippet?.channelTitle,
        authorId: data.channelId || data.channel_id || data.channel?.id || data.snippet?.channelId,
        thumbnailUrl,
        hashtags: this.extractHashtags(data.description || ''),
        mentions: this.extractMentions(data.description || ''),
        comments: commentsArray.slice(0, 50).map((c: any) => ({
          text: c.text || c.textDisplay || c.snippet?.textDisplay,
          author: c.authorName || c.author || c.snippet?.authorDisplayName,
          likes: c.likeCount || c.likes || c.snippet?.likeCount || 0,
          timestamp: c.publishedAt || c.snippet?.publishedAt
        })),
        rawData: data
      };
    }
    // TikTok data normalization - fallback for everything else
    else {
      platform = 'tiktok';
      
      // Log the raw data structure for debugging
      console.log('[ApifyService] TikTok raw data structure:', {
        hasCoversObject: !!data.covers,
        hasCoverUrl: !!data.coverUrl,
        hasVideoMeta: !!data.videoMeta,
        hasVideo: !!data.video,
        topLevelKeys: Object.keys(data).slice(0, 20) // First 20 keys
      });
      
      // TikTok thumbnails can be in various fields
      // Check for downloaded cover first, then fallback to other fields
      const thumbnailUrl = data.coverUrl ||  // Downloaded cover URL if shouldDownloadCovers is true
                          data.cover_url ||
                          data.videoMeta?.coverUrl || // This is the actual field name!
                          data.videoMeta?.originalCoverUrl || // Fallback to original cover
                          data.video_meta?.coverUrl ||
                          data.video_meta?.cover ||
                          data.covers?.default ||
                          data.covers?.origin ||
                          data.covers?.['0'] || // Sometimes covers is an object with numeric keys
                          data.cover ||
                          data.thumbnailUrl ||
                          data.thumbnail_url ||
                          data.video?.cover ||
                          data.video?.dynamicCover ||
                          data.video?.originCover;
      
      console.log('[ApifyService] TikTok thumbnail extraction:', {
        coverUrl: data.coverUrl,
        videoMeta_coverUrl: data.videoMeta?.coverUrl,
        videoMeta_originalCoverUrl: data.videoMeta?.originalCoverUrl,
        covers: data.covers,
        video: data.video ? Object.keys(data.video) : null,
        extracted: thumbnailUrl
      });
      
      normalized = {
        platform,
        url: data.webVideoUrl || data.web_video_url || data.url,
        title: data.text?.substring(0, 100) || data.description?.substring(0, 100),
        caption: data.text || data.description,
        transcript: data.subtitles || data.subtitleUrl || data.subtitle_url, // Include subtitles as transcript
        viewCount: parseInt(data.playCount || data.play_count || data.views || 0),
        likeCount: parseInt(data.diggCount || data.digg_count || data.likes || 0),
        commentCount: parseInt(data.commentCount || data.comment_count || data.comments?.length || 0),
        shareCount: parseInt(data.shareCount || data.share_count || data.shares || 0),
        duration: data.videoMeta?.duration || data.video_meta?.duration || data.duration,
        uploadDate: data.createTime || data.create_time || data.createTimeISO,
        authorName: data.authorMeta?.name || data.author_meta?.name || data.author?.uniqueId || data.author?.unique_id,
        authorId: data.authorMeta?.id || data.author_meta?.id || data.author?.id,
        thumbnailUrl,
        videoUrl: data.videoUrl || data.video_url || data.videoUrlNoWatermark || data.video_url_no_watermark,
        hashtags: data.hashtags || this.extractHashtags(data.text || ''),
        mentions: data.mentions || this.extractMentions(data.text || ''),
        comments: data.comments?.slice(0, 50)?.map((c: any) => ({
          text: c.text,
          author: c.user?.uniqueId,
          likes: c.diggCount || 0,
          timestamp: c.createTime
        })),
        rawData: data
      };
    }

    return normalized;
  }

  /**
   * Extract hashtags from text
   */
  private extractHashtags(text: string): string[] {
    const regex = /#[a-zA-Z0-9_]+/g;
    const matches = text.match(regex) || [];
    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Extract mentions from text
   */
  private extractMentions(text: string): string[] {
    const regex = /@[a-zA-Z0-9_.]+/g;
    const matches = text.match(regex) || [];
    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Validate URL for supported platforms
   */
  static validateUrl(url: string): { isValid: boolean; platform?: 'youtube' | 'instagram' | 'tiktok'; error?: string } {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // YouTube validation - support regular videos, shorts, and youtu.be links
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        // Check for various YouTube URL formats
        const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
        const channelMatch = url.match(/youtube\.com\/(@[a-zA-Z0-9_-]+|channel\/[a-zA-Z0-9_-]+|c\/[a-zA-Z0-9_-]+)/);
        
        if (!videoIdMatch && !shortsMatch && !channelMatch) {
          return { isValid: false, error: 'Invalid YouTube URL. Please provide a video, shorts, or channel URL.' };
        }
        return { isValid: true, platform: 'youtube' };
      }

      // Instagram validation
      if (hostname.includes('instagram.com')) {
        const postMatch = url.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/);
        if (!postMatch) {
          return { isValid: false, error: 'Invalid Instagram post URL' };
        }
        return { isValid: true, platform: 'instagram' };
      }

      // TikTok validation - accept both canonical and short URLs
      if (hostname.includes('tiktok.com')) {
        const videoMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
        const shortLinkMatch = url.match(/(?:vm|vt)\.tiktok\.com\/[a-zA-Z0-9-_]+/);
        if (!videoMatch && !shortLinkMatch) {
          return { isValid: false, error: 'Invalid TikTok video URL' };
        }
        return { isValid: true, platform: 'tiktok' };
      }

      return { isValid: false, error: 'URL must be from YouTube, Instagram, or TikTok' };
    } catch (error) {
      return { isValid: false, error: 'Invalid URL format' };
    }
  }
}

export default ApifyService;