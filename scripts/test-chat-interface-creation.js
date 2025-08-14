// Using native fetch (Node.js 18+)

async function testChatInterfaceCreation() {
  try {
    console.log('🧪 Testing chat interface creation...');
    
    const testData = {
      elementId: 'test-123',
      projectId: '6c2312c7-2bdf-4f65-98c4-75cacbbd256d',
      name: 'Test Chat Interface',
      position: { x: 100, y: 200 },
      dimensions: { width: 600, height: 700 },
      modelPreference: 'gpt-5-mini',
      userId: null
    };
    
    console.log('📝 Sending request:', testData);
    
    const response = await fetch('http://localhost:3001/api/chat-interface/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const responseText = await response.text();
    console.log('📋 Response status:', response.status);
    console.log('📋 Response headers:', response.headers.raw());
    console.log('📋 Response body:', responseText);
    
    if (response.ok) {
      const result = JSON.parse(responseText);
      console.log('✅ Success! Chat interface created:', result);
    } else {
      console.error('❌ Failed:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testChatInterfaceCreation();