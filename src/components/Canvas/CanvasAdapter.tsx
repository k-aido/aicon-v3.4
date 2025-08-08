import React from 'react';
import { CanvasWorkspace } from './CanvasWorkspace';

interface CanvasAdapterProps {
  canvasId: string;
}

/**
 * Adapter component that bridges between the numeric ID store and string ID CanvasWorkspace
 */
export const CanvasAdapter: React.FC<CanvasAdapterProps> = ({ canvasId }) => {
  // Handle state changes from CanvasWorkspace
  const handleStateChange = (state: any) => {
    console.log('[CanvasAdapter] handleStateChange called');
    console.log('[CanvasAdapter] State received:', {
      elementCount: state.elements ? Object.keys(state.elements).length : 0
    });
    // For now, don't sync back to store - let CanvasWorkspace manage its own state
  };

  return (
    <CanvasWorkspace
      workspaceId={canvasId}
      initialState={{
        elements: {},
        connections: [],
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