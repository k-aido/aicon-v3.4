/**
 * Environment Variable Checker
 * 
 * Validates required environment variables and provides helpful error messages
 */

interface EnvCheckResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
  errors: string[];
}

export function checkEnvironmentVariables(): EnvCheckResult {
  const result: EnvCheckResult = {
    valid: true,
    missing: [],
    warnings: [],
    errors: []
  };

  // Required variables
  const required = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  };

  // Optional but recommended
  const optional = {
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
    NEXT_PUBLIC_DEMO_ACCOUNT_ID: process.env.NEXT_PUBLIC_DEMO_ACCOUNT_ID,
    NEXT_PUBLIC_DEMO_USER_ID: process.env.NEXT_PUBLIC_DEMO_USER_ID
  };

  // Check required variables
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      result.valid = false;
      result.missing.push(key);
      result.errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // Validate Supabase URL format
  if (required.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const url = new URL(required.NEXT_PUBLIC_SUPABASE_URL);
      if (!url.hostname.includes('supabase.co')) {
        result.warnings.push('SUPABASE_URL does not appear to be a Supabase URL');
      }
    } catch (error) {
      result.valid = false;
      result.errors.push('Invalid SUPABASE_URL format. Expected: https://your-project.supabase.co');
    }
  }

  // Validate anon key
  if (required.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (required.NEXT_PUBLIC_SUPABASE_ANON_KEY.length < 30) {
      result.valid = false;
      result.errors.push('SUPABASE_ANON_KEY appears to be invalid (too short)');
    }
    if (required.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'your-anon-key-here') {
      result.valid = false;
      result.errors.push('SUPABASE_ANON_KEY has not been updated from the example value');
    }
  }

  // Check optional variables
  for (const [key, value] of Object.entries(optional)) {
    if (!value && key.includes('DEMO')) {
      result.warnings.push(`Optional variable ${key} not set. Demo mode may not work correctly.`);
    }
  }

  return result;
}

/**
 * Log environment check results
 */
export function logEnvironmentCheck(): void {
  const check = checkEnvironmentVariables();

  if (check.valid) {
    console.log('✅ Environment variables are properly configured');
    return;
  }

  console.group('❌ Environment Configuration Issues');
  
  if (check.missing.length > 0) {
    console.error('Missing required variables:', check.missing.join(', '));
  }
  
  if (check.errors.length > 0) {
    console.error('Errors:');
    check.errors.forEach(error => console.error(`  - ${error}`));
  }
  
  if (check.warnings.length > 0) {
    console.warn('Warnings:');
    check.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  console.log('\n📋 To fix this:');
  console.log('1. Copy .env.local.example to .env.local');
  console.log('   cp .env.local.example .env.local');
  console.log('2. Get your Supabase credentials from:');
  console.log('   https://app.supabase.com/project/YOUR_PROJECT/settings/api');
  console.log('3. Update the values in .env.local');
  console.log('4. Restart your development server');
  
  console.groupEnd();
}

/**
 * Get safe environment values with fallbacks
 */
export function getSafeEnvValues() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    isDemoMode: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
    demoAccountId: process.env.NEXT_PUBLIC_DEMO_ACCOUNT_ID || '550e8400-e29b-41d4-a716-446655440001',
    demoUserId: process.env.NEXT_PUBLIC_DEMO_USER_ID || '550e8400-e29b-41d4-a716-446655440002',
    demoProjectId: process.env.NEXT_PUBLIC_DEMO_PROJECT_ID || '550e8400-e29b-41d4-a716-446655440003'
  };
}