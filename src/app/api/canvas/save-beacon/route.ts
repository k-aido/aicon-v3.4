import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Get session from cookies
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Look for the auth token in cookies
    const authTokenKey = `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`;
    const authToken = cookieStore.get(authTokenKey);
    
    let userId = null;
    let accessToken = null;
    
    if (authToken?.value) {
      try {
        const tokenData = JSON.parse(authToken.value);
        userId = tokenData.user?.id;
        accessToken = tokenData.access_token;
      } catch (e) {
        console.error('[SaveBeacon] Failed to parse auth token:', e);
      }
    }
    
    if (!userId || !accessToken) {
      console.error('[SaveBeacon] No valid session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Create authenticated client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
    
    // Parse the beacon data
    const data = await request.json();
    const { workspaceId, elements, connections, viewport, title } = data;
    
    console.log('[SaveBeacon] Received unmount save request for workspace:', workspaceId);
    console.log('[SaveBeacon] Elements to save:', elements?.length);
    console.log('[SaveBeacon] User ID:', userId);
    
    // Validate elements before saving
    const validatedElements = elements?.map((el: any) => {
      if (!el.id || !el.type) {
        console.warn('[SaveBeacon] Invalid element missing id or type:', el);
        return null;
      }
      
      if (typeof el.x !== 'number' || typeof el.y !== 'number' || 
          typeof el.width !== 'number' || typeof el.height !== 'number') {
        console.warn('[SaveBeacon] Invalid element missing position/dimensions:', el);
        return null;
      }
      
      return el;
    }).filter((el: any) => el !== null) || [];
    
    // Prepare canvas_data
    const canvasData = {
      elements: validatedElements.reduce((acc: any, el: any) => {
        acc[el.id] = el;
        return acc;
      }, {}),
      connections: (connections || []).reduce((acc: any, conn: any) => {
        acc[conn.id] = conn;
        return acc;
      }, {}),
      viewport: viewport || { x: 0, y: 0, zoom: 1.0 }
    };
    
    // Update the project
    const { error } = await supabase
      .from('projects')
      .update({
        canvas_data: canvasData,
        title: title,
        last_accessed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', workspaceId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('[SaveBeacon] Error saving canvas:', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }
    
    console.log('[SaveBeacon] Canvas saved successfully via beacon');
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[SaveBeacon] Error in save-beacon route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}