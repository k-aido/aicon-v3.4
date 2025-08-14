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

async function checkProjectsTable() {
  try {
    console.log('🔍 Checking for projects/canvas table...')
    
    // Common table names that might store projects/canvases
    const possibleTables = ['projects', 'canvases', 'workspaces', 'boards']
    
    for (const tableName of possibleTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('id')
          .limit(1)
        
        if (!error) {
          console.log(`✅ Found '${tableName}' table`)
          
          // Get a sample ID we can use
          const { data: sampleData } = await supabase
            .from(tableName)
            .select('id')
            .limit(1)
          
          if (sampleData && sampleData.length > 0) {
            console.log(`📝 Sample ${tableName} ID:`, sampleData[0].id)
            
            // Try to insert with this project ID
            console.log(`🧪 Testing chat_interfaces insert with ${tableName} ID...`)
            const { data: insertData, error: insertError } = await supabase
              .from('chat_interfaces')
              .insert([{
                name: 'Test Chat Interface',
                position_x: 100,
                position_y: 200,
                width: 800,
                height: 600,
                project_id: sampleData[0].id
              }])
              .select()
            
            if (insertError) {
              console.error(`❌ Insert with ${tableName} ID failed:`, insertError.message)
            } else {
              console.log(`✅ Insert with ${tableName} ID successful!`)
              console.log('📋 Created record:', insertData[0])
              
              // Clean up
              await supabase
                .from('chat_interfaces')
                .delete()
                .eq('id', insertData[0].id)
              console.log('🧹 Test record cleaned up')
              
              return sampleData[0].id // Return the working project ID
            }
          }
        }
      } catch (err) {
        // Table doesn't exist, continue
      }
    }
    
    console.log('❌ No suitable projects table found')
    
    // Check if we should create a projects table or remove the foreign key
    console.log('🔧 Possible solutions:')
    console.log('1. Create a projects/canvases table')
    console.log('2. Remove the foreign key constraint from chat_interfaces.project_id')
    console.log('3. Change project_id to accept any string value')
    
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

checkProjectsTable()