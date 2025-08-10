import { NextRequest, NextResponse } from 'next/server';

// Utility to detect platform from URL
const detectPlatform = (url: string) => {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('loom.com')) return 'loom';
  if (url.includes('drive.google.com')) return 'drive';
  return 'unknown';
};

// Extract YouTube video ID
const getYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const platform = detectPlatform(url);

    // For YouTube, we can get real data
    if (platform === 'youtube') {
      const videoId = getYouTubeId(url);
      if (videoId) {
        try {
          // Using YouTube oEmbed API (no API key required)
          const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
          const response = await fetch(oembedUrl);
          
          if (response.ok) {
            const data = await response.json();
            return NextResponse.json({
              title: data.title,
              thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
              platform: 'youtube',
              author: data.author_name,
              url: url
            });
          }
        } catch (error) {
          console.error('YouTube fetch error:', error);
        }
      }
    }

    // For other platforms, return mock data for now
    // In a real implementation, you would use their respective APIs
    const mockData: Record<string, any> = {
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
      },
      loom: {
        title: 'Loom Recording',
        thumbnail: 'https://via.placeholder.com/1280x720/625DF5/ffffff?text=🎥+Loom+Recording&font-size=32',
        platform: 'loom',
        author: 'Loom User'
      },
      drive: {
        title: 'Google Drive File',
        thumbnail: 'https://via.placeholder.com/300x300/4285F4/ffffff?text=📁+Drive+File&font-size=24',
        platform: 'drive',
        author: 'Drive Owner'
      },
      unknown: {
        title: 'External Content',
        thumbnail: 'https://via.placeholder.com/300x300/64748b/ffffff?text=📄+Content&font-size=24',
        platform: 'unknown',
        author: 'Unknown'
      }
    };

    const contentInfo = mockData[platform] || mockData.unknown;
    return NextResponse.json({ ...contentInfo, url });

  } catch (error: any) {
    console.error('Content API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch content' },
      { status: 500 }
    );
  }
}