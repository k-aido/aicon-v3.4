#!/usr/bin/env node

/**
 * Test script to verify chat interface logging now includes user_id and account_id
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

// Test the API endpoint directly
async function testChatLoggingAPI() {
  console.log('🧪 Testing Chat Interface Logging API with user_id and account_id...\n');
  
  const testData = {
    action: 'create',
    chatElementId: randomUUID(),
    position: { x: 100, y: 200 },
    dimensions: { width: 800, height: 600 },
    canvasId: 'test-canvas-123',
    userId: 'user-456',
    accountId: 'account-789',
    modelType: 'gpt-4',
    name: 'Test Chat Interface'
  };
  
  console.log('📤 Sending test request with data:', testData);
  
  try {
    const response = await fetch('http://localhost:3000/api/log-chat-interface', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ API call successful!');
      console.log('📋 Response:', result);
      
      if (result.data && result.data.length > 0) {
        const logEntry = result.data[0];
        console.log('\n🔍 Verifying logged data:');
        console.log(`- Chat Element ID: ${logEntry.chat_element_id}`);
        console.log(`- User ID: ${logEntry.user_id}`);
        console.log(`- Account ID: ${logEntry.account_id}`);
        console.log(`- Canvas ID: ${logEntry.canvas_id}`);
        console.log(`- Model Type: ${logEntry.model_type}`);
        
        // Verify both user_id and account_id are present
        if (logEntry.user_id === testData.userId && logEntry.account_id === testData.accountId) {
          console.log('✅ Both user_id and account_id correctly logged!');
        } else {
          console.log('❌ user_id or account_id not correctly logged');
          console.log(`Expected user_id: ${testData.userId}, got: ${logEntry.user_id}`);
          console.log(`Expected account_id: ${testData.accountId}, got: ${logEntry.account_id}`);
        }
      }
    } else {
      console.error('❌ API call failed:', response.status, response.statusText);
      console.error('Response:', result);
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    console.log('\n💡 Make sure the development server is running: npm run dev');
  }
}

// Run the test
testChatLoggingAPI().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});