import { supabase } from '../lib/supabase'

// Debug utility to check Supabase schema and connectivity
export class SupabaseDebug {
  static async checkConnection(): Promise<void> {
    if (!supabase) {
      console.log('❌ Supabase client not configured')
      return
    }

    try {
      // Try a simple query to test connection
      const { data, error } = await supabase
        .from('_realtime_schema')
        .select('*')
        .limit(1)
      
      if (error) {
        console.log('⚠️ Supabase connection issue:', error.message)
      } else {
        console.log('✅ Supabase connection working')
      }
    } catch (err) {
      console.log('❌ Supabase connection failed:', err)
    }
  }

  static async listTables(): Promise<void> {
    if (!supabase) {
      console.log('❌ Supabase client not configured')
      return
    }

    try {
      // Get table information from information_schema
      const { data, error } = await supabase
        .rpc('get_schema_info') // This might not work, depends on your setup
        
      if (error) {
        console.log('⚠️ Could not list tables:', error.message)
        console.log('Trying alternative approach...')
        
        // Try to access some common table names to see which exist
        const tableNames = ['chat_interfaces', 'chat_threads', 'thread_messages', 'profiles', 'users']
        
        for (const tableName of tableNames) {
          try {
            const { data: tableData, error: tableError } = await supabase
              .from(tableName)
              .select('*')
              .limit(0)
              
            if (tableError) {
              console.log(`❌ Table '${tableName}' does not exist or is inaccessible`)
            } else {
              console.log(`✅ Table '${tableName}' exists and is accessible`)
            }
          } catch (tableErr) {
            console.log(`❌ Error checking table '${tableName}':`, tableErr)
          }
        }
      } else {
        console.log('Available tables:', data)
      }
    } catch (err) {
      console.log('❌ Error listing tables:', err)
    }
  }

  static async testChatInterfaceInsert(): Promise<void> {
    if (!supabase) {
      console.log('❌ Supabase client not configured')
      return
    }

    const testData = {
      name: 'Test Chat Interface',
      position_x: 100,
      position_y: 200,
      width: 800,
      height: 600,
      project_id: 'test-canvas-id',
      created_at: new Date().toISOString()
    }

    try {
      console.log('🧪 Testing chat_interfaces table insert...')
      console.log('Test data:', testData)
      
      const { data, error } = await supabase
        .from('chat_interfaces')
        .insert([testData])
        .select()

      if (error) {
        console.log('❌ Insert failed:', error)
        console.log('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
      } else {
        console.log('✅ Insert successful:', data)
        
        // Clean up - delete the test record
        if (data && data[0] && data[0].id) {
          await supabase
            .from('chat_interfaces')
            .delete()
            .eq('id', data[0].id)
          console.log('🧹 Cleaned up test record')
        }
      }
    } catch (err) {
      console.log('❌ Error during test insert:', err)
    }
  }
}

// Auto-run debug on import in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    console.log('🔍 Running Supabase debug checks...')
    SupabaseDebug.checkConnection()
    SupabaseDebug.listTables()
  }, 1000)
}