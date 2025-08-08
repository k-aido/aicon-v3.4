#!/usr/bin/env node

// Script to check the actual schema of the projects table
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  console.log('=== Checking Projects Table Schema ===\n');
  
  // Get one record to see the actual columns
  console.log('Fetching a sample project to see actual columns...');
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching project:', error);
    return;
  }
  
  if (data && data.length > 0) {
    const project = data[0];
    console.log('\nActual columns in projects table:');
    console.log('================================');
    
    Object.keys(project).forEach(key => {
      const value = project[key];
      const type = typeof value;
      console.log(`- ${key}: ${type} ${value === null ? '(null)' : ''}`);
      if (key === 'canvas_data' && value) {
        console.log(`  Structure: ${JSON.stringify(Object.keys(value))}`);
      }
    });
    
    console.log('\nFull sample record:');
    console.log(JSON.stringify(project, null, 2));
  } else {
    console.log('No projects found in database');
  }
}

checkSchema().catch(console.error);