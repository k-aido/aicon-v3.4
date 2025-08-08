import { createClient } from '@supabase/supabase-js'

// Create a singleton instance to avoid recreating the client
let browserClient: ReturnType<typeof createClient> | null = null

export function createBrowserClient() {
  // Return existing client if already created
  if (browserClient) {
    return browserClient
  }
  
  // Only sync cookie on actual auth state changes, not every storage read
  const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`
  
  browserClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        storageKey,
        storage: {
          getItem: (key: string) => {
            if (typeof window !== 'undefined') {
              return window.localStorage.getItem(key);
            }
            return null;
          },
          setItem: (key: string, value: string) => {
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(key, value);
              // Only set cookie when actually storing auth data
              if (key === storageKey) {
                document.cookie = `${key}=${value}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure=${window.location.protocol === 'https:'}`;
              }
            }
          },
          removeItem: (key: string) => {
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem(key);
              // Only remove cookie for auth key
              if (key === storageKey) {
                document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
              }
            }
          },
        },
      },
    }
  )
  
  return browserClient
}