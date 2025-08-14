import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { canvasId } = resolvedParams;
    
    console.log('[API] DELETE /api/canvas/[canvasId] - Deleting canvas:', canvasId);
    
    // Use regular client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[API] Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('[API] Authenticated user:', user.id);
    
    // Simple approach: Just try to delete directly
    // The cascade delete in the database will handle related records
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', canvasId)
      .eq('created_by_user_id', user.id); // Only delete if user created it
    
    if (deleteError) {
      console.error('[API] Delete error:', deleteError);
      
      // If direct delete fails, try to check if canvas exists and user owns it
      const { data: checkProject, error: checkError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', canvasId)
        .single();
      
      if (checkError || !checkProject) {
        // Canvas doesn't exist or user can't see it
        return NextResponse.json({ error: 'Canvas not found or access denied' }, { status: 404 });
      }
      
      // Canvas exists but user can't delete it
      return NextResponse.json({ 
        error: 'Unable to delete canvas. You may not have permission or there may be database constraints.', 
        details: deleteError.message 
      }, { status: 403 });
    }
    
    console.log('[API] Canvas deleted successfully:', canvasId);
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[API] Unexpected error deleting canvas:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}