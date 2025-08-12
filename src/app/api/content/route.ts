import { NextRequest, NextResponse } from 'next/server';
import { validateSocialMediaUrl, parseUrl, getPlatformDisplayName, getPlatformErrorMessage } from '@/utils/urlValidator';

interface ContentResponse {
  title: string;
  thumbnail: string;
  platform: string;
  author?: string;
  url: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ 
        error: 'URL is required and must be a valid string' 
      }, { status: 400 });
    }

    // Validate the URL format and platform
    if (!validateSocialMediaUrl(url)) {
      return NextResponse.json({ 
        error: 'Invalid social media URL. Please provide a valid URL from YouTube, Instagram, TikTok, or X/Twitter.' 
      }, { status: 400 });
    }

    // Parse URL to get platform and ID
    const urlInfo = parseUrl(url);
    
    if (!urlInfo.isValid) {
      return NextResponse.json({ 
        error: urlInfo.error || getPlatformErrorMessage(urlInfo.platform) 
      }, { status: 400 });
    }

    console.log(`[Content API] Processing ${urlInfo.platform} URL:`, { id: urlInfo.id, url });

    // For YouTube, try to get real data using oEmbed API
    if (urlInfo.platform === 'youtube' && urlInfo.id) {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const response = await fetch(oembedUrl, {
          headers: {
            'User-Agent': 'AICON Content Analyzer/1.0'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const contentResponse: ContentResponse = {
            title: data.title || 'YouTube Video',
            thumbnail: `https://img.youtube.com/vi/${urlInfo.id}/maxresdefault.jpg`,
            platform: 'youtube',
            author: data.author_name || 'Unknown Creator',
            url: url
          };
          
          console.log(`[Content API] Successfully fetched YouTube data:`, contentResponse.title);
          return NextResponse.json(contentResponse);
        }
      } catch (error) {
        console.error('[Content API] YouTube oEmbed error:', error);
        // Fall through to mock data
      }
    }

    // For other platforms or if YouTube fetch fails, return mock data
    const mockData: Record<string, Omit<ContentResponse, 'url'>> = {
      youtube: {
        title: 'YouTube Video',
        thumbnail: `https://img.youtube.com/vi/${urlInfo.id || 'default'}/maxresdefault.jpg`,
        platform: 'youtube',
        author: 'YouTube Creator'
      },
      instagram: {
        title: 'Instagram Post',
        thumbnail: 'https://via.placeholder.com/1080x1080/E4405F/ffffff?text=📸+Instagram+Post&font-size=36',
        platform: 'instagram',
        author: 'Instagram User'
      },
      tiktok: {
        title: 'TikTok Video',
        thumbnail: 'https://via.placeholder.com/1080x1920/000000/ffffff?text=🎵+TikTok+Video&font-size=36',
        platform: 'tiktok',
        author: 'TikTok Creator'
      },
      twitter: {
        title: 'X/Twitter Post',
        thumbnail: 'https://via.placeholder.com/1200x675/1DA1F2/ffffff?text=🐦+X+Post&font-size=32',
        platform: 'twitter',
        author: 'X User'
      }
    };

    const platformData = mockData[urlInfo.platform];
    if (!platformData) {
      return NextResponse.json({ 
        error: `Content analysis not supported for ${getPlatformDisplayName(urlInfo.platform)}` 
      }, { status: 400 });
    }

    const contentResponse: ContentResponse = {
      ...platformData,
      url: url
    };

    console.log(`[Content API] Returning mock data for ${urlInfo.platform}:`, contentResponse.title);
    return NextResponse.json(contentResponse);

  } catch (error: any) {
    console.error('[Content API] Unexpected error:', error);
    
    // Return user-friendly error messages
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      return NextResponse.json({
        error: 'Network error while fetching content. Please try again.'
      }, { status: 503 });
    }
    
    return NextResponse.json({
      error: 'An unexpected error occurred while analyzing the content. Please try again.'
    }, { status: 500 });
  }
}