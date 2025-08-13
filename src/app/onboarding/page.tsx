'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@supabase/supabase-js';
import { Loader2, Save, User, CreditCard, Link as LinkIcon } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SocialHandles {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  twitter?: string;
  youtube?: string;
  linkedin?: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  social_media_handles: SocialHandles;
  created_at: string;
  updated_at: string;
  email?: string; // Added for dev mode
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [socialHandles, setSocialHandles] = useState<SocialHandles>({});

  useEffect(() => {
    if (user) {
      loadProfile();
    } else {
      // Wait a bit for the auth state to initialize
      const timer = setTimeout(() => {
        if (!user) {
          // In development mode, if no user but we're on onboarding, try to get the latest user as fallback
          if (process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost') {
            console.log('DEV MODE: No user session found after waiting, loading latest user for onboarding');
            loadLatestUserProfile();
          } else {
            setLoading(false);
            setError('No user session found. Please log in.');
          }
        }
      }, 2000); // Wait 2 seconds for auth to initialize
      
      return () => clearTimeout(timer);
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        setError('Failed to load profile data');
      } else if (data) {
        setProfile(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setSocialHandles(data.social_media_handles || {});
      }
    } catch (err) {
      console.error('Profile loading error:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  // DEV ONLY: Load the most recent user profile for onboarding
  const loadLatestUserProfile = async () => {
    try {
      // Use our dev API that bypasses RLS
      const response = await fetch('/api/dev/latest-profile');
      const result = await response.json();

      if (!response.ok) {
        console.error('Error loading latest profile:', result.error);
        setError(`Failed to load profile data: ${result.error}`);
      } else if (result.profile) {
        console.log('DEV MODE: Loaded latest user profile:', result.profile.user_id);
        setProfile(result.profile);
        setFirstName(result.profile.first_name || '');
        setLastName(result.profile.last_name || '');
        setSocialHandles(result.profile.social_media_handles || {});
      } else {
        console.log('DEV MODE: No profiles found, creating empty form');
        // Allow the user to fill out the form anyway - we'll create a profile later
        setProfile({
          id: 'temp',
          user_id: 'temp',
          first_name: '',
          last_name: '',
          social_media_handles: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Latest profile loading error:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialChange = (platform: keyof SocialHandles, value: string) => {
    setSocialHandles(prev => ({
      ...prev,
      [platform]: value
    }));
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Prefer using authenticated user session if available
      if (user) {
        // Use regular Supabase client with authenticated user
        const { error } = await supabase
          .from('user_profiles')
          .update({
            first_name: firstName,
            last_name: lastName,
            social_media_handles: socialHandles,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating profile:', error);
          setError('Failed to update profile');
        } else {
          setSuccess(true);
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 2000);
        }
      } else if (process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost') {
        // Fallback to dev API only if no session in dev mode
        console.log('DEV MODE: Using dev API to update profile (no session available)');
        const response = await fetch('/api/dev/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: profile.user_id,
            firstName,
            lastName,
            socialHandles
          })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          console.error('Error updating profile:', result.error);
          setError('Failed to update profile');
        } else {
          setSuccess(true);
          // Redirect to canvas after successful profile setup
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 2000);
        }
      } else {
        // Production mode without session - shouldn't happen
        setError('No user session found. Please log in.');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Welcome to Aicon! 🎉</h1>
            <p className="mt-1 text-sm text-gray-600">
              Let's set up your profile to get started with AI-powered content creation
            </p>
          </div>

          <div className="p-6 space-y-8">
            {/* Personal Information Section */}
            <div>
              <div className="flex items-center mb-4">
                <User className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your first name"
                  />
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your last name"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || profile?.email || ''}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                </div>
              </div>
            </div>

            {/* Social Media Links Section */}
            <div>
              <div className="flex items-center mb-4">
                <LinkIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Social Media Links</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="instagram" className="block text-sm font-medium text-gray-700">
                    Instagram
                  </label>
                  <input
                    type="text"
                    id="instagram"
                    value={socialHandles.instagram || ''}
                    onChange={(e) => handleSocialChange('instagram', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="@username"
                  />
                </div>
                
                <div>
                  <label htmlFor="tiktok" className="block text-sm font-medium text-gray-700">
                    TikTok
                  </label>
                  <input
                    type="text"
                    id="tiktok"
                    value={socialHandles.tiktok || ''}
                    onChange={(e) => handleSocialChange('tiktok', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="@username"
                  />
                </div>
                
                <div>
                  <label htmlFor="youtube" className="block text-sm font-medium text-gray-700">
                    YouTube
                  </label>
                  <input
                    type="text"
                    id="youtube"
                    value={socialHandles.youtube || ''}
                    onChange={(e) => handleSocialChange('youtube', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="@channelname"
                  />
                </div>
                
                <div>
                  <label htmlFor="twitter" className="block text-sm font-medium text-gray-700">
                    X (Twitter)
                  </label>
                  <input
                    type="text"
                    id="twitter"
                    value={socialHandles.twitter || ''}
                    onChange={(e) => handleSocialChange('twitter', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="@username"
                  />
                </div>
                
                <div>
                  <label htmlFor="facebook" className="block text-sm font-medium text-gray-700">
                    Facebook
                  </label>
                  <input
                    type="text"
                    id="facebook"
                    value={socialHandles.facebook || ''}
                    onChange={(e) => handleSocialChange('facebook', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="facebook.com/username"
                  />
                </div>
                
                <div>
                  <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700">
                    LinkedIn
                  </label>
                  <input
                    type="text"
                    id="linkedin"
                    value={socialHandles.linkedin || ''}
                    onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="linkedin.com/in/username"
                  />
                </div>
              </div>
            </div>

            {/* Billing Section */}
            <div>
              <div className="flex items-center mb-4">
                <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Billing & Subscription</h2>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Current Plan</h3>
                    <p className="text-sm text-gray-600">Free Tier</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Upgrade Plan (Coming Soon)
                  </button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end space-x-3">
              {error && (
                <div className="flex-1">
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-800">{error}</div>
                  </div>
                </div>
              )}
              
              {success && (
                <div className="flex-1">
                  <div className="rounded-md bg-green-50 p-4">
                    <div className="text-sm text-green-800">Welcome to Aicon! Redirecting you to the canvas...</div>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}