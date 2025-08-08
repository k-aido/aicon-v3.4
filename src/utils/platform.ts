import { Platform } from '@/types';

/**
 * Detects the platform from a given URL
 * @param url - The URL to analyze
 * @returns The detected platform
 */
export const detectPlatform = (url: string): Platform => {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  return 'unknown';
};