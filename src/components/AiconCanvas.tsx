import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from './Canvas/Canvas';
import { CanvasNavigation } from './Canvas/CanvasNavigation';
import { CanvasSidebar } from './Canvas/CanvasSidebar';
import { AnalysisPanel } from './Canvas/AnalysisPanel';
import { SocialMediaModal } from './Modal/SocialMediaModal';
import { useCanvasStore } from '@/store/canvasStore';
import { ContentElement, CanvasElement as ImportedCanvasElement, Connection as ImportedConnection } from '@/types';
import { canvasPersistence } from '@/services/canvasPersistence';
import { useRouter } from 'next/navigation';

// Use store's Element type instead of imported CanvasElement
type Element = {
  id: number;
  type: 'content' | 'chat';
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  url?: string;
  platform?: string;
  thumbnail?: string;
  messages?: any[];
  conversations?: any[];
  metadata?: Record<string, any>;
  analysis?: any;
};

type Connection = {
  id: number;
  from: number;
  to: number;
};

interface AiconCanvasAppProps {
  canvasId?: string;
}

const AiconCanvasApp: React.FC<AiconCanvasAppProps> = ({ canvasId }) => {
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [connecting, setConnecting] = useState<number | null>(null);
  const [analysisPanel, setAnalysisPanel] = useState<{ isOpen: boolean; content: ContentElement | null }>({
    isOpen: false,
    content: null
  });
  const [socialMediaModal, setSocialMediaModal] = useState<{ isOpen: boolean; platform?: string }>({
    isOpen: false,
    platform: undefined
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { elements, connections, addElement, updateElement, deleteElement, addConnection, deleteConnection, canvasTitle } = useCanvasStore();
  const router = useRouter();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load canvas data if canvasId is provided
  useEffect(() => {
    const loadCanvas = async () => {
      if (canvasId && canvasId !== 'new') {
        try {
          console.log(`[AiconCanvas] Loading canvas: ${canvasId}`);
          const { workspace, elements: loadedElements, connections: loadedConnections } = await canvasPersistence.loadCanvas(canvasId);
          
          if (workspace) {
            console.log(`[AiconCanvas] Canvas loaded:`, { 
              title: workspace.title, 
              elementsCount: loadedElements.length,
              connectionsCount: loadedConnections.length 
            });
            
            // Use the store directly to avoid dependency issues
            const store = useCanvasStore.getState();
            store.setCanvasTitle(workspace.title);
            store.loadCanvasData(loadedElements, loadedConnections);
            
            // Mark that we've loaded the initial data
            setHasLoadedInitialData(true);
          } else {
            console.error('[AiconCanvas] Canvas not found:', canvasId);
            // Redirect to dashboard if canvas not found
            router.push('/dashboard');
          }
        } catch (error) {
          console.error('[AiconCanvas] Error loading canvas:', error);
        }
      } else if (canvasId === 'new') {
        // For new canvases, mark as loaded immediately
        setHasLoadedInitialData(true);
      }
      setIsLoading(false);
    };

    loadCanvas();
  }, [canvasId, router]); // Only depend on canvasId and router

  // Auto-save functionality
  const saveCanvas = useCallback(async () => {
    if (!canvasId || canvasId === 'new') {
      return;
    }
    
    // Get the latest state from the store
    const currentStore = useCanvasStore.getState();
    
    // Don't show saving status in UI, just save silently
    try {
      console.log('[AiconCanvas] Auto-saving canvas:', canvasId, 'with', currentStore.elements.length, 'elements');
      const success = await canvasPersistence.saveCanvas(
        canvasId,
        currentStore.elements,
        currentStore.connections,
        undefined, // viewport - we can add this later if needed
        currentStore.canvasTitle
      );
      
      if (success) {
        console.log('[AiconCanvas] Canvas saved successfully');
        setSaveStatus('idle');  // Go straight back to idle
        setLastSaved(new Date());
      } else {
        console.error('[AiconCanvas] Failed to save canvas');
        setSaveStatus('error');
        // Keep error status visible for longer
        if (saveStatusTimeoutRef.current) {
          clearTimeout(saveStatusTimeoutRef.current);
        }
        saveStatusTimeoutRef.current = setTimeout(() => {
          setSaveStatus('idle');
        }, 5000);
      }
    } catch (error) {
      console.error('[AiconCanvas] Error saving canvas:', error);
      setSaveStatus('error');
      // Keep error status visible for longer
      if (saveStatusTimeoutRef.current) {
        clearTimeout(saveStatusTimeoutRef.current);
      }
      saveStatusTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 5000);
    }
  }, [canvasId]);

  // Auto-save when elements, connections, or title changes
  useEffect(() => {
    // Don't autosave until we've loaded the initial data
    if (!hasLoadedInitialData) {
      console.log('[AiconCanvas] Skipping autosave - initial data not loaded yet');
      return;
    }
    
    if (!canvasId || canvasId === 'new') {
      return;
    }

    console.log('[AiconCanvas] Autosave triggered - elements:', elements.length, 'connections:', connections.length);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (2 seconds after last change)
    saveTimeoutRef.current = setTimeout(() => {
      console.log('[AiconCanvas] Executing autosave after timeout');
      saveCanvas();
    }, 2000);

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [elements, connections, canvasTitle, saveCanvas, hasLoadedInitialData]);

  // Save immediately when component unmounts and clear store
  useEffect(() => {
    return () => {
      if (canvasId && canvasId !== 'new' && hasLoadedInitialData) {
        // Save synchronously on unmount (best effort)
        const store = useCanvasStore.getState();
        canvasPersistence.saveCanvas(
          canvasId,
          store.elements,
          store.connections,
          undefined,
          store.canvasTitle
        );
      }
      
      // Clear the canvas store to prevent stale data
      const store = useCanvasStore.getState();
      store.clearCanvas();
      store.setCanvasTitle('Canvas Title');
    };
  }, [canvasId, hasLoadedInitialData]);

  // Auto-analyze content when added to canvas
  useEffect(() => {
    elements.forEach(element => {
      if (element.type === 'content' && !(element as any).metadata?.isAnalyzed && !(element as any).metadata?.isAnalyzing) {
        // Mark as analyzing
        updateElement(element.id, {
          metadata: { ...(element as any).metadata, isAnalyzing: true }
        });

        // Simulate analysis after a delay
        setTimeout(() => {
          // Randomly fail 20% of analyses for testing error states
          const shouldFail = Math.random() < 0.2;
          
          if (shouldFail) {
            // Simulate analysis failure
            updateElement(element.id, {
              metadata: { 
                ...(element as any).metadata, 
                isAnalyzing: false, 
                isAnalyzed: false,
                analysisError: 'Failed to analyze content. Network error or content unavailable.'
              }
            });
          } else {
            // Successful analysis
            const mockAnalysis = {
              id: `analysis-${Date.now()}`,
              contentId: element.id.toString(),
              summary: `This ${(element as any).platform || 'content'} piece provides valuable insights with strong engagement potential and clear messaging.`,
              keyPoints: [
                'Compelling hook that captures attention immediately',
                'Well-structured content with clear value proposition',
                'Strong call-to-action encouraging engagement',
                'Optimized for target audience engagement'
              ],
              sentiment: 'positive' as const,
              topics: [
                { name: (element as any).platform || 'Content', confidence: 0.95 },
                { name: 'Engagement', confidence: 0.8 },
                { name: 'Marketing', confidence: 0.7 }
              ],
              entities: [],
              language: 'en',
              complexity: 'moderate' as const,
              analyzedAt: new Date()
            };

            updateElement(element.id, {
              analysis: mockAnalysis,
              metadata: { 
                ...(element as any).metadata, 
                isAnalyzing: false, 
                isAnalyzed: true,
                analysisError: undefined // Clear any previous error
              }
            });
          }
        }, 2000 + Math.random() * 3000); // Random delay between 2-5 seconds
      }
    });
  }, [elements, updateElement]);

  // Convert store elements format to match Canvas component expectations
  const canvasElements = elements.map(el => ({
    ...el,
    conversations: el.type === 'chat' ? (el as any).conversations || [] : undefined,
    messages: el.type === 'chat' ? (el as any).messages || [] : undefined
  })) as ImportedCanvasElement[];

  const handleSetElements = (newElements: ImportedCanvasElement[] | ((prev: ImportedCanvasElement[]) => ImportedCanvasElement[])) => {
    if (typeof newElements === 'function') {
      // Handle functional updates
      const currentElements = elements;
      const updated = newElements(currentElements as ImportedCanvasElement[]);
      
      // Get IDs of updated elements
      const updatedIds = new Set(updated.map(el => el.id));
      
      // Remove elements that are not in the updated list
      elements.forEach(el => {
        if (!updatedIds.has(el.id)) {
          deleteElement(el.id);
        }
      });
      
      // Update or add elements
      updated.forEach(el => {
        const existing = elements.find(e => e.id === el.id);
        if (existing) {
          updateElement(el.id, el as any);
        } else {
          addElement(el as any);
        }
      });
    } else {
      // Handle direct array updates
      const newIds = new Set(newElements.map(el => el.id));
      
      // Remove elements that are not in the new list
      elements.forEach(el => {
        if (!newIds.has(el.id)) {
          deleteElement(el.id);
        }
      });
      
      // Update or add elements
      newElements.forEach(el => {
        const existing = elements.find(e => e.id === el.id);
        if (existing) {
          updateElement(el.id, el as any);
        } else {
          addElement(el as any);
        }
      });
    }
  };

  const handleSetConnections = (newConnections: ImportedConnection[] | ((prev: ImportedConnection[]) => ImportedConnection[])) => {
    if (typeof newConnections === 'function') {
      const currentConnections = connections;
      const updated = newConnections(currentConnections);
      // Clear and re-add all connections
      connections.forEach(conn => deleteConnection(conn.id));
      updated.forEach(conn => addConnection(conn));
    } else {
      // Clear and re-add all connections
      connections.forEach(conn => deleteConnection(conn.id));
      newConnections.forEach(conn => addConnection(conn));
    }
  };

  const handleOpenAnalysisPanel = (content: ContentElement) => {
    setAnalysisPanel({ isOpen: true, content });
  };

  const handleCloseAnalysisPanel = () => {
    setAnalysisPanel({ isOpen: false, content: null });
  };

  const handleOpenSocialMediaModal = (platform?: string) => {
    setSocialMediaModal({ isOpen: true, platform });
  };

  const handleCloseSocialMediaModal = () => {
    setSocialMediaModal({ isOpen: false, platform: undefined });
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading canvas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <CanvasNavigation lastSaved={lastSaved} />
      
      <div className="flex-1 flex relative">
        <CanvasSidebar onOpenSocialMediaModal={handleOpenSocialMediaModal} />
        
        {/* Error notification only */}
        {saveStatus === 'error' && (
          <div className="absolute top-4 right-4 z-50 transition-all duration-300 animate-pulse">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center space-x-2 shadow-lg">
              <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800">Save failed</p>
                <p className="text-xs text-red-600 mt-0.5">Changes may not be saved. Please check your connection.</p>
              </div>
            </div>
          </div>
        )}
        
        <Canvas
          elements={canvasElements}
          setElements={handleSetElements}
          selectedElement={selectedElement as ImportedCanvasElement | null}
          setSelectedElement={setSelectedElement as React.Dispatch<React.SetStateAction<ImportedCanvasElement | null>>}
          connections={connections}
          setConnections={handleSetConnections}
          connecting={connecting}
          setConnecting={setConnecting}
          onOpenAnalysisPanel={handleOpenAnalysisPanel}
          onOpenSocialMediaModal={handleOpenSocialMediaModal}
        />
      </div>

      {/* Analysis Panel */}
      <AnalysisPanel
        isOpen={analysisPanel.isOpen}
        content={analysisPanel.content}
        onClose={handleCloseAnalysisPanel}
      />

      {/* Social Media Modal */}
      <SocialMediaModal
        isOpen={socialMediaModal.isOpen}
        onClose={handleCloseSocialMediaModal}
        platform={socialMediaModal.platform}
      />
    </div>
  );
};

export default AiconCanvasApp;