const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Testing Supabase connection...')
console.log('URL:', supabaseUrl)
console.log('Service key exists:', !!supabaseServiceKey)

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testConnection() {
  try {
    // Test basic connection
    console.log('📡 Testing connection...')
    const { data: connectionData, error: connectionError } = await supabase
      .rpc('version')
    
    if (connectionError) {
      console.error('❌ Connection failed:', connectionError)
      return
    }
    
    console.log('✅ Connection successful')
    
    // Check if chat_interfaces table exists
    console.log('🔍 Checking if chat_interfaces table exists...')
    const { data: tableData, error: tableError } = await supabase
      .from('chat_interfaces')
      .select('*')
      .limit(0)
    
    if (tableError) {
      console.error('❌ chat_interfaces table does not exist:', tableError.message)
      console.log('🔧 Creating chat_interfaces table...')
      
      // Create the table using raw SQL
      console.log('🔧 Attempting to create chat_interfaces table via SQL...')
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS chat_interfaces (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          position_x NUMERIC NOT NULL,
          position_y NUMERIC NOT NULL,
          width NUMERIC NOT NULL,
          height NUMERIC NOT NULL,
          chat_history JSONB,
          connected_content JSONB,
          ai_model_preference VARCHAR(100),
          project_id VARCHAR(255),
          created_by_user_id UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_chat_interfaces_project_id ON chat_interfaces(project_id);
      `
      
      console.log('SQL to execute:', createTableSQL)
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL })
      
      if (createError) {
        console.error('❌ Failed to create table:', createError)
      } else {
        console.log('✅ chat_interfaces table created successfully')
      }
    } else {
      console.log('✅ chat_interfaces table exists')
    }
    
    // Test insert
    console.log('🧪 Testing insert...')
    const testData = {
      name: 'Test Chat Interface',
      position_x: 100,
      position_y: 200,
      width: 800,
      height: 600,
      project_id: 'test-canvas-id',
      created_at: new Date().toISOString()
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('chat_interfaces')
      .insert([testData])
      .select()
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError)
      console.error('Full error:', JSON.stringify(insertError, null, 2))
    } else {
      console.log('✅ Insert successful:', insertData)
      
      // Clean up
      if (insertData && insertData[0] && insertData[0].id) {
        await supabase
          .from('chat_interfaces')
          .delete()
          .eq('id', insertData[0].id)
        console.log('🧹 Cleaned up test record')
      }
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

testConnection()