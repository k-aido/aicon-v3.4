// Service to extract video metadata from URLs
// In a real implementation, this would call APIs or use server-side extraction

interface VideoMetadata {
  title: string;
  thumbnail: string;
  channelName: string;
  viewCount?: number;
  duration?: string;
  description?: string;
}

export class VideoMetadataService {
  // Extract YouTube video ID from URL
  private static getYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  // Get Instagram post ID from URL
  private static getInstagramPostId(url: string): string | null {
    const pattern = /instagram\.com\/p\/([^\/\?]+)/;
    const match = url.match(pattern);
    return match ? match[1] : null;
  }

  // Get TikTok video ID from URL
  private static getTikTokVideoId(url: string): string | null {
    const pattern = /tiktok\.com\/@[^\/]+\/video\/(\d+)/;
    const match = url.match(pattern);
    return match ? match[1] : null;
  }

  // Fetch metadata based on platform
  public static async fetchMetadata(url: string, platform: string): Promise<VideoMetadata> {
    // In a real app, these would be API calls
    // For now, we'll return mock data with proper thumbnails
    
    switch (platform) {
      case 'youtube': {
        const videoId = this.getYouTubeVideoId(url);
        if (videoId) {
          return {
            title: 'How to Build Amazing Web Apps with React',
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            channelName: 'Tech Tutorial Channel',
            viewCount: 125000,
            duration: '12:34',
            description: 'Learn how to build modern web applications...'
          };
        }
        break;
      }
      
      case 'instagram': {
        const postId = this.getInstagramPostId(url);
        if (postId) {
          return {
            title: 'Amazing sunset at the beach 🌅',
            thumbnail: 'https://picsum.photos/640/640?random=' + postId,
            channelName: '@travel_photographer',
            viewCount: 45000,
            description: 'Beautiful sunset captured at Malibu Beach...'
          };
        }
        break;
      }
      
      case 'tiktok': {
        const videoId = this.getTikTokVideoId(url);
        if (videoId) {
          return {
            title: 'Day in my life as a software developer',
            thumbnail: 'https://picsum.photos/576/1024?random=' + videoId,
            channelName: '@techie_life',
            viewCount: 2500000,
            duration: '0:58',
            description: 'Follow my daily routine as a developer...'
          };
        }
        break;
      }
      
      case 'profiles': {
        return {
          title: 'Professional Profile',
          thumbnail: 'https://picsum.photos/400/400?random=' + Date.now(),
          channelName: url.split('/').pop() || 'Profile',
          description: 'Professional profile information'
        };
      }
    }
    
    // Default fallback
    return {
      title: `${platform} Content`,
      thumbnail: 'https://picsum.photos/640/360?random=' + Date.now(),
      channelName: platform,
      viewCount: 0
    };
  }

  // Simulate API delay
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Fetch with simulated loading
  public static async fetchWithLoading(url: string, platform: string): Promise<VideoMetadata> {
    await this.delay(800 + Math.random() * 700); // 0.8-1.5s delay
    return this.fetchMetadata(url, platform);
  }
}