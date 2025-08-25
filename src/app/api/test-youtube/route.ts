import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({
      error: 'YOUTUBE_API_KEY not found in environment variables'
    }, { status: 500 });
  }
  
  try {
    // Test with a known video ID (Rick Astley - Never Gonna Give You Up)
    const videoId = 'dQw4w9WgXcQ';
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
    
    console.log('[Test YouTube] Testing API with URL:', url.replace(apiKey, 'REDACTED'));
    
    const response = await fetch(url);
    const data = await response.text();
    
    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch {
      parsedData = data;
    }
    
    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKey.substring(0, 10) + '...',
      response: parsedData,
      headers: Object.fromEntries(response.headers.entries())
    });
    
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to test YouTube API',
      message: error.message
    }, { status: 500 });
  }
}