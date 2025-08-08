#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test with a real auth user ID
const testUserId = '4802b0ee-3d92-411e-a8db-8a716ab5f46a'; // kdo@kevindo.ca

async function testCanvasCreation() {
  console.log('Testing canvas creation for user:', testUserId);
  
  // First check if user has account
  const { data: userRecord } = await supabase
    .from('users')
    .select('account_id')
    .eq('id', testUserId)
    .single();
  
  console.log('User record:', userRecord);
  
  // Test via API
  console.log('\nTesting via API endpoint...');
  const response = await fetch('http://localhost:3001/api/canvas/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Test Canvas via Script',
      userId: testUserId
    })
  });
  
  const result = await response.json();
  console.log('API Response:', result);
  
  if (result.success && result.canvas) {
    console.log('\n✅ Canvas created successfully!');
    console.log('Canvas ID:', result.canvas.id);
    console.log('Navigate to: http://localhost:3001/canvas/' + result.canvas.id);
  } else {
    console.log('\n❌ Failed to create canvas');
  }
}

testCanvasCreation().catch(console.error);