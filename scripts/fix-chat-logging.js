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

async function fixChatLogging() {
  try {
    console.log('🔧 Fixing chat interface logging...')
    console.log('Demo User ID:', DEMO_USER_ID)
    console.log('Demo Project ID:', DEMO_PROJECT_ID)
    
    // Test with all the required fields including user_id
    console.log('🧪 Testing complete insert with all required fields...')
    const testData = {
      name: 'Test Chat Interface',
      position_x: 100,
      position_y: 200,  
      width: 800,
      height: 600,
      project_id: DEMO_PROJECT_ID, // Use demo project ID
      user_id: DEMO_USER_ID,       // Add user_id field
      created_by_user_id: DEMO_USER_ID // Also try this field
    }
    
    console.log('Test data:', testData)
    
    const { data: insertData, error: insertError } = await supabase
      .from('chat_interfaces')
      .insert([testData])
      .select()
    
    if (insertError) {
      console.error('❌ Complete insert failed:', insertError)
      console.error('Full error:', JSON.stringify(insertError, null, 2))
      
      // Try with just user_id
      console.log('🧪 Trying with just user_id field...')
      const { data: insertData2, error: insertError2 } = await supabase
        .from('chat_interfaces')
        .insert([{
          name: 'Test Chat Interface 2',
          position_x: 100,
          position_y: 200,
          width: 800,
          height: 600,
          project_id: DEMO_PROJECT_ID,
          user_id: DEMO_USER_ID
        }])
        .select()
      
      if (insertError2) {
        console.error('❌ user_id insert failed:', insertError2.message)
      } else {
        console.log('✅ user_id insert worked!')
        // Clean up
        if (insertData2 && insertData2[0]) {
          await supabase.from('chat_interfaces').delete().eq('id', insertData2[0].id)
        }
      }
      
    } else {
      console.log('✅ Complete insert successful!')
      console.log('📋 Created record:', insertData[0])
      
      // Clean up
      if (insertData && insertData[0]) {
        await supabase
          .from('chat_interfaces')
          .delete()
          .eq('id', insertData[0].id)
        console.log('🧹 Test record cleaned up')
      }
      
      // Now let's update the ChatEventLogger with the correct format
      console.log('🔧 The solution is to use:')
      console.log('- project_id:', DEMO_PROJECT_ID)
      console.log('- user_id:', DEMO_USER_ID)
      console.log('📝 ChatEventLogger needs to be updated with these fields')
    }
    
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

fixChatLogging()