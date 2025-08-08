import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('[TEST-API] Starting canvas creation test...');
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!supabaseServiceKey
        }
      }, { status: 500 });
    }

    console.log('[TEST-API] Environment variables OK');
    
    // Use demo account and user IDs
    const demoAccountId = '550e8400-e29b-41d4-a716-446655440001';
    const demoUserId = '550e8400-e29b-41d4-a716-446655440002';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('[TEST-API] Supabase client created');

    // Test project creation
    const projectData = {
      account_id: demoAccountId,
      created_by_user_id: demoUserId,
      title: `Test Canvas ${new Date().toISOString()}`,
      description: 'Created by test API',
      canvas_data: {
        viewport: { x: 0, y: 0, zoom: 1.0 },
        elements: {},
        connections: {}
      },
      settings: {
        gridSize: 20,
        snapToGrid: false,
        showGrid: true
      },
      is_archived: false,
      is_public: false,
      last_accessed_at: new Date().toISOString()
    };

    console.log('[TEST-API] Attempting to create project:', projectData.title);

    const { data: project, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();

    if (error) {
      console.error('[TEST-API] Project creation failed:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        details: {
          code: error.code,
          details: error.details,
          hint: error.hint
        }
      }, { status: 500 });
    }

    console.log('[TEST-API] Project created successfully:', project.id);

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        title: project.title,
        created_at: project.created_at
      },
      message: 'Canvas created successfully via test API'
    });

  } catch (error: any) {
    console.error('[TEST-API] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test Canvas API - use POST to create a test canvas',
    endpoints: {
      POST: '/api/test-canvas - Create a test canvas',
      GET: '/api/debug/connection - Test database connection'
    }
  });
}