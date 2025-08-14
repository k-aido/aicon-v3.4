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

export async function POST(request: NextRequest) {
  try {
    const { elementId, projectId, position, dimensions } = await request.json();

    console.log('[API] Creating chat interface for element:', elementId);

    // Get user authentication
    const userId = await getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a new chat_interface record
    const { data: chatInterface, error } = await supabase
      .from('chat_interfaces')
      .insert({
        project_id: projectId,
        name: `Chat Interface ${elementId}`,
        position_x: position?.x || 0,
        position_y: position?.y || 0,
        width: dimensions?.width || 700,
        height: dimensions?.height || 800,
        user_id: userId,
        ai_model_preference: 'gpt-5-mini',
        chat_history: {},
        connected_content: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[API] Error creating chat interface:', error);
      return NextResponse.json(
        { error: 'Failed to create chat interface' },
        { status: 500 }
      );
    }

    console.log('[API] Created chat interface:', chatInterface.id);

    return NextResponse.json({ 
      success: true,
      chatInterfaceId: chatInterface.id 
    });
  } catch (error: any) {
    console.error('Create interface API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create chat interface' },
      { status: 500 }
    );
  }
}