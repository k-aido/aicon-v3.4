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

async function checkProjectsStructure() {
  try {
    console.log('📋 Getting projects table structure...')
    
    // Just select all columns to see what's available
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(5)
    
    if (projectsError) {
      console.error('❌ Failed to get projects:', projectsError)
      return
    }
    
    console.log('✅ Projects table data:')
    if (projects.length === 0) {
      console.log('📝 No projects found - table is empty')
      
      // Create a demo project
      console.log('🔧 Creating a demo project...')
      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert([{
          id: process.env.NEXT_PUBLIC_DEMO_PROJECT_ID,
          created_by_user_id: process.env.NEXT_PUBLIC_DEMO_USER_ID
        }])
        .select()
      
      if (createError) {
        console.error('❌ Failed to create project:', createError)
        
        // Try without specifying ID (let it auto-generate)
        console.log('🔧 Trying without specifying ID...')
        const { data: newProject2, error: createError2 } = await supabase
          .from('projects')
          .insert([{
            created_by_user_id: process.env.NEXT_PUBLIC_DEMO_USER_ID
          }])
          .select()
        
        if (createError2) {
          console.error('❌ Still failed:', createError2.message)
        } else {
          console.log('✅ Created project:', newProject2[0])
          return newProject2[0].id
        }
      } else {
        console.log('✅ Created project:', newProject[0])
        return newProject[0].id
      }
    } else {
      console.log('📊 Available projects:')
      projects.forEach((project, index) => {
        console.log(`${index + 1}.`, JSON.stringify(project, null, 2))
      })
      return projects[0].id
    }
    
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

checkProjectsStructure().then(projectId => {
  if (projectId) {
    console.log(`\n🔧 Update .env.local with: NEXT_PUBLIC_DEMO_PROJECT_ID=${projectId}`)
  }
})