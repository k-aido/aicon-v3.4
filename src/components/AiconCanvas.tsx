import React, { useState, useEffect, useCallback } from 'react';
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
  const { elements, connections, addElement, updateElement, deleteElement, addConnection, deleteConnection, setCanvasTitle, setWorkspaceId, setViewport, viewport, canvasTitle, workspaceId } = useCanvasStore();
  const router = useRouter();

  // Load canvas data if canvasId is provided
  useEffect(() => {
    const loadCanvas = async () => {
      if (canvasId && canvasId !== 'new') {
        try {
          console.log(`[AiconCanvas] Loading canvas: ${canvasId}`);
          const canvasData = await canvasPersistence.loadCanvas(canvasId);
          
          if (canvasData) {
            console.log(`[AiconCanvas] Canvas loaded:`, { 
              title: canvasData.title, 
              elementsCount: canvasData.elements?.length || 0,
              connectionsCount: canvasData.connections?.length || 0,
              viewport: canvasData.viewport
            });
            
            // Set canvas title, workspace ID, and viewport
            setCanvasTitle(canvasData.title || 'Untitled Canvas');
            setWorkspaceId(canvasId);
            if (canvasData.viewport) {
              setViewport(canvasData.viewport);
            }
            
            // Clear existing elements and connections
            elements.forEach(el => deleteElement(el.id));
            connections.forEach(conn => deleteConnection(conn.id));
            
            // Load elements
            if (canvasData.elements && Array.isArray(canvasData.elements)) {
              canvasData.elements.forEach((element: any) => {
                addElement(element);
              });
            }
            
            // Load connections
            if (canvasData.connections && Array.isArray(canvasData.connections)) {
              canvasData.connections.forEach((connection: any) => {
                addConnection(connection);
              });
            }
          } else {
            console.error('[AiconCanvas] Canvas not found:', canvasId);
            // Redirect to dashboard if canvas not found
            router.push('/dashboard');
          }
        } catch (error) {
          console.error('[AiconCanvas] Error loading canvas:', error);
        }
      }
      setIsLoading(false);
    };

    loadCanvas();
  }, [canvasId]); // Only depend on canvasId to avoid re-running on state changes

  // Create a debounced save function (saves after 1 second of no changes)
  const debouncedSave = useCallback(
    debounce(async (workspaceId: string, elements: any[], connections: any[], viewport: any, title: string) => {
      console.log('[AiconCanvas] Auto-saving canvas...');
      
      // Debug logging for element structures
      console.log('=== Saving Elements to Supabase ===');
      elements.forEach((element, index) => {
        console.log(`Element ${index + 1}:`);
        console.log('- Type:', element.type);
        console.log('- ID:', element.id);
        console.log('- Title:', element.title);
        console.log('- Full structure:', JSON.stringify(element, null, 2));
        console.log('Required fields check:');
        console.log('  - id:', element.id);
        console.log('  - type:', element.type);
        console.log('  - x:', element.x);
        console.log('  - y:', element.y);
        console.log('  - width:', element.width);
        console.log('  - height:', element.height);
        if (element.type === 'chat') {
          console.log('  - messages:', element.messages ? element.messages.length : 'undefined');
          console.log('  - conversations:', element.conversations ? element.conversations.length : 'undefined');
        }
        console.log('---');
      });
      
      try {
        const success = await canvasPersistence.saveCanvas(
          workspaceId,
          elements,
          connections,
          viewport,
          title
        );
        if (success) {
          console.log('[AiconCanvas] Canvas auto-saved successfully');
        } else {
          console.error('[AiconCanvas] Failed to auto-save canvas');
        }
      } catch (error) {
        console.error('[AiconCanvas] Error during auto-save:', error);
      }
    }, 1000),
    []
  );

  // Watch for changes and trigger auto-save
  useEffect(() => {
    if (workspaceId && workspaceId !== 'new' && !isLoading) {
      console.log('[AiconCanvas] Canvas state changed, scheduling auto-save...', {
        elementsCount: elements.length,
        elementTypes: elements.map(el => ({ id: el.id, type: el.type, title: el.title || 'N/A' })),
        connectionsCount: connections.length,
        viewport,
        title: canvasTitle
      });
      debouncedSave(workspaceId, elements, connections, viewport, canvasTitle);
    }
  }, [elements, connections, viewport, canvasTitle, workspaceId, isLoading, debouncedSave]);

  // Debug logging for element changes
  useEffect(() => {
    console.log('🎯 [AiconCanvas] Elements changed. Count:', elements.length);
    console.log('🎯 [AiconCanvas] Current elements:', elements.map(e => ({ 
      id: e.id, 
      type: e.type, 
      title: (e as any).title || 'N/A' 
    })));
  }, [elements]);

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
            console.log('🔥 ✅ Updating existing element:', { id: el.id, type: el.type });
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

  const handleAddCreatorContentToCanvas = (content: any) => {
    // Convert creator content to canvas element
    const newElement = {
      id: `creator-content-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      type: 'content' as const,
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
      width: 320,
      height: 280,
      title: content.caption?.substring(0, 50) + '...' || 'Instagram Content',
      url: content.content_url,
      platform: 'instagram',
      thumbnail: content.thumbnail_url,
      metadata: {
        creatorId: content.creator_id,
        likes: content.likes,
        comments: content.comments,
        views: content.views,
        postedDate: content.posted_date,
        duration: content.duration_seconds,
        rawData: content.raw_data
      }
    };

    addElement(newElement);
    
    // Optional: Close the panel after adding
    // handleCloseCreatorSearch();
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
      <CanvasNavigation />
      
      <div className="flex-1 flex relative">
        <CanvasSidebar 
          onOpenSocialMediaModal={handleOpenSocialMediaModal}
          onOpenCreatorSearch={handleOpenCreatorSearch}
        />
        
        <Canvas
          elements={canvasElements}
          setElements={handleSetElements}
          selectedElement={selectedElement as ImportedCanvasElement | null}
          setSelectedElement={setSelectedElement as React.Dispatch<React.SetStateAction<ImportedCanvasElement | null>>}
          connections={connections as ImportedConnection[]}
          setConnections={handleSetConnections}
          connecting={connecting as number | null}
          setConnecting={setConnecting as React.Dispatch<React.SetStateAction<number | null>>}
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