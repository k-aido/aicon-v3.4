import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { canvasId: string } }
) {
  try {
    const canvasId = params.canvasId;
    
    if (!canvasId) {
      return NextResponse.json(
        { error: 'Canvas ID is required' },
        { status: 400 }
      );
    }

    console.log('[API] Loading canvas:', canvasId);

    // Try to get session from cookies
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Look for the auth token in cookies
    const authTokenKey = `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`;
    const authToken = cookieStore.get(authTokenKey);
    
    console.log('[API] Looking for auth token:', {
      key: authTokenKey,
      found: !!authToken?.value
    });
    
    let userId = null;
    
    if (authToken?.value) {
      try {
        // Parse the auth token to get session
        const tokenData = JSON.parse(authToken.value);
        
        // Extract the access token
        const accessToken = tokenData.access_token;
        
        if (accessToken) {
          // Create a client with the access token
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
          
          // Try to get user from the session
          const { data: { user }, error: userError } = await authClient.auth.getUser(accessToken);
          
          if (user && !userError) {
            userId = user.id;
            console.log('[API] Got user from auth token:', { userId: user.id, email: user.email });
          } else if (tokenData.user?.id) {
            // Fallback to user data in token
            userId = tokenData.user.id;
            console.log('[API] Using user from token data:', { userId: tokenData.user.id });
          }
        } else if (tokenData.user?.id) {
          // Fallback to user data in token
          userId = tokenData.user.id;
          console.log('[API] Using user from token data (no access token):', { userId: tokenData.user.id });
        }
      } catch (e) {
        console.log('[API] Error parsing auth token:', e);
      }
    }

    // Use service role key to ensure we can read projects
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseKey) {
      console.error('[API] SUPABASE_SERVICE_ROLE_KEY not found in environment');
      return NextResponse.json(
        { error: 'Server configuration error: missing service role key' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Load the canvas/project
    console.log('[API] Fetching project from database...');
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', canvasId)
      .single();

    if (error) {
      console.error('[API] Error fetching project:', error);
      console.error('[API] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Canvas not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code,
          details: error.details
        },
        { status: 500 }
      );
    }

    if (!project) {
      console.log('[API] No project found with ID:', canvasId);
      return NextResponse.json(
        { error: 'Canvas not found' },
        { status: 404 }
      );
    }

    console.log('[API] Project found:', {
      id: project.id,
      title: project.title,
      account_id: project.account_id,
      created_by_user_id: project.created_by_user_id,
      user_id: project.user_id
    });

    // Check if user has access to this canvas
    // Allow access if:
    // 1. Canvas is public
    // 2. User created the canvas
    // 3. User is associated with the canvas
    // 4. User's account owns the canvas
    if (!project.is_public) {
      if (userId) {
        const hasAccess = 
          project.created_by_user_id === userId ||
          project.user_id === userId ||
          project.account_id === userId;
        
        if (!hasAccess) {
          console.log('[API] User does not have access to this canvas:', {
            userId,
            created_by: project.created_by_user_id,
            user_id: project.user_id,
            account_id: project.account_id
          });
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          );
        }
      } else {
        // No user session and canvas is not public
        console.log('[API] No user session and canvas is not public');
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }

    // Update last accessed timestamp
    await supabase
      .from('projects')
      .update({ 
        last_accessed_at: new Date().toISOString(),
        last_accessed_by_user_id: userId
      })
      .eq('id', canvasId);

    console.log('[API] Canvas loaded successfully');

    return NextResponse.json({ 
      success: true, 
      canvas: project 
    });

  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}