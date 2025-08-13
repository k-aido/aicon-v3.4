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
      
      // Ensure user has all necessary database records
      try {
        console.log('Ensuring user database records exist...');
        const setupResponse = await fetch('/api/auth/setup-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: data.user.id,
            email: data.user.email || email
          })
        });
        
        if (!setupResponse.ok) {
          const setupError = await setupResponse.json();
          console.error('Failed to ensure user records:', setupError);
        }
      } catch (setupError) {
        console.error('Error ensuring user records:', setupError);
      }
      
      // Check if email is verified (skip in development)
      const isDev = process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost';
      if (!isDev && !data.user.email_confirmed_at) {
        console.log('Email not verified, redirecting to verification page');
        localStorage.setItem('pendingVerificationEmail', data.user.email || '');
        window.location.href = '/verify-email';
        return { error };
      }
      
      // Check if user profile is complete before redirecting
      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, social_media_handles')
          .eq('user_id', data.user.id)
          .single();
        
        if (profileError) {
          console.log('Profile query error:', profileError);
          window.location.href = '/onboarding';
          return { error };
        }
        
        console.log('Profile check for user:', data.user.email, profile);
        
        // Check if profile is incomplete
        const hasName = profile?.first_name && profile?.last_name;
        const hasSocialMedia = profile?.social_media_handles && 
          typeof profile.social_media_handles === 'object' &&
          profile.social_media_handles !== null &&
          Object.values(profile.social_media_handles).some(handle => 
            typeof handle === 'string' && handle.trim() !== ''
          );
        
        console.log('Profile validation:', { hasName, hasSocialMedia, socialHandles: profile?.social_media_handles });
        
        if (!hasName || !hasSocialMedia) {
          console.log('Profile incomplete, redirecting to onboarding');
          window.location.href = '/onboarding';
          return { error };
        }
        
        console.log('Profile complete, redirecting to canvas');
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
      // Set up all necessary database records for the new user
      try {
        console.log('Setting up user database records...');
        const setupResponse = await fetch('/api/auth/setup-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: data.user.id,
            email: data.user.email || email
          })
        });
        
        if (!setupResponse.ok) {
          const setupError = await setupResponse.json();
          console.error('Failed to setup user records:', setupError);
        } else {
          console.log('User database records created successfully');
        }
      } catch (setupError) {
        console.error('Error setting up user records:', setupError);
      }
      
      // DEV ONLY: Auto-confirm email and sign in for localhost development
      const isDev = process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost';
      if (isDev) {
        console.warn('DEV ONLY: Auto-confirming email and signing in for localhost development');
        try {
          // Call our API route to confirm the email server-side
          await fetch('/api/dev/confirm-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id })
          });
          
          // Wait a moment for the email confirmation to process
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Now sign in the user automatically to get a proper session
          console.log('DEV: Automatically signing in after signup...');
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (signInError) {
            console.error('Dev auto sign-in failed:', signInError);
          } else if (signInData.session) {
            console.log('DEV: Auto sign-in successful, session established');
            setSession(signInData.session);
            setUser(signInData.session.user);
            
            // Force set cookies manually for middleware access
            const cookieName = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
            const cookieValue = JSON.stringify(signInData.session);
            document.cookie = `${cookieName}=${cookieValue}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
            console.log('Manually set auth cookie with session:', cookieName);
          }
        } catch (confirmError) {
          console.error('Dev email confirmation failed:', confirmError);
        }
        
        // In dev mode, go directly to onboarding
        window.location.href = '/onboarding';
      } else {
        // Production mode: Store email and redirect to verification page
        localStorage.setItem('pendingVerificationEmail', email);
        console.log('Email verification required, redirecting to verification page');
        window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
        
        // Update auth state if we have a session (unlikely in production before email verification)
        if (data.session) {
          setSession(data.session);
          setUser(data.user);
          
          // Force set cookies manually for middleware access
          const cookieName = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
          const cookieValue = JSON.stringify(data.session);
          document.cookie = `${cookieName}=${cookieValue}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
          console.log('Manually set auth cookie:', cookieName);
        }
      }
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