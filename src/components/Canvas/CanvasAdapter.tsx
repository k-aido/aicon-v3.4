import React, { useEffect, useState } from 'react';
import { CanvasWorkspace } from './CanvasWorkspace';
import { useCanvasStore } from '@/store/canvasStore';

interface CanvasAdapterProps {
  canvasId: string;
}

/**
 * Adapter component that bridges between the numeric ID store and string ID CanvasWorkspace
 */
export const CanvasAdapter: React.FC<CanvasAdapterProps> = ({ canvasId }) => {
  const {
    elements,
    connections,
    addElement,
    updateElement,
    deleteElement,
    addConnection,
    deleteConnection,
    loadFromDatabase,
    setWorkspaceId,
    enableAutoSave,
    workspaceId
  } = useCanvasStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load canvas on mount
  useEffect(() => {
    const loadCanvas = async () => {
      try {
        if (canvasId && canvasId !== workspaceId) {
          console.log('[CanvasAdapter] Loading canvas:', canvasId);
          const success = await loadFromDatabase(canvasId);
          if (success) {
            setWorkspaceId(canvasId);
            enableAutoSave();
          }
        }
      } catch (error) {
        console.error('[CanvasAdapter] Error loading canvas:', error);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };
    
    loadCanvas();
  }, [canvasId, workspaceId, loadFromDatabase, setWorkspaceId, enableAutoSave]);

  // Debug logging
  console.log('[CanvasAdapter] Current state:', {
    elements: elements,
    elementsType: typeof elements,
    elementsIsArray: Array.isArray(elements),
    connections: connections,
    connectionsType: typeof connections,
    connectionsIsArray: Array.isArray(connections)
  });

  // Use empty initial state - let CanvasWorkspace manage its own state
  const convertedElements = {};

  // Use empty initial state - let CanvasWorkspace manage its own state
  const convertedConnections = [];

  // Handle state changes from CanvasWorkspace
  const handleStateChange = (state: any) => {
    console.log('[CanvasAdapter] handleStateChange called');
    console.log('[CanvasAdapter] State received:', {
      elementCount: state.elements ? Object.keys(state.elements).length : 0
    });
    // For now, don't sync back to store - let CanvasWorkspace manage its own state
  };

  if (isLoading || !isInitialized) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading canvas...</p>
        </div>
      </div>
    );
  }

  return (
    <CanvasWorkspace
      workspaceId={canvasId}
      initialState={{
        elements: convertedElements,
        connections: convertedConnections,
        viewport: { x: 0, y: 0, zoom: 0.5 }
      }}
      onStateChange={handleStateChange}
      onSave={() => {
        // Save is handled by auto-save in the store
        console.log('[CanvasAdapter] Manual save triggered');
      }}
    />
  );
};