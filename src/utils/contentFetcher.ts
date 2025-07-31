import { ContentInfo, Platform } from '@/types';
import { detectPlatform } from './platform';

// Mock data for different platforms
const mockData: Record<Platform, ContentInfo> = {
  youtube: {
    title: "AI Agents, Clearly Explained",
    thumbnail: "https://img.youtube.com/vi/F8NKVhkZZWI/maxresdefault.jpg",
    platform: "youtube"
  },
  instagram: {
    title: "Instagram Post",
    thumbnail: "https://via.placeholder.com/300x300/E1306C/white?text=IG",
    platform: "instagram"
  },
  tiktok: {
    title: "TikTok Video",
    thumbnail: "https://via.placeholder.com/300x300/000000/white?text=TT",
    platform: "tiktok"
  },
  unknown: {
    title: "Unknown Content",
    thumbnail: "https://via.placeholder.com/300x300/gray/white?text=?",
    platform: "unknown"
  }
};

/**
 * Fetches content information from a URL (mock implementation)
 * @param url - The URL to fetch content from
 * @returns Promise with content information
 */
export const fetchContentInfo = async (url: string): Promise<ContentInfo> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const platform = detectPlatform(url);
  return mockData[platform] || mockData.unknown;
};