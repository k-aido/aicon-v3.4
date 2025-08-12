'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { User, Sprout, Search, Home, Clock, Star, Trash2 } from 'lucide-react';
import { canvasPersistence, CanvasPersistenceService } from '@/services/canvasPersistence';
import { createBrowserClient } from '../../lib/supabase/client';

interface CanvasPreview {
  id: string;
  title: string;
  author: string;
  lastModified: string;
  color: string;
  icon: 'user' | 'plant' | 'search';
  elementCount: number;
  isStarred?: boolean;
  is_starred?: boolean;
  starred_at?: string | null;
  last_accessed_at?: string;
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
  onDelete: (id: string, title: string) => void;
  onToggleStar: (id: string, currentStarred: boolean) => void;
}> = ({ canvas, onClick, onDelete, onToggleStar }) => {
  const IconComponent = canvas.icon === 'user' ? User : 
                       canvas.icon === 'plant' ? Sprout : 
                       Search;

  return (
    <div 
      onClick={() => onClick(canvas.id)}
      className="cursor-pointer transition-transform hover:scale-105"
    >
      <div className={`${canvas.color} rounded-2xl p-6 h-64 relative overflow-hidden group`}>
        {/* Star button */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent navigation to canvas
            e.preventDefault();
            onToggleStar(canvas.id, canvas.is_starred || false);
          }}
          className={`absolute top-2 right-2 p-2 rounded-lg transition-all z-10 ${
            canvas.is_starred 
              ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100' 
              : 'text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-600'
          }`}
          title={canvas.is_starred ? 'Unstar canvas' : 'Star canvas'}
        >
          <svg 
            className="w-5 h-5" 
            fill={canvas.is_starred ? 'currentColor' : 'none'} 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
            />
          </svg>
        </button>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent navigation to canvas
            onDelete(canvas.id, canvas.title);
          }}
          className="absolute bottom-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-lg z-10"
          title="Delete canvas"
        >
          <Trash2 className="w-4 h-4" />
        </button>

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
  const [canvases, setCanvases] = useState<CanvasPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [isInitializing, setIsInitializing] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<'all' | 'starred'>('all');
  
  const supabase = createBrowserClient();

  // Filtered canvases based on current filter
  const filteredCanvases = useMemo(() => {
    if (currentFilter === 'starred') {
      return canvases.filter(canvas => canvas.is_starred === true);
    }
    return canvases; // Show all for 'all' filter
  }, [canvases, currentFilter]);

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
        isStarred: workspace.is_starred || false,
        is_starred: workspace.is_starred || false,
        starred_at: workspace.starred_at || null,
        last_accessed_at: workspace.last_accessed_at || workspace.updated_at
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
    const checkAuth = async () => {
      try {
        console.log('[Dashboard] Starting auth check...');
        setIsInitializing(true);
        
        // First get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('[Dashboard] Session check result:', {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
          sessionError
        });
        
        if (sessionError || !session) {
          console.error('[Dashboard] No session found:', sessionError);
          router.push('/login');
          return;
        }
        
        console.log('[Dashboard] Session found:', session.user.id);
        setUserId(session.user.id);
        setIsAuthenticated(true);
        
        // Now load canvases with the authenticated user ID
        await loadCanvases(session.user.id);
      } catch (error) {
        console.error('[Dashboard] Auth check error:', error);
        router.push('/login');
      } finally {
        setIsInitializing(false);
      }
    };
    
    checkAuth();
  }, [router]);

  const handleCanvasClick = (canvasId: string) => {
    router.push(`/canvas/${canvasId}`);
  };

  const handleDeleteCanvas = async (canvasId: string, canvasTitle: string) => {
    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete "${canvasTitle}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      setIsLoading(true);
      console.log('[Dashboard] Deleting canvas:', canvasId);
      
      const success = await canvasPersistence.deleteWorkspace(canvasId);
      
      if (success) {
        // Remove canvas from state
        setCanvases(prevCanvases => 
          prevCanvases.filter(canvas => canvas.id !== canvasId)
        );
        
        // Show success message
        console.log('[Dashboard] Canvas deleted successfully:', canvasTitle);
      } else {
        console.error('[Dashboard] Failed to delete canvas:', canvasId);
        alert('Failed to delete canvas. Please try again.');
      }
    } catch (error) {
      console.error('[Dashboard] Error deleting canvas:', error);
      alert('An error occurred while deleting the canvas.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStar = async (canvasId: string, currentStarred: boolean) => {
    try {
      const persistenceService = CanvasPersistenceService.getInstance();
      const success = await persistenceService.toggleStarWorkspace(canvasId, !currentStarred);
      
      if (success) {
        // Update local state
        setCanvases(prevCanvases => 
          prevCanvases.map(canvas => 
            canvas.id === canvasId 
              ? { ...canvas, is_starred: !currentStarred, starred_at: !currentStarred ? new Date().toISOString() : null }
              : canvas
          ).sort((a, b) => {
            // Sort starred items first
            if (a.is_starred && !b.is_starred) return -1;
            if (!a.is_starred && b.is_starred) return 1;
            // Then by last_accessed_at
            return new Date(b.last_accessed_at || 0).getTime() - new Date(a.last_accessed_at || 0).getTime();
          })
        );
      } else {
        alert('Failed to update star status. Please try again.');
      }
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const createNewCanvas = async () => {
    try {
      if (!userId || !isAuthenticated) {
        console.error('[Dashboard] No authenticated user available');
        router.push('/login');
        return;
      }

      // Show loading state for canvas creation only
      setIsLoading(true);

      // Verify session is still valid before creating canvas
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[Dashboard] Session expired during canvas creation');
        router.push('/login');
        return;
      }
      
      // Use authenticated user ID
      console.log('[Dashboard] Creating canvas for user:', userId);
      console.log('[Dashboard] User email:', session.user?.email);
      
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

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <nav className="space-y-1">
          <button
            onClick={() => setCurrentFilter('all')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentFilter === 'all' 
                ? 'bg-gray-100 text-gray-900' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">Home</span>
          </button>
          
          <button
            onClick={() => setCurrentFilter('starred')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentFilter === 'starred' 
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
            {isLoading ? (
              // Loading skeleton
              [...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-300 rounded-2xl h-64 mb-3"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              ))
            ) : (
              filteredCanvases.map((canvas) => (
                <CanvasCard
                  key={canvas.id}
                  canvas={canvas}
                  onClick={handleCanvasClick}
                  onDelete={handleDeleteCanvas}
                  onToggleStar={handleToggleStar}
                />
              ))
            )}
            
            {/* Show empty state for starred filter when no starred canvases */}
            {currentFilter === 'starred' && filteredCanvases.length === 0 && !isLoading && (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Star className="w-16 h-16 mx-auto mb-4" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No starred canvases yet</h3>
                <p className="text-gray-500 mb-6">Star your important canvases to see them here!</p>
              </div>
            )}
            
            {/* Show empty state only if not loading and no canvases at all */}
            {!isLoading && canvases.length === 0 && currentFilter === 'all' && (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No canvases yet</h3>
                <p className="text-gray-500 mb-6">Create your first canvas to get started</p>
              </div>
            )}
            
            {/* Add new canvas card - only show when not loading */}
            {!isLoading && (
              <div 
                onClick={createNewCanvas}
                className="cursor-pointer transition-transform hover:scale-105"
              >
                <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-2xl h-64 flex items-center justify-center hover:border-gray-400 transition-colors">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl text-gray-500">+</span>
                    </div>
                    <p className="text-gray-600 font-medium">Create New Canvas</p>
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="font-medium text-gray-400">New Canvas</h3>
                  <p className="text-sm text-gray-400">Click to create</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}