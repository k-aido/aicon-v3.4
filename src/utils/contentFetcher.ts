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
    thumbnail: "https://via.placeholder.com/1080x1080/E4405F/ffffff?text=📸+Instagram+Post&font-size=36",
    platform: "instagram"
  },
  tiktok: {
    title: "TikTok Video",
    thumbnail: "https://via.placeholder.com/1080x1920/000000/ffffff?text=🎵+TikTok+Video&font-size=36",
    platform: "tiktok"
  },
  unknown: {
    title: "Unknown Content",
    thumbnail: "https://via.placeholder.com/300x300/64748b/ffffff?text=📄+Content&font-size=24",
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