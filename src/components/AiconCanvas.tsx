import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from './Canvas/Canvas';
import { CanvasNavigation } from './Canvas/CanvasNavigation';
import { CanvasSidebar } from './Canvas/CanvasSidebar';
import { AnalysisPanel } from './Canvas/AnalysisPanel';
import { SocialMediaModal } from './Modal/SocialMediaModal';
import { CreatorSearchPanel } from './Canvas/CreatorSearchPanel';
import { useCanvasStore } from '@/store/canvasStore';
import { ContentElement, CanvasElement as ImportedCanvasElement, Connection as ImportedConnection } from '@/types';
import { canvasPersistence } from '@/services/canvasPersistence';
import { useRouter } from 'next/navigation';
import { debounce } from '@/utils/debounce';

// Use store's Element type instead of imported CanvasElement
type Element = {
  id: string | number;  // Support mixed ID types
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
  from: string | number;  // Support mixed ID types
  to: string | number;    // Support mixed ID types
};

interface AiconCanvasAppProps {
  canvasId?: string;
}

const AiconCanvasApp: React.FC<AiconCanvasAppProps> = ({ canvasId }) => {
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [connecting, setConnecting] = useState<string | number | null>(null);
  const [analysisPanel, setAnalysisPanel] = useState<{ isOpen: boolean; content: ContentElement | null }>({
    isOpen: false,
    content: null
  });
  const [socialMediaModal, setSocialMediaModal] = useState<{ isOpen: boolean; platform?: string }>({
    isOpen: false,
    platform: undefined
  });
  const [creatorSearchPanel, setCreatorSearchPanel] = useState<{ isOpen: boolean }>({
    isOpen: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { elements, connections, addElement, updateElement, deleteElement, addConnection, deleteConnection, setCanvasTitle, setWorkspaceId, setViewport, viewport, canvasTitle, workspaceId } = useCanvasStore();
  const router = useRouter();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedStateRef = useRef<{ elements: any[], connections: any[], title: string, viewport: any }>({
    elements: [],
    connections: [],
    title: '',
    viewport: { x: 0, y: 0, zoom: 1.0 }
  });

  // Load canvas data if canvasId is provided
  useEffect(() => {
    const loadCanvas = async () => {
      if (canvasId && canvasId !== 'new') {
        try {
          console.log(`[AiconCanvas] Loading canvas: ${canvasId}`);
          
          // Add a delay in production to ensure previous save completes
          // This prevents the race condition where clearCanvas() happens before save completes
          const isProduction = process.env.NODE_ENV === 'production';
          if (isProduction) {
            console.log('[AiconCanvas] Production environment - adding delay for save completion');
            // Longer delay for production due to network latency to Supabase
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          const canvasData = await canvasPersistence.loadCanvas(canvasId);
          
          if (canvasData) {
            console.log(`[AiconCanvas] Canvas loaded:`, { 
              title: canvasData.title, 
              elementsCount: canvasData.elements?.length || 0,
              connectionsCount: canvasData.connections?.length || 0,
              viewport: canvasData.viewport
            });
            console.log('[AiconCanvas] Setting title to:', canvasData.title || 'Untitled Canvas');
            
            // Get the store to clear it properly
            const store = useCanvasStore.getState();
            
            // Clear the entire canvas before loading new data
            store.clearCanvas();
            
            // Set canvas title, workspace ID, and viewport
            store.setCanvasTitle(canvasData.title || 'Untitled Canvas');
            store.setWorkspaceId(canvasId);
            if (canvasData.viewport) {
              store.setViewport(canvasData.viewport);
            }
            
            // Load elements
            if (canvasData.elements && Array.isArray(canvasData.elements)) {
              canvasData.elements.forEach((element: any) => {
                store.addElement(element);
              });
            }
            
            // Load connections
            if (canvasData.connections && Array.isArray(canvasData.connections)) {
              canvasData.connections.forEach((connection: any) => {
                store.addConnection(connection);
              });
            }
            
            // Mark that we've loaded the initial data
            setHasLoadedInitialData(true);
            
            // Track initial saved state
            lastSavedStateRef.current = {
              elements: canvasData.elements || [],
              connections: canvasData.connections || [],
              title: canvasData.title || 'Untitled Canvas',
              viewport: canvasData.viewport || { x: 0, y: 0, zoom: 1.0 }
            };
          } else {
            console.error('[AiconCanvas] Canvas not found:', canvasId);
            // Redirect to dashboard if canvas not found
            router.push('/dashboard');
          }
        } catch (error) {
          console.error('[AiconCanvas] Error loading canvas:', error);
        }
      } else if (canvasId === 'new') {
        // For new canvases, clear the store and mark as loaded
        const store = useCanvasStore.getState();
        store.clearCanvas();
        store.setCanvasTitle('New Canvas');
        store.setWorkspaceId(null);
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
      console.log('[AiconCanvas] Title being saved:', currentStore.canvasTitle);
      const success = await canvasPersistence.saveCanvas(
        canvasId,
        currentStore.elements,
        currentStore.connections,
        currentStore.viewport,
        currentStore.canvasTitle
      );
      
      if (success) {
        console.log('[AiconCanvas] Canvas saved successfully');
        setSaveStatus('idle');  // Go straight back to idle
        setLastSaved(new Date());
        // Track what we've saved
        lastSavedStateRef.current = {
          elements: [...currentStore.elements],
          connections: [...currentStore.connections],
          title: currentStore.canvasTitle,
          viewport: currentStore.viewport
        };
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

  // Auto-save when elements, connections, title, or viewport changes
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

    // Set new timeout for auto-save (1 second after last change for faster saves)
    saveTimeoutRef.current = setTimeout(() => {
      console.log('[AiconCanvas] Executing autosave after timeout');
      saveCanvas();
    }, 1000); // Reduced from 2000ms to 1000ms for faster saves

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [elements, connections, canvasTitle, viewport, saveCanvas, hasLoadedInitialData]);
  
  // Clear save timeout when canvasId changes
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [canvasId]);

  // Save immediately when component unmounts
  useEffect(() => {
    return () => {
      // Clear any pending save timeout and execute save immediately
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        console.log('[AiconCanvas] Cleared pending save timeout on unmount');
      }
      
      if (canvasId && canvasId !== 'new' && hasLoadedInitialData) {
        const store = useCanvasStore.getState();
        
        // Always save on unmount in production to prevent data loss
        console.log('[AiconCanvas] Component unmounting, saving canvas state');
        console.log('[AiconCanvas] Current elements:', store.elements.length);
        
        // Use sendBeacon for a more reliable unmount save
        const saveData = {
          workspaceId: canvasId,
          elements: store.elements,
          connections: store.connections,
          viewport: store.viewport,
          title: store.canvasTitle
        };
        
        // Try to save using beacon API (more reliable on unmount)
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(saveData)], { type: 'application/json' });
          const beaconSent = navigator.sendBeacon('/api/canvas/save-beacon', blob);
          console.log('[AiconCanvas] Save beacon sent:', beaconSent);
        }
        
        // Also try regular save as fallback (synchronous-ish for unmount)
        canvasPersistence.saveCanvas(
          canvasId,
          store.elements,
          store.connections,
          store.viewport,
          store.canvasTitle
        ).then(() => {
          console.log('[AiconCanvas] Final save completed on unmount');
        }).catch(err => {
          console.error('[AiconCanvas] Failed to save on unmount:', err);
        });
      }
    };
  }, [canvasId, hasLoadedInitialData]);

  // Add beforeunload handler to save on page navigation/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (canvasId && canvasId !== 'new' && hasLoadedInitialData) {
        const store = useCanvasStore.getState();
        
        // Check if there are unsaved changes
        const hasUnsavedChanges = 
          JSON.stringify(store.elements) !== JSON.stringify(lastSavedStateRef.current.elements) ||
          JSON.stringify(store.connections) !== JSON.stringify(lastSavedStateRef.current.connections) ||
          store.canvasTitle !== lastSavedStateRef.current.title ||
          JSON.stringify(store.viewport) !== JSON.stringify(lastSavedStateRef.current.viewport);
        
        if (hasUnsavedChanges) {
          // Clear pending timeout and save immediately
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
          
          // Try to save immediately
          console.log('[AiconCanvas] Beforeunload: Triggering immediate save');
          saveCanvas();
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [canvasId, hasLoadedInitialData, saveCanvas]);

  // Debug logging for element changes
  useEffect(() => {
    console.log('🎯 [AiconCanvas] Elements changed. Count:', elements.length);
    console.log('🎯 [AiconCanvas] Current elements:', elements.map(e => ({ 
      id: e.id, 
      type: e.type, 
      title: (e as any).title || 'N/A' 
    })));
  }, [elements]);

  // Auto-analyze content when added to canvas (MOCK ONLY - for elements without real scraping)
  useEffect(() => {
    elements.forEach(element => {
      // Skip if element has real scraping data or is being scraped, or is creator content
      const metadata = (element as any).metadata;
      const hasRealScraping = metadata?.scrapeId || metadata?.isScraping || metadata?.processedData;
      const isCreatorContent = metadata?.creatorId; // Creator content has creatorId in metadata
      
      if (element.type === 'content' && !metadata?.isAnalyzed && !metadata?.isAnalyzing && !hasRealScraping && !isCreatorContent) {
        // Mark as analyzing
        updateElement(element.id, {
          metadata: { ...(element as any).metadata, isAnalyzing: true }
        });

        // Simulate analysis after a delay (MOCK ONLY)
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
    console.log('🔥 === handleSetElements called ===');
    console.log('🔥 Current elements before update:', elements.map(e => ({ 
      id: e.id, 
      type: e.type, 
      title: (e as any).title || 'N/A' 
    })));
    
    if (typeof newElements === 'function') {
      console.log('🔥 Handling functional update (setElements with function)');
      // Handle functional updates
      const currentElements = elements;
      const updated = newElements(currentElements as ImportedCanvasElement[]);
      
      console.log('🔥 Updated elements after function call:', updated.map(e => ({ 
        id: e.id, 
        type: e.type, 
        title: (e as any).title || 'N/A' 
      })));
      
      // SMART SYNC: Determine operation type based on element count changes
      const currentCount = currentElements.length;
      const updatedCount = updated.length;
      const countDifference = updatedCount - currentCount;
      
      console.log('🔥 Count analysis:', { currentCount, updatedCount, countDifference });
      
      if (countDifference === 1) {
        // Likely adding a single element - use safe append
        console.log('🔥 Detected single element addition - using safe append');
        const currentElementMap = new Map(currentElements.map(el => [String(el.id), el]));
        updated.forEach(el => {
          if (!currentElementMap.has(String(el.id))) {
            console.log('🔥 ➕ Adding new element (SAFE APPEND):', { id: el.id, type: el.type });
            addElement(el as any);
          }
        });
      } else {
        // Other operations (moves, deletes, bulk changes) - use full sync
        console.log('🔥 Detected move/delete/bulk operation - using full sync');
        const currentElementMap = new Map(currentElements.map(el => [String(el.id), el]));
        const updatedElementMap = new Map(updated.map(el => [String(el.id), el]));
        
        // Update existing elements and add new ones
        updated.forEach(el => {
          if (currentElementMap.has(String(el.id))) {
            console.log('🔥 ✅ Updating existing element:', { 
              id: el.id, 
              idType: typeof el.id,
              type: el.type,
              x: el.x,
              y: el.y
            });
            updateElement(el.id, el as any);
          } else {
            console.log('🔥 ➕ Adding new element:', { id: el.id, type: el.type });
            addElement(el as any);
          }
        });
        
        // Remove elements that are no longer in the updated array (for deletes/moves)
        currentElements.forEach(el => {
          if (!updatedElementMap.has(String(el.id))) {
            console.log('🔥 ❌ Removing element (legitimate operation):', { id: el.id, type: el.type });
            deleteElement(el.id);
          }
        });
      }
      
    } else {
      console.log('🔥 Handling direct array update (setElements with array)');
      console.log('🔥 New elements:', newElements.map(e => ({ 
        id: e.id, 
        type: e.type, 
        title: (e as any).title || 'N/A' 
      })));
      
      // For direct array updates, use full sync (this is usually from state loads)
      const currentElementMap = new Map(elements.map(el => [String(el.id), el]));
      const newElementMap = new Map(newElements.map(el => [String(el.id), el]));
      
      // Update existing elements and add new ones
      newElements.forEach(el => {
        if (currentElementMap.has(String(el.id))) {
          console.log('🔥 ✅ Updating existing element:', { id: el.id, type: el.type });
          updateElement(el.id, el as any);
        } else {
          console.log('🔥 ➕ Adding new element:', { id: el.id, type: el.type });
          addElement(el as any);
        }
      });
      
      // Remove elements that are no longer in the new array
      elements.forEach(el => {
        if (!newElementMap.has(String(el.id))) {
          console.log('🔥 ❌ Removing element (direct array sync):', { id: el.id, type: el.type });
          deleteElement(el.id);
        }
      });
    }
    
    console.log('🔥 === handleSetElements complete - SMART SYNC ===');
  };

  const handleSetConnections = (newConnections: ImportedConnection[] | ((prev: ImportedConnection[]) => ImportedConnection[])) => {
    if (typeof newConnections === 'function') {
      const currentConnections = connections as ImportedConnection[];
      const updated = newConnections(currentConnections);
      // Clear and re-add all connections
      connections.forEach(conn => deleteConnection(conn.id));
      updated.forEach(conn => addConnection(conn as any));
    } else {
      // Clear and re-add all connections
      connections.forEach(conn => deleteConnection(conn.id));
      newConnections.forEach(conn => addConnection(conn as any));
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

  const handleOpenCreatorSearch = () => {
    setCreatorSearchPanel({ isOpen: true });
  };

  const handleCloseCreatorSearch = () => {
    setCreatorSearchPanel({ isOpen: false });
  };

  const handleConnectToChat = (content: ContentElement) => {
    // Find all chat elements
    const chatElements = elements.filter(el => el.type === 'chat');
    
    if (chatElements.length === 0) {
      // If no chat exists, create one
      const newChat: Element = {
        id: Date.now(),
        type: 'chat',
        x: content.x + content.width + 100,
        y: content.y,
        width: 400,
        height: 500
      };
      addElement(newChat);
      
      // Create connection after a short delay to ensure element is added
      setTimeout(() => {
        addConnection({
          id: Date.now(),
          from: content.id,
          to: newChat.id
        });
      }, 100);
    } else {
      // Connect to the nearest chat element
      const nearestChat = chatElements.reduce((nearest, chat) => {
        const currentDistance = Math.sqrt(
          Math.pow(chat.x - content.x, 2) + Math.pow(chat.y - content.y, 2)
        );
        const nearestDistance = Math.sqrt(
          Math.pow(nearest.x - content.x, 2) + Math.pow(nearest.y - content.y, 2)
        );
        return currentDistance < nearestDistance ? chat : nearest;
      });
      
      // Check if connection already exists
      const connectionExists = connections.some(
        conn => (conn.from === content.id && conn.to === nearestChat.id) ||
                (conn.to === content.id && conn.from === nearestChat.id)
      );
      
      if (!connectionExists) {
        addConnection({
          id: Date.now(),
          from: content.id,
          to: nearestChat.id
        });
      }
    }
  };

  const handleAddCreatorContentToCanvas = async (element: any) => {
    // This function is passed as a callback to CreatorSearchPanel
    // The CreatorSearchPanel will call addCreatorContentToCanvas which will use this callback
    // So we just need to add the element to the store here
    try {
      addElement(element);
      console.log(`[AiconCanvas] Added creator content element to canvas:`, element.id);
    } catch (error) {
      console.error('[AiconCanvas] Error adding element to canvas:', error);
    }
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
        <CanvasSidebar 
          onOpenSocialMediaModal={handleOpenSocialMediaModal}
          onOpenCreatorSearch={handleOpenCreatorSearch}
        />
        
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
          connections={connections as ImportedConnection[]}
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

      {/* Creator Search Panel */}
      <CreatorSearchPanel
        isOpen={creatorSearchPanel.isOpen}
        onClose={handleCloseCreatorSearch}
        onAddContentToCanvas={handleAddCreatorContentToCanvas}
        viewport={viewport}
      />
    </div>
  );
};

export default AiconCanvasApp;