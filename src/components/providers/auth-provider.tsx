'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '../../../lib/supabase/client';

const supabase = createBrowserClient();


interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error && data.session && data.user) {
      // Update auth state immediately
      setSession(data.session);
      setUser(data.user);
      
      // Check if user profile is complete before redirecting
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, social_media_handles')
          .eq('user_id', data.user.id)
          .single();
        
        // Check if profile is incomplete
        const hasName = profile?.first_name && profile?.last_name;
        const hasSocialMedia = profile?.social_media_handles && 
          Object.values(profile.social_media_handles).some(handle => handle && handle.trim() !== '');
        
        if (!hasName || !hasSocialMedia) {
          console.log('Profile incomplete, redirecting to onboarding');
          window.location.href = '/onboarding';
          return { error };
        }
      } catch (profileError) {
        console.log('Error checking profile, redirecting to onboarding:', profileError);
        window.location.href = '/onboarding';
        return { error };
      }
      
      // Profile is complete, redirect to canvas
      window.location.href = '/canvas';
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (!error && data.user) {
      // DEV ONLY: Auto-confirm email for localhost development
      if (process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost') {
        console.warn('DEV ONLY: Auto-confirming email for localhost development');
        try {
          // Call our API route to confirm the email server-side
          await fetch('/api/dev/confirm-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id })
          });
          
          // Force refresh the session after email confirmation
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data: refreshedSession } = await supabase.auth.getSession();
          if (refreshedSession.session) {
            setSession(refreshedSession.session);
            setUser(refreshedSession.session.user);
          }
        } catch (confirmError) {
          console.error('Dev email confirmation failed:', confirmError);
        }
      }
      
      // Update auth state immediately
      setSession(data.session);
      setUser(data.user);
      
      // Force set cookies manually for middleware access
      if (data.session?.access_token) {
        const cookieName = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
        const cookieValue = JSON.stringify(data.session);
        document.cookie = `${cookieName}=${cookieValue}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        console.log('Manually set auth cookie:', cookieName);
      }
      
      // Redirect new signups to onboarding to complete their profile
      window.location.href = '/onboarding';
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, session, signIn, signUp, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};