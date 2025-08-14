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

async function getAvailableProjects() {
  try {
    console.log('📋 Getting available projects...')
    
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, created_at')
      .limit(10)
    
    if (projectsError) {
      console.error('❌ Failed to get projects:', projectsError)
      return
    }
    
    console.log('✅ Available projects:')
    projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.id} (${project.name || 'Unnamed'})`)
    })
    
    if (projects.length > 0) {
      // Test with the first available project ID
      const testProjectId = projects[0].id
      console.log(`\n🧪 Testing chat_interfaces insert with project ID: ${testProjectId}`)
      
      const { data: insertData, error: insertError } = await supabase
        .from('chat_interfaces')
        .insert([{
          name: 'Test Chat Interface',
          position_x: 100,
          position_y: 200,
          width: 800,
          height: 600,
          project_id: testProjectId,
          created_by_user_id: process.env.NEXT_PUBLIC_DEMO_USER_ID || '550e8400-e29b-41d4-a716-446655440002',
          created_at: new Date().toISOString()
        }])
        .select()
      
      if (insertError) {
        console.error('❌ Insert failed:', insertError.message)
        console.error('Full error:', JSON.stringify(insertError, null, 2))
      } else {
        console.log('✅ Insert successful!')
        console.log('📋 Created record:', insertData[0])
        
        // Clean up
        await supabase
          .from('chat_interfaces')
          .delete()
          .eq('id', insertData[0].id)
        console.log('🧹 Test record cleaned up')
        
        console.log(`\n🔧 Solution: Use project ID "${testProjectId}" in ChatEventLogger`)
      }
    } else {
      console.log('❌ No projects found. Need to create a project first.')
      
      // Try creating a demo project
      console.log('🔧 Attempting to create demo project...')
      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert([{
          name: 'Demo Canvas',
          created_by_user_id: process.env.NEXT_PUBLIC_DEMO_USER_ID
        }])
        .select()
      
      if (createError) {
        console.error('❌ Failed to create project:', createError.message)
      } else {
        console.log('✅ Created demo project:', newProject[0])
        console.log(`🔧 Use project ID "${newProject[0].id}" in ChatEventLogger`)
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

getAvailableProjects()