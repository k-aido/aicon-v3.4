import { NextRequest, NextResponse } from 'next/server';
import { ContentApiRequest, ContentApiResponse } from '@/types';
import { detectPlatform } from '@/utils/platform';

/**
 * Handles content fetching from URLs
 * Currently implements YouTube oEmbed API with fallback for other platforms
 */
export async function POST(req: NextRequest): Promise<NextResponse<ContentApiResponse>> {
  try {
    const body: ContentApiRequest = await req.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ 
        title: '',
        thumbnail: '',
        platform: 'unknown',
        error: 'URL is required' 
      }, { status: 400 });
    }

    const platform = detectPlatform(url);

    // Real implementation for YouTube
    if (platform === 'youtube') {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const response = await fetch(oembedUrl);
        
        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({
            title: data.title || 'YouTube Video',
            thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${extractYouTubeId(url)}/maxresdefault.jpg`,
            platform: 'youtube'
          });
        }
      } catch (error) {
        console.error('YouTube oEmbed error:', error);
      }
    }

    // Mock data for other platforms
    const mockData: Record<string, Omit<ContentApiResponse, 'error'>> = {
      instagram: {
        title: 'Instagram Post',
        thumbnail: 'https://via.placeholder.com/300x300/E1306C/white?text=IG',
        platform: 'instagram'
      },
      tiktok: {
        title: 'TikTok Video',
        thumbnail: 'https://via.placeholder.com/300x300/000000/white?text=TT',
        platform: 'tiktok'
      },
      unknown: {
        title: 'Content',
        thumbnail: 'https://via.placeholder.com/300x300/gray/white?text=?',
        platform: 'unknown'
      }
    };

    return NextResponse.json(mockData[platform] || mockData.unknown);
  } catch (error) {
    console.error('Content API error:', error);
    return NextResponse.json({ 
      title: '',
      thumbnail: '',
      platform: 'unknown',
      error: error instanceof Error ? error.message : 'Failed to fetch content' 
    }, { status: 500 });
  }
}

/**
 * Extracts YouTube video ID from URL
 */
function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : '';
}