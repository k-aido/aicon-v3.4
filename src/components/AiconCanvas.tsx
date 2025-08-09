import React, { useState, useEffect, useCallback } from 'react';
import { Canvas } from './Canvas/Canvas';
import { CanvasNavigation } from './Canvas/CanvasNavigation';
import { CanvasSidebar } from './Canvas/CanvasSidebar';
import { AnalysisPanel } from './Canvas/AnalysisPanel';
import { SocialMediaModal } from './Modal/SocialMediaModal';
import { useCanvasStore } from '@/store/canvasStore';
import { ContentElement, CanvasElement as ImportedCanvasElement, Connection as ImportedConnection } from '@/types';
import { canvasPersistence } from '@/services/canvasPersistence';
import { useRouter } from 'next/navigation';
import { debounce } from '@/utils/debounce';

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
              canvasData.elements.forEach(element => {
                addElement(element);
              });
            }
            
            // Load connections
            if (canvasData.connections && Array.isArray(canvasData.connections)) {
              canvasData.connections.forEach(connection => {
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
        connectionsCount: connections.length,
        viewport,
        title: canvasTitle
      });
      debouncedSave(workspaceId, elements, connections, viewport, canvasTitle);
    }
  }, [elements, connections, viewport, canvasTitle, workspaceId, isLoading, debouncedSave]);

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
      // Clear and re-add all elements
      updated.forEach((el, index) => {
        if (index < elements.length) {
          updateElement(el.id, el as any);
        } else {
          addElement(el as any);
        }
      });
      // Remove extra elements if needed
      if (elements.length > updated.length) {
        for (let i = updated.length; i < elements.length; i++) {
          deleteElement(elements[i].id);
        }
      }
    } else {
      // Handle direct array updates
      newElements.forEach((el, index) => {
        if (index < elements.length) {
          updateElement(el.id, el as any);
        } else {
          addElement(el as any);
        }
      });
      // Remove extra elements if needed
      if (elements.length > newElements.length) {
        for (let i = newElements.length; i < elements.length; i++) {
          deleteElement(elements[i].id);
        }
      }
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
      <CanvasNavigation />
      
      <div className="flex-1 flex relative">
        <CanvasSidebar onOpenSocialMediaModal={handleOpenSocialMediaModal} />
        
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