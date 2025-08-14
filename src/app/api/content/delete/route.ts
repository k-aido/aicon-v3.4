import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function DELETE(request: NextRequest) {
  try {
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
      
      if (authError || !userData.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      user = userData.user;
    }
    
    const { contentId } = await request.json();
    
    if (!contentId) {
      return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
    }
    
    console.log('[Content Delete] Deleting content record:', { contentId, isDemoMode });
    
    // First check if the content exists
    const { data: existingContent, error: fetchError } = await supabase
      .from('creator_content')
      .select('id, creator_id')
      .eq('id', contentId)
      .single();
    
    if (fetchError) {
      console.error('[Content Delete] Error fetching content:', fetchError);
      return NextResponse.json({ 
        error: 'Content not found',
        details: fetchError.message 
      }, { status: 404 });
    }
    
    if (!existingContent) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }
    
    // Delete the content record
    const { error: deleteError } = await supabase
      .from('creator_content')
      .delete()
      .eq('id', contentId);
    
    if (deleteError) {
      console.error('[Content Delete] Error deleting content:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete content',
        details: deleteError.message 
      }, { status: 500 });
    }
    
    console.log('[Content Delete] Successfully deleted content record:', contentId);
    
    return NextResponse.json({
      success: true,
      contentId,
      message: 'Content deleted successfully'
    });
    
  } catch (error: any) {
    console.error('[Content Delete] Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}