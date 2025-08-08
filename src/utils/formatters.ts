/**
 * Format large numbers with K/M suffixes
 */
export const formatNumber = (num: number | undefined | null): string => {
  if (!num) return '0';
  
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`;
  }
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
};

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
export const formatDuration = (seconds: number | undefined): string => {
  if (!seconds) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: Date | string | undefined): string => {
  if (!date) return '';
  
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months ago`;
  return `${Math.floor(seconds / 31536000)} years ago`;
};

/**
 * Calculate engagement rate percentage
 */
export const calculateEngagementRate = (likes: number, comments: number, shares: number, views: number): string => {
  if (!views || views === 0) return '0%';
  
  const totalEngagements = (likes || 0) + (comments || 0) + (shares || 0);
  const rate = (totalEngagements / views) * 100;
  
  return `${rate.toFixed(2)}%`;
};