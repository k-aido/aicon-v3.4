const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Use anon key like frontend
const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID
const DEMO_PROJECT_ID = process.env.NEXT_PUBLIC_DEMO_PROJECT_ID

const supabase = createClient(supabaseUrl, supabaseAnonKey) // Use anon key

async function testAnonKey() {
  try {
    console.log('🧪 Testing with anon key (like frontend)...')
    
    const chatInterfaceData = {
      name: 'Chat 12345',
      position_x: 100,
      position_y: 200,
      width: 800,
      height: 600,
      project_id: DEMO_PROJECT_ID,
      created_by_user_id: DEMO_USER_ID
    }
    
    console.log('📝 Data to insert:', chatInterfaceData)
    
    const { data, error } = await supabase
      .from('chat_interfaces')
      .insert([chatInterfaceData])
      .select()
    
    if (error) {
      console.error('❌ Anon key insert failed:', error)
      console.error('Full error:', JSON.stringify(error, null, 2))
      
      if (error.code === '42501') {
        console.log('🔒 This is a permissions issue - anon user cannot insert into chat_interfaces')
        console.log('💡 This explains why the frontend logging fails')
        console.log('🔧 Solution options:')
        console.log('1. Enable RLS policy for anon users to insert')
        console.log('2. Use service role key in frontend (not recommended)')
        console.log('3. Create an API endpoint that handles the logging server-side')
      }
    } else {
      console.log('✅ Anon key insert successful!')
      console.log('📋 Created record:', data[0])
      
      // Clean up
      if (data && data[0]) {
        await supabase
          .from('chat_interfaces')
          .delete()
          .eq('id', data[0].id)
        console.log('🧹 Test record cleaned up')
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

testAnonKey()