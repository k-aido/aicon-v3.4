import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
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
    const {
      elementId,
      projectId, // This is the canvas ID
      name,
      position,
      dimensions,
      modelPreference,
      userId
    } = body;

    // First, check if we need to create a project record
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (!project) {
      // Create project if it doesn't exist
      const { error: projectError } = await supabase
        .from('projects')
        .insert({
          id: projectId,
          title: 'Canvas Project',
          created_by_user_id: userId || null,
          user_id: userId || null
        });

      if (projectError) {
        console.error('Failed to create project:', projectError);
        // Continue anyway, as the foreign key is nullable
      }
    }

    // Create the chat interface
    const { data: chatInterface, error: chatError } = await supabase
      .from('chat_interfaces')
      .insert({
        project_id: project ? projectId : null,
        name: name || `Chat ${elementId}`,
        position_x: Math.round(position?.x || 0),
        position_y: Math.round(position?.y || 0),
        width: dimensions?.width || 600,
        height: dimensions?.height || 700,
        ai_model_preference: modelPreference || 'gpt-5-mini',
        user_id: userId || null
      })
      .select()
      .single();

    if (chatError) {
      console.error('Failed to create chat interface:', chatError);
      return NextResponse.json(
        { error: chatError.message },
        { status: 400 }
      );
    }

    // Also log the event for tracking
    await supabase
      .from('chat_interface_events')
      .insert({
        event_type: 'created',
        chat_element_id: elementId,
        chat_interface_id: chatInterface.id, // Link to the actual interface
        project_id: project ? projectId : null,
        canvas_id: projectId,
        user_id: userId || null,
        position_x: Math.round(position?.x || 0),
        position_y: Math.round(position?.y || 0),
        width: dimensions?.width || 600,
        height: dimensions?.height || 700,
        model_type: modelPreference || 'gpt-5-mini',
        conversation_count: 0
      });

    return NextResponse.json({ 
      success: true, 
      chatInterface: {
        id: chatInterface.id,
        elementId: elementId
      }
    });
  } catch (error) {
    console.error('Error creating chat interface:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}