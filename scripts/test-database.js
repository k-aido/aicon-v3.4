#!/usr/bin/env node

// Test script to verify database setup and permissions
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== Database Test Script ===\n');
console.log('Environment check:');
console.log('- Supabase URL:', supabaseUrl ? '✓ Configured' : '✗ Missing');
console.log('- Anon Key:', supabaseAnonKey ? '✓ Configured' : '✗ Missing');
console.log('- Service Key:', supabaseServiceKey ? '✓ Configured' : '✗ Missing');
console.log('\n');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables!');
  process.exit(1);
}

// Test with anon key (what the app uses)
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Test with service key (bypasses RLS)
const supabaseService = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

async function testTableAccess(client, clientName) {
  console.log(`\n=== Testing with ${clientName} ===`);
  
  // Test 1: Check if we can read from projects table
  console.log('\n1. Testing READ access to projects table:');
  try {
    const { data, error, count } = await client
      .from('projects')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (error) {
      console.log(`   ✗ Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details: ${JSON.stringify(error.details)}`);
    } else {
      console.log(`   ✓ Success! Found ${count || data?.length || 0} projects`);
      if (data && data.length > 0) {
        console.log(`   Sample project: ${data[0].title} (${data[0].id})`);
      }
    }
  } catch (err) {
    console.log(`   ✗ Exception: ${err.message}`);
  }
  
  // Test 2: Check table structure
  console.log('\n2. Checking projects table structure:');
  try {
    const { data, error } = await client
      .from('projects')
      .select('*')
      .limit(0); // Just get structure, no data
    
    if (!error) {
      console.log('   ✓ Table accessible');
    } else {
      console.log(`   ✗ Error: ${error.message}`);
    }
  } catch (err) {
    console.log(`   ✗ Exception: ${err.message}`);
  }
  
  // Test 3: Try to insert a test project
  console.log('\n3. Testing INSERT access to projects table:');
  const testProject = {
    account_id: '550e8400-e29b-41d4-a716-446655440001', // Demo account
    created_by_user_id: '550e8400-e29b-41d4-a716-446655440002', // Demo user
    title: `Test Canvas ${new Date().toISOString()}`,
    description: 'Test project created by database test script',
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
    console.log('   Attempting to insert:', JSON.stringify(testProject, null, 2));
    
    const { data, error } = await client
      .from('projects')
      .insert([testProject])
      .select();
    
    if (error) {
      console.log(`   ✗ Insert failed: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details: ${JSON.stringify(error.details)}`);
      console.log(`   Hint: ${error.hint}`);
    } else {
      console.log(`   ✓ Insert successful!`);
      console.log(`   Data returned: ${data ? 'Yes' : 'No'}`);
      if (data && data.length > 0) {
        console.log(`   Created project ID: ${data[0].id}`);
        
        // Clean up - delete the test project
        const { error: deleteError } = await client
          .from('projects')
          .delete()
          .eq('id', data[0].id);
        
        if (!deleteError) {
          console.log('   ✓ Test project cleaned up');
        }
      }
    }
  } catch (err) {
    console.log(`   ✗ Exception: ${err.message}`);
  }
}

async function checkRLS() {
  console.log('\n=== Checking RLS Policies ===');
  
  if (!supabaseService) {
    console.log('Service key not available, skipping RLS check');
    return;
  }
  
  try {
    // Check if RLS is enabled on projects table
    const { data, error } = await supabaseService
      .from('projects')
      .select('*')
      .limit(1);
    
    // If we can read with service key but not with anon key, RLS is likely the issue
    console.log('Service key can read projects:', !error ? '✓ Yes' : '✗ No');
  } catch (err) {
    console.log('Error checking with service key:', err.message);
  }
}

async function runTests() {
  // Test with anon key
  await testTableAccess(supabaseAnon, 'Anon Key (App uses this)');
  
  // Test with service key if available
  if (supabaseService) {
    await testTableAccess(supabaseService, 'Service Key (Bypasses RLS)');
  }
  
  // Check RLS
  await checkRLS();
  
  console.log('\n=== Test Complete ===\n');
}

runTests().catch(console.error);