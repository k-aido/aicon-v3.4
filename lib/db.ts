import { createClient } from '@supabase/supabase-js'

// Check for environment variables with fallback warnings
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.warn('Warning: SUPABASE_URL not found in environment variables')
}
if (!supabaseServiceKey) {
  console.warn('Warning: SUPABASE_SERVICE_ROLE_KEY not found in environment variables')
}
if (!supabaseAnonKey) {
  console.warn('Warning: NEXT_PUBLIC_SUPABASE_ANON_KEY not found in environment variables')
}

// Server-side Supabase client with service role key
export const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null

// Client-side Supabase client (for use in components)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null