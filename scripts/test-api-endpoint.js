const fetch = require('node-fetch')

async function testApiEndpoint() {
  try {
    console.log('🧪 Testing chat interface logging API endpoint...')
    
    const testData = {
      action: 'create',
      chatElementId: '12345',
      position: { x: 100, y: 200 },
      dimensions: { width: 800, height: 600 },
      canvasId: 'test-canvas',
      userId: 'test-user',
      modelType: 'gpt-5-mini',
      name: 'Test Chat'
    }
    
    console.log('📝 Sending request:', testData)
    
    const response = await fetch('http://localhost:3001/api/log-chat-interface', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      console.error('❌ API call failed:', response.status, response.statusText)
      console.error('Error:', result.error)
      console.error('Details:', result.details)
    } else {
      console.log('✅ API call successful!')
      console.log('📋 Response:', result)
      
      if (result.data && result.data.id) {
        console.log('🧹 Testing deletion...')
        
        const deleteResponse = await fetch('http://localhost:3001/api/log-chat-interface', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'delete',
            chatElementId: '12345'
          })
        })
        
        const deleteResult = await deleteResponse.json()
        console.log('🗑️ Delete response:', deleteResult)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testApiEndpoint()