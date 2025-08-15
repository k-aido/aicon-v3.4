import { ApifyClient } from 'apify-client';

interface ApifyRunResult {
  runId: string;
  status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMING-OUT' | 'TIMED-OUT' | 'ABORTING' | 'ABORTED';
  defaultDatasetId?: string;
}

interface YouTubeScraperInput {
  queries: string[];
}

interface InstagramScraperInput {
  username: string[];
  resultsLimit?: number;
}

interface TikTokScraperInput {
  postURLs: string[];
  resultsPerPage?: number;
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
    youtube: 'stefanie-rink/youtube-scraper',
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
    const input: YouTubeScraperInput = {
      queries: [url]
    };

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
   * Scrape TikTok video content
   */
  async scrapeTikTok(url: string): Promise<{ runId: string }> {
    const input: TikTokScraperInput = {
      postURLs: [url],
      resultsPerPage: 100
    };

    const run = await this.client.actor(this.ACTORS.tiktok).call(input);
    return { runId: run.id };
  }

  /**
   * Get the status of an Apify run
   */
  async getRunStatus(runId: string): Promise<ApifyRunResult> {
    const run = await this.client.run(runId).get();
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
    
    if (run.status !== 'SUCCEEDED') {
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

    // YouTube data normalization
    if (data.videoId || data.channelId || data.video_id) {
      platform = 'youtube';
      
      // YouTube thumbnails can be in various fields
      const thumbnailUrl = data.thumbnailUrl || 
                          data.thumbnail_url || 
                          data.thumbnail ||
                          data.thumbnails?.high?.url ||
                          data.thumbnails?.maxres?.url ||
                          data.thumbnails?.standard?.url ||
                          data.thumbnails?.default?.url;
      
      normalized = {
        platform,
        url: data.url || `https://youtube.com/watch?v=${data.videoId || data.video_id}`,
        title: data.title,
        description: data.description,
        transcript: data.subtitles?.[0]?.text || data.captions?.[0]?.text,
        viewCount: parseInt(data.viewCount || data.view_count || data.views || 0),
        likeCount: parseInt(data.likeCount || data.like_count || data.likes || 0),
        commentCount: parseInt(data.commentCount || data.comment_count || data.comments?.length || 0),
        duration: data.duration,
        uploadDate: data.uploadDate || data.upload_date || data.publishedAt || data.published_at,
        authorName: data.channelName || data.channel_name || data.channelTitle || data.channel_title,
        authorId: data.channelId || data.channel_id,
        thumbnailUrl,
        hashtags: this.extractHashtags(data.description || ''),
        mentions: this.extractMentions(data.description || ''),
        comments: data.comments?.slice(0, 50)?.map((c: any) => ({
          text: c.text,
          author: c.authorName,
          likes: c.likeCount || 0,
          timestamp: c.publishedAt
        })),
        rawData: data
      };
    }
    // Instagram data normalization
    else if (data.shortCode || data.type === 'Post') {
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
    // TikTok data normalization
    else {
      platform = 'tiktok';
      
      // TikTok thumbnails can be in various fields
      const thumbnailUrl = data.videoMeta?.cover || 
                          data.video_meta?.cover ||
                          data.covers?.default ||
                          data.covers?.origin ||
                          data.cover ||
                          data.thumbnailUrl ||
                          data.thumbnail_url;
      
      normalized = {
        platform,
        url: data.webVideoUrl || data.web_video_url || data.url,
        title: data.text?.substring(0, 100) || data.description?.substring(0, 100),
        caption: data.text || data.description,
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

      // YouTube validation
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (!videoIdMatch) {
          return { isValid: false, error: 'Invalid YouTube video URL' };
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

      // TikTok validation
      if (hostname.includes('tiktok.com')) {
        const videoMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
        const shortLinkMatch = url.match(/vm\.tiktok\.com\/[a-zA-Z0-9]+/);
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