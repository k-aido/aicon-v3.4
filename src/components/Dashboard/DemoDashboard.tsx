'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Copy, RefreshCw, Grid, List } from 'lucide-react';
import { demoCanvasService, type DemoCanvas } from '@/services/demoCanvasService';
import { useDemoMode } from '@/hooks/useDemoMode';

export default function DemoDashboard() {
  const router = useRouter();
  const { isDemoMode, createDemoCanvas, resetDemoData } = useDemoMode();
  const [canvases, setCanvases] = useState<DemoCanvas[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCreating, setIsCreating] = useState(false);

  // Load canvases on mount
  useEffect(() => {
    loadCanvases();
  }, []);

  const loadCanvases = async () => {
    setIsLoading(true);
    try {
      const data = await demoCanvasService.getAllCanvases();
      setCanvases(data);
    } catch (error) {
      console.error('Error loading canvases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCanvas = async () => {
    setIsCreating(true);
    try {
      const canvasId = await createDemoCanvas();
      if (canvasId) {
        // Canvas creation redirects automatically
      }
    } catch (error) {
      console.error('Error creating canvas:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCanvas = async (canvasId: string) => {
    if (!confirm('Are you sure you want to delete this canvas?')) return;
    
    const success = await demoCanvasService.deleteCanvas(canvasId);
    if (success) {
      await loadCanvases();
    }
  };

  const handleDuplicateCanvas = async (canvasId: string, title: string) => {
    const newId = await demoCanvasService.duplicateCanvas(canvasId, `${title} (Copy)`);
    if (newId) {
      await loadCanvases();
    }
  };

  const handleResetDemo = async () => {
    if (!confirm('This will delete all canvases except the main demo. Continue?')) return;
    
    const success = await resetDemoData();
    if (success) {
      await loadCanvases();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isDemoMode) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Demo Mode Required</h1>
          <p className="text-gray-600 mb-8">
            This dashboard is optimized for demo mode. Add ?demo=true to the URL to enable it.
          </p>
          <button
            onClick={() => window.location.href = '/?demo=true'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Enable Demo Mode
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AICON Demo Mode</h1>
              <p className="text-sm text-gray-500 mt-1">
                Create unlimited canvases for testing and development
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleResetDemo}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="Reset all demo data"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Demo
              </button>
              <button
                onClick={handleCreateCanvas}
                disabled={isCreating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
                {isCreating ? 'Creating...' : 'New Canvas'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              {canvases.length} {canvases.length === 1 ? 'canvas' : 'canvases'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              title="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && canvases.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No canvases yet</h3>
            <p className="text-gray-500 mb-6">Create your first canvas to get started</p>
            <button
              onClick={handleCreateCanvas}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Canvas
            </button>
          </div>
        )}

        {/* Canvas Grid */}
        {!isLoading && canvases.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {canvases.map((canvas) => (
              <div
                key={canvas.id}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => router.push(`/canvas/${canvas.id}`)}
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                    {canvas.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {canvas.elementCount} elements
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {formatDate(canvas.updatedAt)}
                    </span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateCanvas(canvas.id, canvas.title);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCanvas(canvas.id);
                        }}
                        className="p-1 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Canvas List */}
        {!isLoading && canvases.length > 0 && viewMode === 'list' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Elements
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Modified
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {canvases.map((canvas) => (
                  <tr
                    key={canvas.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/canvas/${canvas.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {canvas.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {canvas.elementCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(canvas.updatedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateCanvas(canvas.id, canvas.title);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCanvas(canvas.id);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}