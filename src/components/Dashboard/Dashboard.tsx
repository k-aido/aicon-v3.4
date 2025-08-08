import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, LayoutGrid, List, Filter } from 'lucide-react';
import { CanvasCard } from './CanvasCard';
import { canvasPersistence } from '@/services/canvasPersistence';
import { createBrowserClient } from '@/lib/supabase/client';

interface CanvasItem {
  id: string;
  title: string;
  thumbnail?: string | null;
  lastModified: string;
  elementCount: number;
}

export const Dashboard: React.FC = () => {
  const router = useRouter();
  const [canvases, setCanvases] = useState<CanvasItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const [userId, setUserId] = useState<string | null>(null);
  
  const supabase = createBrowserClient();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.log('[Dashboard] Auth error, using demo mode:', error.message);
        }
        
        if (user) {
          setUserId(user.id);
          console.log('[Dashboard] Authenticated user:', user.id);
        } else {
          // For demo mode, use hardcoded user ID
          const demoUserId = '550e8400-e29b-41d4-a716-446655440002';
          setUserId(demoUserId);
          console.log('[Dashboard] Using demo mode with user ID:', demoUserId);
        }
      } catch (error) {
        console.error('[Dashboard] Error getting user:', error);
        // Fallback to demo mode
        const demoUserId = '550e8400-e29b-41d4-a716-446655440002';
        setUserId(demoUserId);
      }
    };
    getUser();
  }, []);

  // Load canvases
  useEffect(() => {
    if (userId) {
      loadCanvases();
    }
  }, [userId]);

  const loadCanvases = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const workspaces = await canvasPersistence.getUserWorkspaces(userId);
      
      // Get element counts for each workspace
      const canvasItems = await Promise.all(
        workspaces.map(async (workspace) => {
          const elements = await canvasPersistence.loadElements(workspace.id);
          return {
            id: workspace.id,
            title: workspace.title,
            thumbnail: null,
            lastModified: workspace.updated_at,
            elementCount: elements.length
          };
        })
      );
      
      setCanvases(canvasItems);
    } catch (error) {
      console.error('Error loading canvases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewCanvas = async () => {
    if (!userId) return;
    
    try {
      const canvas = await canvasPersistence.createWorkspace(
        userId,
        `Canvas ${new Date().toLocaleDateString()}`
      );
      
      if (canvas) {
        router.push(`/canvas/${canvas.id}`);
      }
    } catch (error) {
      console.error('Error creating canvas:', error);
    }
  };

  const handleDelete = async (canvasId: string) => {
    try {
      await canvasPersistence.deleteWorkspace(canvasId);
      await loadCanvases();
    } catch (error) {
      console.error('Error deleting canvas:', error);
    }
  };

  const handleDuplicate = async (canvasId: string) => {
    if (!userId) return;
    
    try {
      const { workspace, elements, connections } = await canvasPersistence.loadCanvas(canvasId);
      if (!workspace) return;
      
      // Create new workspace with duplicated data
      const newCanvas = await canvasPersistence.createWorkspace(
        userId,
        `${workspace.title} (Copy)`
      );
      
      if (newCanvas) {
        await canvasPersistence.saveCanvas(
          newCanvas.id,
          elements,
          connections,
          workspace.viewport
        );
        await loadCanvases();
      }
    } catch (error) {
      console.error('Error duplicating canvas:', error);
    }
  };

  const handleRename = async (canvasId: string, newTitle: string) => {
    try {
      await supabase
        .from('canvas_workspaces')
        .update({ title: newTitle })
        .eq('id', canvasId);
      
      await loadCanvases();
    } catch (error) {
      console.error('Error renaming canvas:', error);
    }
  };

  // Filter and sort canvases
  const filteredCanvases = canvases
    .filter(canvas => 
      canvas.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      } else {
        return a.title.localeCompare(b.title);
      }
    });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">AICON Canvas</h1>
            
            <button
              onClick={createNewCanvas}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Canvas
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Controls */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search canvases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-2">
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'name')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="recent">Recent</option>
                <option value="name">Name</option>
              </select>

              {/* View Mode */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${
                    viewMode === 'grid' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${
                    viewMode === 'list' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas Grid/List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading canvases...</p>
            </div>
          </div>
        ) : filteredCanvases.length === 0 ? (
          <div className="text-center py-32">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {searchQuery ? 'No canvases found' : 'No canvases yet'}
            </h3>
            <p className="text-gray-500 mb-8">
              {searchQuery 
                ? 'Try adjusting your search terms' 
                : 'Create your first canvas to get started'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={createNewCanvas}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Your First Canvas
              </button>
            )}
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }>
            {/* Create New Canvas Card (Grid View Only) */}
            {viewMode === 'grid' && (
              <button
                onClick={createNewCanvas}
                className="aspect-[4/3] bg-white rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors flex flex-col items-center justify-center gap-3 group"
              >
                <div className="w-12 h-12 bg-gray-100 group-hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
                  <Plus className="w-6 h-6 text-gray-600" />
                </div>
                <span className="text-gray-600 font-medium">Create New Canvas</span>
              </button>
            )}

            {/* Canvas Cards */}
            {filteredCanvases.map(canvas => (
              <CanvasCard
                key={canvas.id}
                {...canvas}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onRename={handleRename}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};