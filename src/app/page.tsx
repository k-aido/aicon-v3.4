'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Plus, LogIn, Grid, Zap, Users, Shield } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const handleCreateCanvas = () => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  const handleViewCanvases = () => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">AICON Canvas</h1>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    My Canvases
                  </button>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      router.push('/login');
                    }}
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => router.push('/login')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Create and Connect Your
            <span className="block text-blue-600">Content Canvas</span>
          </h2>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Build interactive workspaces to organize, analyze, and connect your digital content with AI-powered insights.
          </p>
          <div className="mt-10 flex justify-center space-x-4">
            <button
              onClick={handleCreateCanvas}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Canvas
            </button>
            {isAuthenticated && (
              <button
                onClick={handleViewCanvases}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all"
              >
                <Grid className="w-5 h-5 mr-2" />
                View My Canvases
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">AI-Powered Analysis</h3>
            <p className="mt-2 text-base text-gray-500">
              Automatically analyze and extract insights from your content using advanced AI.
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Collaborative Workspaces</h3>
            <p className="mt-2 text-base text-gray-500">
              Share and collaborate on canvases with your team in real-time.
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Secure & Private</h3>
            <p className="mt-2 text-base text-gray-500">
              Your canvases are private by default and securely stored in the cloud.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}