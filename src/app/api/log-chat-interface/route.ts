import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    console.log('🎯 chat-interface API endpoint called');
    
    // Use service role key for server-side operations to bypass RLS
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
    const body = await request.json();
    console.log('📥 Request body received:', body);
    
    // Extract values from request body
    const {
      chatElementId,
      position,
      dimensions,
      canvasId,
      userId,
      modelType,
      name
    } = body;
    
    const insertData = {
      event_type: 'created',
      chat_element_id: chatElementId || '1',
      position_x: Math.round(position?.x || 0),
      position_y: Math.round(position?.y || 0),
      width: dimensions?.width || 600,
      height: dimensions?.height || 700,
      canvas_id: canvasId || null,
      user_id: userId || null,
      model_type: modelType || 'gpt-5-mini',
      conversation_count: 0
    };
    
    console.log('📝 Data to insert into chat_interface_events:', insertData);
    
    // Insert into Supabase with correct field names (snake_case)
    const { data, error } = await supabase
      .from('chat_interface_events')
      .insert(insertData)
      .select();
    
    if (error) {
      console.error('❌ Failed to log chat interface creation:', error);
      console.error('❌ Full error details:', JSON.stringify(error, null, 2));
      return Response.json({ error: error.message }, { status: 400 });
    }
    
    console.log('✅ Successfully inserted into chat_interface_events:', data);
    return Response.json({ success: true, data });
    
  } catch (error) {
    console.error('Error in log-chat-interface:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}