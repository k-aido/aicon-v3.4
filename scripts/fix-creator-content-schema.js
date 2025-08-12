const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSchema() {
  console.log('Checking creator_content table schema...');
  
  // Check current table structure
  const { data: tableInfo, error: infoError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_name', 'creator_content')
    .eq('table_schema', 'public');
  
  if (infoError) {
    console.error('Error getting table info:', infoError);
    return;
  }
  
  console.log('Current creator_content columns:');
  tableInfo.forEach(col => console.log(`- ${col.column_name}: ${col.data_type}`));
  
  // Check if required columns exist
  const existingColumns = tableInfo.map(col => col.column_name);
  const requiredColumns = ['media_type', 'hashtags', 'mentions'];
  const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
  
  if (missingColumns.length > 0) {
    console.log('\nMissing columns:', missingColumns);
    console.log('Schema needs to be updated via database migrations.');
  } else {
    console.log('\nAll required columns exist!');
  }
  
  // Test a simple insert to see what error we get
  console.log('\nTesting creator_content insert...');
  const testData = {
    creator_id: '00000000-0000-0000-0000-000000000000', // Will fail but show us the exact error
    platform: 'instagram',
    content_url: 'https://test.com',
    media_type: 'image',
    hashtags: ['test'],
    mentions: ['@test']
  };
  
  const { data, error } = await supabase
    .from('creator_content')
    .insert(testData)
    .select();
    
  if (error) {
    console.error('Insert test error (expected):', error.message);
    console.log('Error details:', error);
  } else {
    console.log('Test insert succeeded:', data);
  }
}

fixSchema().catch(console.error);