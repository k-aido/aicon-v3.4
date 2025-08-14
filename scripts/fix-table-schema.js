const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixSchema() {
  try {
    console.log('🔍 Checking current table schema...')
    
    // Try to get schema information 
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('get_table_schema', { table_name: 'chat_interfaces' })
    
    if (schemaError) {
      console.log('⚠️ Could not get schema via RPC. Trying direct insert test...')
      
      // Test with string project_id
      console.log('🧪 Testing with string project_id...')
      const { data: stringTest, error: stringError } = await supabase
        .from('chat_interfaces')
        .insert([{
          name: 'Test Chat',
          position_x: 100,
          position_y: 200,
          width: 800,
          height: 600,
          project_id: 'test-canvas-string-id'
        }])
        .select()
      
      if (stringError) {
        console.error('❌ String project_id failed:', stringError.message)
        
        // Test with UUID project_id
        console.log('🧪 Testing with UUID project_id...')
        const { data: uuidTest, error: uuidError } = await supabase
          .from('chat_interfaces')
          .insert([{
            name: 'Test Chat UUID',
            position_x: 100,
            position_y: 200,
            width: 800,
            height: 600,
            project_id: '550e8400-e29b-41d4-a716-446655440000' // Valid UUID
          }])
          .select()
        
        if (uuidError) {
          console.error('❌ UUID project_id also failed:', uuidError.message)
          console.log('🔧 Both string and UUID failed. Need to examine table structure manually.')
        } else {
          console.log('✅ UUID project_id works!')
          console.log('🔧 The project_id column expects UUID format, not strings.')
          console.log('📝 Need to update the ChatEventLogger to convert canvas IDs to UUIDs.')
          
          // Clean up
          if (uuidTest && uuidTest[0]) {
            await supabase
              .from('chat_interfaces')
              .delete()
              .eq('id', uuidTest[0].id)
            console.log('🧹 Test record cleaned up')
          }
        }
      } else {
        console.log('✅ String project_id works!')
        console.log('📝 The project_id column accepts strings.')
        
        // Clean up
        if (stringTest && stringTest[0]) {
          await supabase
            .from('chat_interfaces')
            .delete()
            .eq('id', stringTest[0].id)
          console.log('🧹 Test record cleaned up')
        }
      }
    } else {
      console.log('📊 Schema information:', schemaData)
    }
    
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

fixSchema()