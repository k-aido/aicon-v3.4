/**
 * Setup script for demo workspace
 * Run this to ensure the demo workspace exists in the database
 */

import { createBrowserClient } from '@/lib/supabase/client';

const DEMO_WORKSPACE_ID = '550e8400-e29b-41d4-a716-446655440001';
const DEMO_USER_ID = '550e8400-e29b-41d4-a716-446655440002';

async function setupDemoWorkspace() {
  console.log('=== Setting up Demo Workspace ===');
  
  const supabase = createBrowserClient();
  
  try {
    // First, check if the workspace already exists
    console.log('Checking for existing demo workspace...');
    const { data: existing, error: checkError } = await supabase
      .from('canvas_workspaces')
      .select('*')
      .eq('id', DEMO_WORKSPACE_ID)
      .maybeSingle();

    if (checkError && !checkError.message.includes('No rows')) {
      console.error('Error checking for demo workspace:', checkError);
      return;
    }

    if (existing) {
      console.log('✅ Demo workspace already exists:', existing);
      return;
    }

    // Create the demo workspace
    console.log('Creating demo workspace...');
    const { data: newWorkspace, error: createError } = await supabase
      .from('canvas_workspaces')
      .insert({
        id: DEMO_WORKSPACE_ID,
        user_id: DEMO_USER_ID,
        title: 'Demo Canvas Workspace',
        description: 'A demo workspace for testing canvas persistence',
        viewport: { x: 0, y: 0, zoom: 1.0 },
        settings: {
          autoSave: true,
          showGrid: true,
          snapToGrid: false,
          gridSize: 20
        },
        is_public: true,
        metadata: {
          created_from: 'setup_script',
          version: '1.0.0',
          demo: true
        }
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create demo workspace:', createError);
      
      // If error is due to RLS, try to provide helpful info
      if (createError.message.includes('RLS') || createError.message.includes('policy')) {
        console.log('\n⚠️  RLS (Row Level Security) may be blocking the operation.');
        console.log('To fix this, you can:');
        console.log('1. Temporarily disable RLS on canvas_workspaces table in Supabase dashboard');
        console.log('2. Or create the workspace directly in Supabase SQL editor with:');
        console.log(`
INSERT INTO canvas_workspaces (
  id, user_id, title, description, viewport, settings, is_public, metadata
) VALUES (
  '${DEMO_WORKSPACE_ID}',
  '${DEMO_USER_ID}',
  'Demo Canvas Workspace',
  'A demo workspace for testing canvas persistence',
  '{"x": 0, "y": 0, "zoom": 1.0}'::jsonb,
  '{}'::jsonb,
  true,
  '{"created_from": "sql", "version": "1.0.0", "demo": true}'::jsonb
);
        `);
      }
      return;
    }

    console.log('✅ Demo workspace created successfully:', newWorkspace);

    // Add some demo elements
    console.log('Adding demo elements...');
    const demoElements = [
      {
        workspace_id: DEMO_WORKSPACE_ID,
        element_id: 1,
        type: 'content',
        position: { x: 100, y: 100 },
        dimensions: { width: 300, height: 200 },
        properties: {
          title: 'Welcome to AICON Canvas',
          url: 'https://example.com',
          platform: 'youtube',
          thumbnail: 'https://via.placeholder.com/300x200?text=Demo+Content'
        }
      },
      {
        workspace_id: DEMO_WORKSPACE_ID,
        element_id: 2,
        type: 'chat',
        position: { x: 500, y: 100 },
        dimensions: { width: 400, height: 500 },
        properties: {
          title: 'AI Assistant',
          messages: []
        }
      }
    ];

    const { error: elementsError } = await supabase
      .from('canvas_elements')
      .insert(demoElements);

    if (elementsError) {
      console.error('Failed to add demo elements:', elementsError);
    } else {
      console.log('✅ Demo elements added');
    }

    // Add a demo connection
    const { error: connectionError } = await supabase
      .from('canvas_connections')
      .insert({
        workspace_id: DEMO_WORKSPACE_ID,
        connection_id: 1,
        from_element: 1,
        to_element: 2
      });

    if (connectionError) {
      console.error('Failed to add demo connection:', connectionError);
    } else {
      console.log('✅ Demo connection added');
    }

    console.log('\n=== Demo Setup Complete ===');
    console.log(`Demo Workspace ID: ${DEMO_WORKSPACE_ID}`);
    console.log(`Demo User ID: ${DEMO_USER_ID}`);
    console.log('\nYou can now use the canvas with ?demo=true parameter');

  } catch (error) {
    console.error('Unexpected error during setup:', error);
  }
}

// Run the setup
if (typeof window !== 'undefined') {
  setupDemoWorkspace();
} else {
  console.error('This script must be run in a browser environment');
}