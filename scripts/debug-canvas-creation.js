#!/usr/bin/env node

// Debug script to test canvas creation directly
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== Canvas Creation Debug Script ===\n');

console.log('1. Environment Check:');
console.log('   - SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
console.log('   - ANON_KEY:', supabaseAnonKey ? '✓' : '✗');
console.log('   - SERVICE_KEY:', supabaseServiceKey ? '✓' : '✗');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Missing required environment variables!');
  console.error('Make sure .env.local contains:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDirectCreation() {
  console.log('Testing direct canvas creation with service role key...\n');
  
  // Demo account and user IDs from .env.local
  const testAccountId = '550e8400-e29b-41d4-a716-446655440001'; // Demo account
  const testUserId = '550e8400-e29b-41d4-a716-446655440002'; // Demo user
  
  const projectData = {
    account_id: testAccountId,
    created_by_user_id: testUserId,
    title: `Debug Canvas ${new Date().toISOString()}`,
    description: 'Created by debug script',
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
  
  console.log('Attempting to insert:', JSON.stringify(projectData, null, 2));
  
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();
    
    if (error) {
      console.error('\n❌ Insert failed:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      
      // Try to get more info about the error
      if (error.code === '42501') {
        console.error('\nThis is a Row Level Security (RLS) error.');
        console.error('Even with service role key, there might be triggers or constraints.');
      }
    } else {
      console.log('\n✅ Insert successful!');
      console.log('Created project:', data);
      
      // Clean up
      console.log('\nCleaning up test project...');
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', data.id);
      
      if (!deleteError) {
        console.log('✅ Test project deleted');
      } else {
        console.error('❌ Failed to delete test project:', deleteError.message);
      }
    }
  } catch (err) {
    console.error('\n❌ Exception:', err.message);
  }
}

async function checkTableStructure() {
  console.log('\n\n=== Checking Table Structure ===\n');
  
  try {
    // Get one row to see the structure
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(1);
    
    if (!error && data && data.length > 0) {
      console.log('Projects table columns:');
      console.log(Object.keys(data[0]).join(', '));
      console.log('\nSample row structure:');
      const sample = { ...data[0] };
      // Replace actual values with types
      Object.keys(sample).forEach(key => {
        sample[key] = typeof data[0][key];
      });
      console.log(JSON.stringify(sample, null, 2));
    }
  } catch (err) {
    console.error('Error checking table structure:', err.message);
  }
}

async function checkAuthenticatedUser(userId) {
  console.log('\n\n=== Testing with Specific User ID ===\n');
  console.log('User ID:', userId);
  
  const projectData = {
    account_id: userId,
    created_by_user_id: userId,
    title: `User Canvas ${new Date().toISOString()}`,
    description: 'Created for authenticated user',
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
  
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Insert failed for user:', error.message);
      return null;
    } else {
      console.log('✅ Insert successful for user!');
      return data.id;
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
    return null;
  }
}

async function runTests() {
  await checkTableStructure();
  await testDirectCreation();
  
  // If you have a real user ID, uncomment and test:
  // const realUserId = 'your-actual-user-id-here';
  // const canvasId = await checkAuthenticatedUser(realUserId);
  // if (canvasId) {
  //   console.log('\nCreated canvas ID:', canvasId);
  //   console.log('You can now navigate to: http://localhost:3001/canvas/' + canvasId);
  // }
  
  console.log('\n=== Debug Complete ===\n');
}

runTests().catch(console.error);