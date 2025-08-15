import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Fetch the image
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error(`[Image Proxy] Failed to fetch image: ${response.status} ${response.statusText}`);
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    // Get the content type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Only allow image content types
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'URL does not point to an image' }, { status: 400 });
    }

    // Get the image data
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Return the image with proper headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('[Image Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    );
  }
}