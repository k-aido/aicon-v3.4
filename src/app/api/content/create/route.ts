import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

interface CreateContentRequest {
  url: string;
  platform?: string;
  title?: string;
  thumbnail?: string;
  canvasElementId?: number;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Content Create API] Starting request processing');
    
    // Check if we're in demo mode
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const enableAuth = process.env.NEXT_PUBLIC_ENABLE_AUTH !== 'false';
    
    // Use service role client for demo mode to bypass RLS
    const supabase = isDemoMode 
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )
      : createRouteHandlerClient({ cookies });
    
    let user = null;
    
    if (enableAuth && !isDemoMode) {
      // Get the authenticated user in production mode
      const { data: userData, error: authError } = await supabase.auth.getUser();
      
      console.log('[Content Create API] Auth check:', { 
        hasUser: !!userData.user, 
        userId: userData.user?.id, 
        authError: authError?.message 
      });
      
      if (authError || !userData.user) {
        console.log('[Content Create API] Authentication failed');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      user = userData.user;
    } else {
      // Demo mode - create a mock user
      console.log('[Content Create API] Demo mode - using mock user');
      user = {
        id: process.env.NEXT_PUBLIC_DEMO_USER_ID || '550e8400-e29b-41d4-a716-446655440002',
        email: 'demo@example.com'
      };
    }
    
    const body: CreateContentRequest = await request.json();
    const { url, platform, title, thumbnail, canvasElementId } = body;
    
    console.log('[Content Create API] Request body:', { url, platform, title, canvasElementId });
    
    // Validate required fields
    if (!url) {
      console.log('[Content Create API] Missing URL field');
      return NextResponse.json({ 
        error: 'Missing required field: url' 
      }, { status: 400 });
    }
    
    console.log(`[Content Create API] Creating content record for URL: ${url}`);
    
    // Detect platform from URL if not provided
    let detectedPlatform = platform;
    if (!detectedPlatform) {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        detectedPlatform = 'youtube';
      } else if (url.includes('instagram.com')) {
        detectedPlatform = 'instagram';
      } else if (url.includes('tiktok.com')) {
        detectedPlatform = 'tiktok';
      } else {
        detectedPlatform = 'youtube'; // default fallback
      }
    }
    
    // Check if content already exists for this URL
    console.log('[Content Create API] Checking for existing content');
    const { data: existingContent, error: checkError } = await supabase
      .from('creator_content')
      .select('id')
      .eq('content_url', url)
      .single();
    
    console.log('[Content Create API] Existing content check:', { 
      existingContent, 
      checkError: checkError?.message,
      checkErrorCode: checkError?.code 
    });
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[Content Create API] Error checking existing content:', checkError);
      return NextResponse.json({ 
        error: 'Database error' 
      }, { status: 500 });
    }
    
    // If content already exists, return the existing ID
    if (existingContent) {
      console.log(`[Content Create API] Content already exists with ID: ${existingContent.id}`);
      return NextResponse.json({
        success: true,
        contentId: existingContent.id,
        canvasElementId,
        existing: true
      });
    }
    
    // Create new content record
    const contentData = {
      content_url: url,
      platform: detectedPlatform,
      thumbnail_url: thumbnail || null,
      caption: title || null,
      analysis_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Store canvas element ID in raw_data for reference
      raw_data: canvasElementId ? { canvasElementId } : {}
    };
    
    // We need a creator_id, let's create a default one or find existing
    // First check if a creator exists with a username matching the user email
    console.log('[Content Create API] Looking up creator');
    let creatorId = null;
    const username = user?.email?.split('@')[0] || 'demo-user';
    
    console.log('[Content Create API] Creator lookup params:', { username, platform: detectedPlatform });
    
    const { data: creatorData, error: creatorError } = await supabase
      .from('creators')
      .select('id')
      .eq('username', username)
      .eq('platform', detectedPlatform)
      .single();
    
    console.log('[Content Create API] Creator lookup result:', { 
      creatorData, 
      creatorError: creatorError?.message,
      creatorErrorCode: creatorError?.code 
    });
    
    if (creatorError && creatorError.code === 'PGRST116') {
      // No creator found, create one
      const { data: newCreator, error: createCreatorError } = await supabase
        .from('creators')
        .insert({
          platform: detectedPlatform,
          username: username,
          display_name: username,
          profile_url: `https://${detectedPlatform === 'instagram' ? 'instagram.com' : detectedPlatform === 'tiktok' ? 'tiktok.com/@' : 'youtube.com/@'}${username}`,
          is_verified: false,
          is_active: true,
          scrape_frequency_hours: 24,
          metadata: { user_id: user?.id }, // Store user ID in metadata for reference
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (createCreatorError) {
        console.error('[Content Create] Error creating creator:', createCreatorError);
        console.error('[Content Create] Creator error details:', {
          message: createCreatorError.message,
          code: createCreatorError.code,
          details: createCreatorError.details,
          hint: createCreatorError.hint
        });
        return NextResponse.json({ 
          error: `Failed to create creator record: ${createCreatorError.message}` 
        }, { status: 500 });
      }
      
      creatorId = newCreator.id;
    } else if (creatorError) {
      console.error('[Content Create] Error finding creator:', creatorError);
      return NextResponse.json({ 
        error: 'Database error' 
      }, { status: 500 });
    } else {
      creatorId = creatorData.id;
    }
    
    // Insert content record
    console.log('[Content Create API] Inserting content record');
    console.log('[Content Create API] Content data to insert:', { ...contentData, creator_id: creatorId });
    
    const { data: newContent, error: insertError } = await supabase
      .from('creator_content')
      .insert({
        ...contentData,
        creator_id: creatorId
      })
      .select('id')
      .single();
    
    console.log('[Content Create API] Insert result:', { 
      newContent, 
      insertError: insertError?.message,
      insertErrorCode: insertError?.code,
      insertErrorDetails: insertError?.details 
    });
    
    if (insertError) {
      console.error('[Content Create API] Error creating content:', insertError);
      return NextResponse.json({ 
        error: `Failed to create content record: ${insertError.message}` 
      }, { status: 500 });
    }
    
    console.log(`[Content Create API] Content created successfully with ID: ${newContent.id}`);
    
    return NextResponse.json({
      success: true,
      contentId: newContent.id,
      canvasElementId,
      platform: detectedPlatform,
      existing: false
    });
    
  } catch (error: any) {
    console.error('[Content Create] Unexpected error:', error);
    
    return NextResponse.json({
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const contentId = searchParams.get('contentId');
    
    if (!url && !contentId) {
      return NextResponse.json({ 
        error: 'Either url or contentId parameter required' 
      }, { status: 400 });
    }
    
    let query = supabase
      .from('creator_content')
      .select('*');
    
    if (contentId) {
      query = query.eq('id', contentId);
    } else if (url) {
      query = query.eq('content_url', url);
    }
    
    const { data: content, error } = await query.single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Content not found' 
        }, { status: 404 });
      }
      return NextResponse.json({ 
        error: 'Database error' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      content
    });
    
  } catch (error: any) {
    console.error('[Content Create] Error fetching content:', error);
    
    return NextResponse.json({
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}