#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAccountsAndUsers() {
  console.log('=== Checking Accounts and Users ===\n');
  
  // Check accounts
  console.log('Accounts:');
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('*')
    .limit(10);
  
  if (accountsError) {
    console.error('Error fetching accounts:', accountsError.message);
  } else {
    console.log('Found', accounts.length, 'accounts');
    accounts.forEach(account => {
      console.log(`- ID: ${account.id}, Name: ${account.name}`);
    });
  }
  
  // Check users
  console.log('\nUsers:');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(10);
  
  if (usersError) {
    console.error('Error fetching users:', usersError.message);
  } else {
    console.log('Found', users.length, 'users');
    users.forEach(user => {
      console.log(`- ID: ${user.id}, Email: ${user.email}, Account ID: ${user.account_id}`);
    });
  }
  
  // Check auth users
  console.log('\nAuth Users (from auth.users):');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('Error fetching auth users:', authError.message);
  } else {
    console.log('Found', authUsers.users.length, 'auth users');
    authUsers.users.forEach(user => {
      console.log(`- ID: ${user.id}, Email: ${user.email}`);
    });
  }
}

checkAccountsAndUsers().catch(console.error);