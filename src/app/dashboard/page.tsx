'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Sprout, Search, Home, Star } from 'lucide-react';
import { canvasPersistence } from '@/services/canvasPersistence';
import { createBrowserClient } from '@/lib/supabase/client';

interface CanvasPreview {
  id: string;
  title: string;
  author: string;
  lastModified: string;
  color: string;
  icon: 'user' | 'plant' | 'search';
  elementCount: number;
  isStarred?: boolean;
}

// Mock canvas data with different icons and colors
const mockCanvases: CanvasPreview[] = [
  {
    id: 'canvas-1',
    title: 'Project ICON',
    author: 'Kevin',
    lastModified: 'Yesterday',
    color: 'bg-purple-200',
    icon: 'user',
    elementCount: 5,
    isStarred: true
  },
  {
    id: 'canvas-2',
    title: 'Project Poppy',
    author: 'Kevin',
    lastModified: 'Jul 25',
    color: 'bg-green-200',
    icon: 'plant',
    elementCount: 5,
    isStarred: false
  },
  {
    id: 'canvas-3',
    title: '8020x Fundamental Proce...',
    author: 'Kevin',
    lastModified: 'Aug 1',
    color: 'bg-orange-200',
    icon: 'search',
    elementCount: 5,
    isStarred: true
  }
];

const CanvasCard: React.FC<{
  canvas: CanvasPreview;
  onClick: (id: string) => void;
}> = ({ canvas, onClick }) => {
  const IconComponent = canvas.icon === 'user' ? User : 
                       canvas.icon === 'plant' ? Sprout : 
                       Search;

  return (
    <div 
      onClick={() => onClick(canvas.id)}
      className="cursor-pointer transition-transform hover:scale-105"
    >
      <div className={`${canvas.color} rounded-2xl p-6 h-64 relative overflow-hidden`}>
        {/* Canvas preview area */}
        <div className="bg-white rounded-lg h-40 p-4 mb-4">
          <div className="grid grid-cols-3 gap-2">
            {/* Mock element placeholders */}
            {[...Array(canvas.elementCount)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded h-10"></div>
            ))}
          </div>
        </div>
        
        {/* Icon */}
        <div className="absolute bottom-4 left-6">
          <IconComponent className="w-6 h-6 text-gray-700" />
        </div>
      </div>
      
      {/* Canvas info */}
      <div className="mt-3">
        <h3 className="font-medium text-gray-900">{canvas.title}</h3>
        <p className="text-sm text-gray-500">{canvas.lastModified} by {canvas.author}</p>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [canvases, setCanvases] = useState<CanvasPreview[]>(mockCanvases);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'starred'>('home');
  
  const supabase = createBrowserClient();

  // Load canvases function
  const loadCanvases = async (userIdToLoad: string) => {
    try {
      setIsLoading(true);
      console.log('[Dashboard] Loading canvases for user:', userIdToLoad);
      
      const workspaces = await canvasPersistence.getUserWorkspaces(userIdToLoad);
      console.log('[Dashboard] Loaded workspaces:', workspaces);
      
      // Convert workspaces to CanvasPreview format
      const canvasPreviews: CanvasPreview[] = workspaces.map((workspace, index) => ({
        id: workspace.id,
        title: workspace.title,
        author: 'You', // Show current user as author
        lastModified: new Date(workspace.last_accessed || workspace.updated_at).toLocaleDateString(),
        color: ['bg-purple-200', 'bg-green-200', 'bg-orange-200'][index % 3],
        icon: ['user', 'plant', 'search'][index % 3] as 'user' | 'plant' | 'search',
        elementCount: 0, // Could be calculated from canvas_data
        isStarred: false
      }));
      
      setCanvases(canvasPreviews);
    } catch (error) {
      console.error('[Dashboard] Error loading canvases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get current user and load canvases
  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserId(user.id);
          // Load the authenticated user's canvases
          await loadCanvases(user.id);
        } else {
          // If no user, redirect to login
          router.push('/login');
        }
      } catch (error) {
        console.error('[Dashboard] Error initializing:', error);
      }
    };
    initialize();
  }, []);

  const handleCanvasClick = (canvasId: string) => {
    router.push(`/canvas/${canvasId}`);
  };

  const createNewCanvas = async () => {
    try {
      if (!userId) {
        console.error('[Dashboard] No user ID available');
        router.push('/login');
        return;
      }

      // Show loading state
      setIsLoading(true);

      // Skip connection test for now - let the API handle connection issues
      console.log('[Dashboard] Skipping connection test, proceeding with canvas creation...');
      
      // Use authenticated user ID
      console.log('[Dashboard] Creating canvas for user:', userId);
      console.log('[Dashboard] User email:', (await supabase.auth.getUser()).data.user?.email);
      
      const canvas = await canvasPersistence.createWorkspace(
        userId,
        `New Canvas ${new Date().toLocaleDateString()}`
      );
      
      if (canvas) {
        console.log('[Dashboard] Canvas created successfully:', canvas.id);
        // Reload canvases to show the new one
        await loadCanvases(userId);
        // Navigate to the new canvas
        router.push(`/canvas/${canvas.id}`);
      } else {
        console.error('[Dashboard] Canvas creation returned null');
        alert('Failed to create canvas. This might be due to:\n\n1. Missing user account records\n2. Database permissions\n3. Invalid session\n\nPlease try logging out and back in.');
      }
    } catch (error: any) {
      console.error('[Dashboard] Error creating canvas:', error);
      console.error('[Dashboard] Error stack:', error.stack);
      
      if (error.message?.includes('401') || error.message?.includes('Authentication')) {
        alert('Your session may have expired. Please sign in again.');
        router.push('/login');
      } else if (error.message?.includes('server configuration')) {
        alert('Server configuration error. The SUPABASE_SERVICE_ROLE_KEY may be missing.');
      } else {
        alert(`Error creating canvas: ${error.message || 'Unknown error'}\n\nCheck the browser console for more details.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab('home')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'home' 
                ? 'bg-gray-100 text-gray-900' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">Home</span>
          </button>
          
          <button
            onClick={() => setActiveTab('starred')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'starred' 
                ? 'bg-gray-100 text-gray-900' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Star className="w-5 h-5" />
            <span className="font-medium">Starred</span>
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-8 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {canvases
              .filter(canvas => activeTab === 'home' || (activeTab === 'starred' && canvas.isStarred))
              .map((canvas) => (
                <CanvasCard
                  key={canvas.id}
                  canvas={canvas}
                  onClick={handleCanvasClick}
                />
              ))}
            
            {/* Add new canvas card */}
            <div 
              onClick={isLoading ? undefined : createNewCanvas}
              className={`${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer transition-transform hover:scale-105'}`}
            >
              <div className={`bg-gray-100 border-2 border-dashed border-gray-300 rounded-2xl h-64 flex items-center justify-center transition-colors ${!isLoading ? 'hover:border-gray-400' : ''}`}>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500"></div>
                    ) : (
                      <span className="text-2xl text-gray-500">+</span>
                    )}
                  </div>
                  <p className="text-gray-600 font-medium">
                    {isLoading ? 'Creating...' : 'Create New Canvas'}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <h3 className="font-medium text-gray-400">New Canvas</h3>
                <p className="text-sm text-gray-400">
                  {isLoading ? 'Please wait...' : 'Click to create'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}