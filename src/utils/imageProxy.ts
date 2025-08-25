/**
 * Proxy image URLs that have CORS issues (like Instagram CDN)
 */
export function getProxiedImageUrl(url: string | undefined): string {
  if (!url) {
    return 'https://via.placeholder.com/300x200?text=No+Image';
  }

  // Check if the URL needs proxying (Instagram CDN, Facebook CDN, TikTok CDN, etc.)
  const needsProxy = 
    url.includes('cdninstagram.com') ||
    url.includes('fbcdn.net') ||
    url.includes('scontent') ||
    url.includes('instagram.com') ||
    url.includes('tiktokcdn.com') ||
    url.includes('tiktokcdn-us.com') ||
    url.includes('tiktok.com');

  if (needsProxy) {
    // Use our proxy endpoint
    return `/api/proxy/image?url=${encodeURIComponent(url)}`;
  }

  // Return the original URL if it doesn't need proxying
  return url;
}

/**
 * Get a placeholder image URL for a given platform
 */
export function getPlatformPlaceholder(platform: string): string {
  const colors = {
    instagram: 'E4405F',
    tiktok: '000000',
    youtube: 'FF0000',
    website: '3B82F6'
  };
  
  const color = colors[platform.toLowerCase() as keyof typeof colors] || '666666';
  return `https://via.placeholder.com/300x200/${color}/FFFFFF?text=${platform}`;
}