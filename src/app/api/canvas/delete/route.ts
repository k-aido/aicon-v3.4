import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const canvasId = searchParams.get('id');
    
    if (!canvasId) {
      return NextResponse.json(
        { error: 'Canvas ID is required' },
        { status: 400 }
      );
    }

    console.log('[API Delete] Attempting to delete canvas:', canvasId);

    // Get auth from cookies to verify user
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Look for the auth token in cookies
    const authTokenKey = `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`;
    const authToken = cookieStore.get(authTokenKey);
    
    let userId = null;
    
    if (authToken?.value) {
      try {
        const tokenData = JSON.parse(authToken.value);
        const accessToken = tokenData.access_token;
        
        if (accessToken) {
          const authClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false
            },
            global: {
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            }
          });
          
          const { data: { user }, error: userError } = await authClient.auth.getUser(accessToken);
          
          if (user && !userError) {
            userId = user.id;
            console.log('[API Delete] Authenticated user:', user.email);
          }
        }
      } catch (e) {
        console.log('[API Delete] Error parsing auth token:', e);
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Use service role key for deletion to bypass RLS
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseKey) {
      console.error('[API Delete] SUPABASE_SERVICE_ROLE_KEY not found');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // First verify the user owns this canvas
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('id, created_by_user_id, account_id')
      .eq('id', canvasId)
      .single();

    if (fetchError || !project) {
      console.error('[API Delete] Canvas not found:', fetchError);
      return NextResponse.json(
        { error: 'Canvas not found' },
        { status: 404 }
      );
    }

    // Check ownership
    const { data: userData } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', userId)
      .single();
      
    const userAccountId = userData?.account_id || userId;
    
    if (project.created_by_user_id !== userId && project.account_id !== userAccountId) {
      console.error('[API Delete] User does not own this canvas');
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    console.log('[API Delete] User verified as owner, proceeding with deletion');

    // Delete related records first to avoid foreign key constraints
    // Each table has different column names for the project reference
    const cleanupTables = [
      { table: 'content_analysis', column: 'project_id' },
      { table: 'chat_interfaces', column: 'project_id' },
      { table: 'canvas_elements', column: 'project_id' },
      { table: 'canvas_connections', column: 'project_id' }
    ];

    for (const { table, column } of cleanupTables) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq(column, canvasId);
        
        if (error) {
          console.warn(`[API Delete] Warning cleaning ${table}:`, error.message);
        } else {
          console.log(`[API Delete] Cleaned ${table}`);
        }
      } catch (e) {
        console.warn(`[API Delete] Error cleaning ${table}:`, e);
      }
    }

    // Now delete the project
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', canvasId);

    if (deleteError) {
      console.error('[API Delete] Failed to delete project:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete canvas', details: deleteError.message },
        { status: 500 }
      );
    }

    console.log('[API Delete] Canvas deleted successfully');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[API Delete] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}