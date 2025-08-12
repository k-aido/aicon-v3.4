// URL validation and parsing utilities for social media platforms

export interface ParsedUrlInfo {
  platform: 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'unknown';
  id: string | null;
  isValid: boolean;
  error?: string;
}

/**
 * Validates if a URL is from a supported social media platform
 */
export function validateSocialMediaUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    new URL(url); // This will throw if URL is malformed
    return isYouTubeUrl(url) || isInstagramUrl(url) || isTikTokUrl(url) || isTwitterUrl(url);
  } catch {
    return false;
  }
}

/**
 * Parses a social media URL and extracts platform info and content ID
 */
export function parseUrl(url: string): ParsedUrlInfo {
  if (!url || typeof url !== 'string') {
    return { platform: 'unknown', id: null, isValid: false, error: 'Invalid URL' };
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // YouTube
    if (isYouTubeUrl(url)) {
      const videoId = extractYouTubeId(url);
      return {
        platform: 'youtube',
        id: videoId,
        isValid: !!videoId,
        error: videoId ? undefined : 'Invalid YouTube video URL'
      };
    }

    // Instagram
    if (isInstagramUrl(url)) {
      const postId = extractInstagramId(url);
      return {
        platform: 'instagram',
        id: postId,
        isValid: !!postId,
        error: postId ? undefined : 'Invalid Instagram URL'
      };
    }

    // TikTok
    if (isTikTokUrl(url)) {
      const videoId = extractTikTokId(url);
      return {
        platform: 'tiktok',
        id: videoId,
        isValid: !!videoId,
        error: videoId ? undefined : 'Invalid TikTok URL'
      };
    }

    // Twitter/X
    if (isTwitterUrl(url)) {
      const tweetId = extractTwitterId(url);
      return {
        platform: 'twitter',
        id: tweetId,
        isValid: !!tweetId,
        error: tweetId ? undefined : 'Invalid Twitter/X URL'
      };
    }

    return {
      platform: 'unknown',
      id: null,
      isValid: false,
      error: 'Unsupported platform'
    };

  } catch (error) {
    return {
      platform: 'unknown',
      id: null,
      isValid: false,
      error: 'Malformed URL'
    };
  }
}

/**
 * Check if URL is from YouTube
 */
export function isYouTubeUrl(url: string): boolean {
  const hostname = new URL(url).hostname.toLowerCase();
  return hostname.includes('youtube.com') || hostname.includes('youtu.be');
}

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

/**
 * Check if URL is from Instagram
 */
export function isInstagramUrl(url: string): boolean {
  const hostname = new URL(url).hostname.toLowerCase();
  return hostname.includes('instagram.com');
}

/**
 * Extract Instagram post ID from URL
 */
export function extractInstagramId(url: string): string | null {
  // Instagram post URLs: https://www.instagram.com/p/POST_ID/
  // Instagram reel URLs: https://www.instagram.com/reel/REEL_ID/
  const postMatch = url.match(/\/p\/([A-Za-z0-9_-]+)/);
  const reelMatch = url.match(/\/reel\/([A-Za-z0-9_-]+)/);
  return postMatch?.[1] || reelMatch?.[1] || null;
}

/**
 * Check if URL is from TikTok
 */
export function isTikTokUrl(url: string): boolean {
  const hostname = new URL(url).hostname.toLowerCase();
  return hostname.includes('tiktok.com');
}

/**
 * Extract TikTok video ID from URL
 */
export function extractTikTokId(url: string): string | null {
  // TikTok URLs: https://www.tiktok.com/@username/video/VIDEO_ID
  // Short URLs: https://vm.tiktok.com/SHORT_ID
  const videoMatch = url.match(/\/video\/(\d+)/);
  const shortMatch = url.match(/vm\.tiktok\.com\/([A-Za-z0-9]+)/);
  return videoMatch?.[1] || shortMatch?.[1] || null;
}

/**
 * Check if URL is from Twitter/X
 */
export function isTwitterUrl(url: string): boolean {
  const hostname = new URL(url).hostname.toLowerCase();
  return hostname.includes('twitter.com') || hostname.includes('x.com');
}

/**
 * Extract Twitter/X tweet ID from URL
 */
export function extractTwitterId(url: string): string | null {
  // Twitter URLs: https://twitter.com/username/status/TWEET_ID
  // X URLs: https://x.com/username/status/TWEET_ID
  const match = url.match(/\/status\/(\d+)/);
  return match?.[1] || null;
}

/**
 * Get user-friendly platform name
 */
export function getPlatformDisplayName(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'youtube': return 'YouTube';
    case 'instagram': return 'Instagram';
    case 'tiktok': return 'TikTok';
    case 'twitter': return 'X (Twitter)';
    default: return 'Unknown Platform';
  }
}

/**
 * Get platform-specific error messages
 */
export function getPlatformErrorMessage(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'youtube':
      return 'Please provide a valid YouTube video URL (e.g., https://youtube.com/watch?v=...)';
    case 'instagram':
      return 'Please provide a valid Instagram post URL (e.g., https://instagram.com/p/...)';
    case 'tiktok':
      return 'Please provide a valid TikTok video URL (e.g., https://tiktok.com/@user/video/...)';
    case 'twitter':
      return 'Please provide a valid X/Twitter post URL (e.g., https://x.com/user/status/...)';
    default:
      return 'Please provide a valid social media URL from YouTube, Instagram, TikTok, or X/Twitter';
  }
}