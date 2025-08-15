import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper function to get user ID from cookies
async function getUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const authTokenKey = `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`;
  const authToken = cookieStore.get(authTokenKey);
  
  if (authToken?.value) {
    try {
      const tokenData = JSON.parse(authToken.value);
      return tokenData.user?.id || null;
    } catch (e) {
      console.error('Failed to parse auth token:', e);
    }
  }
  return null;
}

/**
 * Cleanup content data when a canvas element is deleted
 */
export async function POST(request: NextRequest) {
  try {
    const { scrapeId, projectId } = await request.json();

    // Validate request
    if (!scrapeId || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: scrapeId, projectId' },
        { status: 400 }
      );
    }

    // Get user authentication
    const userId = await getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cleanup API] Starting cleanup for scrapeId:', scrapeId);

    // First, verify the scrape belongs to the user
    const { data: scrapeRecord, error: verifyError } = await supabase
      .from('content_scrapes')
      .select('id')
      .eq('id', scrapeId)
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .single();

    if (verifyError || !scrapeRecord) {
      console.log('[Cleanup API] Scrape not found or unauthorized:', scrapeId);
      // Don't error out - element might already be deleted or not have scraping data
      return NextResponse.json({ 
        success: true, 
        message: 'No content to cleanup' 
      });
    }

    // Delete from project_content_library first (references content_analysis)
    const { error: libraryError } = await supabase
      .from('project_content_library')
      .delete()
      .eq('project_id', projectId)
      .eq('analysis_id', scrapeId);

    if (libraryError) {
      console.error('[Cleanup API] Error deleting from library:', libraryError);
    }

    // Delete from content_analysis (references content_scrapes)
    const { error: analysisError } = await supabase
      .from('content_analysis')
      .delete()
      .eq('scrape_id', scrapeId);

    if (analysisError) {
      console.error('[Cleanup API] Error deleting analysis:', analysisError);
    }

    // Finally, delete from content_scrapes
    const { error: scrapeError } = await supabase
      .from('content_scrapes')
      .delete()
      .eq('id', scrapeId)
      .eq('user_id', userId);

    if (scrapeError) {
      console.error('[Cleanup API] Error deleting scrape:', scrapeError);
      return NextResponse.json(
        { error: 'Failed to cleanup content data' },
        { status: 500 }
      );
    }

    console.log('[Cleanup API] Successfully cleaned up content for scrapeId:', scrapeId);

    return NextResponse.json({
      success: true,
      message: 'Content data cleaned up successfully',
      scrapeId
    });

  } catch (error: any) {
    console.error('[Cleanup API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cleanup content' },
      { status: 500 }
    );
  }
}