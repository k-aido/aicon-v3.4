#!/usr/bin/env node

// Script to ensure demo account exists in the database
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DEMO_ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440001';
const DEMO_USER_ID = '550e8400-e29b-41d4-a716-446655440002';

async function setupDemoAccount() {
  console.log('=== Setting up Demo Account ===\n');

  // Check if demo account exists
  console.log('Checking if demo account exists...');
  const { data: existingAccount, error: checkError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', DEMO_ACCOUNT_ID)
    .single();

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error checking for account:', checkError);
    return;
  }

  if (existingAccount) {
    console.log('✓ Demo account already exists:', existingAccount.id);
  } else {
    console.log('Demo account not found. Creating...');
    
    const { data: newAccount, error: createError } = await supabase
      .from('accounts')
      .insert([{
        id: DEMO_ACCOUNT_ID,
        name: 'Demo Account',
        email: 'demo@aicon.app',
        // Add other required fields based on your schema
      }])
      .select()
      .single();

    if (createError) {
      console.error('Error creating demo account:', createError);
      console.error('Details:', createError.details);
      console.error('Hint:', createError.hint);
      return;
    }

    console.log('✓ Demo account created:', newAccount.id);
  }

  // Check if demo user exists
  console.log('\nChecking if demo user exists...');
  const { data: existingUser, error: userCheckError } = await supabase
    .from('users')
    .select('*')
    .eq('id', DEMO_USER_ID)
    .single();

  if (userCheckError && userCheckError.code !== 'PGRST116') {
    console.error('Error checking for user:', userCheckError);
    return;
  }

  if (existingUser) {
    console.log('✓ Demo user already exists:', existingUser.id);
  } else {
    console.log('Demo user not found. Creating...');
    
    // First check the users table structure
    console.log('Checking users table structure...');
    const { data: sampleUser, error: sampleError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (sampleUser && sampleUser.length > 0) {
      console.log('Users table columns:', Object.keys(sampleUser[0]));
    } else {
      console.log('No existing users found, will try with basic structure');
    }
    
    const { data: newUser, error: userCreateError } = await supabase
      .from('users')
      .insert([{
        id: DEMO_USER_ID,
        account_id: DEMO_ACCOUNT_ID,
        email: 'demo.user@aicon.app',
        username: 'demo_user',
        full_name: 'Demo User',
        role: 'admin',
        status: 'active'
      }])
      .select()
      .single();

    if (userCreateError) {
      console.error('Error creating demo user:', userCreateError);
      console.error('Details:', userCreateError.details);
      console.error('Hint:', userCreateError.hint);
      
      // Try with minimal fields
      console.log('\nTrying with minimal fields...');
      const { data: minimalUser, error: minimalError } = await supabase
        .from('users')
        .insert([{
          id: DEMO_USER_ID,
          account_id: DEMO_ACCOUNT_ID,
          email: 'demo.user@aicon.app'
        }])
        .select()
        .single();
        
      if (minimalError) {
        console.error('Minimal user creation also failed:', minimalError);
      } else {
        console.log('✓ Demo user created with minimal fields:', minimalUser.id);
      }
      
      return;
    }

    console.log('✓ Demo user created:', newUser.id);
  }

  console.log('\n=== Demo Account Setup Complete ===');
}

// Check what's in the accounts table
async function checkAccountsTable() {
  console.log('\n=== Checking Accounts Table ===');
  
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .limit(5);
  
  if (error) {
    console.error('Error fetching accounts:', error);
    return;
  }
  
  console.log(`Found ${accounts?.length || 0} accounts:`);
  accounts?.forEach(acc => {
    console.log(`- ${acc.id}: ${acc.name || acc.email || 'Unknown'}`);
  });
  
  if (accounts && accounts.length > 0) {
    console.log('\nSample account structure:');
    console.log('Columns:', Object.keys(accounts[0]));
  }
}

async function run() {
  await checkAccountsTable();
  await setupDemoAccount();
}

run().catch(console.error);