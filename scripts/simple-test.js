const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Testing Supabase chat_interfaces table...')

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function test() {
  try {
    // Test if table exists by trying to select from it
    console.log('📋 Testing chat_interfaces table access...')
    const { data, error } = await supabase
      .from('chat_interfaces')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Table access failed:', error)
      console.error('Error code:', error.code)
      console.error('Error details:', error.details)
      console.error('Error hint:', error.hint)
      console.error('Full error:', JSON.stringify(error, null, 2))
      
      if (error.code === '42P01') {
        console.log('📝 Table does not exist. This explains the logging error.')
        console.log('🔧 You need to create the chat_interfaces table in your Supabase database.')
        console.log('🔗 Go to: https://cwwllnxxcnlquocvfuqd.supabase.co/project/cwwllnxxcnlquocvfuqd/editor')
        console.log('📄 Run the SQL from: sql/create_chat_interfaces_if_not_exists.sql')
      }
    } else {
      console.log('✅ Table exists and is accessible')
      console.log('📊 Sample data (if any):', data)
      
      // Try a test insert
      console.log('🧪 Testing insert...')
      const testData = {
        name: 'Test Chat Interface',
        position_x: 100,
        position_y: 200,
        width: 800,
        height: 600,
        project_id: 'test-canvas-id'
      }
      
      const { data: insertData, error: insertError } = await supabase
        .from('chat_interfaces')
        .insert([testData])
        .select()
      
      if (insertError) {
        console.error('❌ Insert failed:', insertError)
      } else {
        console.log('✅ Insert successful:', insertData)
        
        // Clean up
        if (insertData && insertData[0]) {
          await supabase
            .from('chat_interfaces')
            .delete()
            .eq('id', insertData[0].id)
          console.log('🧹 Test record cleaned up')
        }
      }
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

test()