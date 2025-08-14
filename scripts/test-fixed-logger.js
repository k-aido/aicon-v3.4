const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID
const DEMO_PROJECT_ID = process.env.NEXT_PUBLIC_DEMO_PROJECT_ID

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testFixedLogger() {
  try {
    console.log('🧪 Testing the fixed logger format...')
    
    // Simulate what ChatEventLogger.logChatInterfaceCreated now does
    const chatInterfaceData = {
      name: 'Chat 12345',
      position_x: 100,
      position_y: 200,
      width: 800,
      height: 600,
      chat_history: null,
      connected_content: null,
      ai_model_preference: 'gpt-5-mini',
      project_id: DEMO_PROJECT_ID,
      created_by_user_id: DEMO_USER_ID,
      user_id: DEMO_USER_ID, // Add user_id field
      created_at: new Date().toISOString()
    }
    
    console.log('📝 Data to insert:', chatInterfaceData)
    
    const { data, error } = await supabase
      .from('chat_interfaces')
      .insert([chatInterfaceData])
      .select()
    
    if (error) {
      console.error('❌ Insert failed:', error)
      console.error('Full error:', JSON.stringify(error, null, 2))
    } else {
      console.log('✅ Insert successful!')
      console.log('📋 Created record:', data[0])
      
      // Clean up
      if (data && data[0]) {
        await supabase
          .from('chat_interfaces')
          .delete()
          .eq('id', data[0].id)
        console.log('🧹 Test record cleaned up')
      }
      
      console.log('🎉 ChatEventLogger should now work correctly!')
    }
    
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

testFixedLogger()