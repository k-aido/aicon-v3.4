import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { CanvasElement, Connection, Viewport, Position, Platform } from '@/types';
import { ContentElement as ContentElementType } from '@/types';
import { useCanvasDrag } from '@/hooks/useCanvasDrag';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ConnectionLine } from './ConnectionLine';
import { ContentElement } from './ContentElement';
import { ChatElement } from './ChatElement';
import { TextComponent } from './TextComponent';
import { useCanvasStore } from '@/store/canvasStore';
import { 
  createTextElement, 
  createChatElement, 
  createContentElement,
  simpleToComplexElement,
  complexToSimpleElement
} from '@/utils/typeAdapters';

// Generate truly unique numeric IDs for canvas elements
let idCounter = Math.floor(Math.random() * 1000000); // Start with random base to avoid conflicts
const generateUniqueId = () => {
  // Use timestamp + random + counter to ensure uniqueness even for rapid successive calls
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  idCounter = (idCounter + 1) % 1000000; // Reset counter after 1M to prevent overflow
  // Create a unique combination that's very unlikely to collide
  return timestamp * 1000000000 + random * 1000000 + idCounter;
};

interface CanvasProps {
  elements: CanvasElement[];
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
  selectedElement: CanvasElement | null;
  setSelectedElement: React.Dispatch<React.SetStateAction<CanvasElement | null>>;
  connections: Connection[];
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  connecting: number | null;
  setConnecting: React.Dispatch<React.SetStateAction<number | null>>;
  onOpenAnalysisPanel?: (content: ContentElementType) => void;
  onOpenSocialMediaModal?: (platform?: string) => void;
}

/**
 * Main canvas component for drag-and-drop interface
 */
const CanvasComponent: React.FC<CanvasProps> = ({ 
  elements, 
  setElements, 
  selectedElement, 
  setSelectedElement,
  connections,
  setConnections,
  connecting,
  setConnecting,
  onOpenAnalysisPanel,
  onOpenSocialMediaModal
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { viewport, setViewport } = useCanvasStore();
  const [mousePos, setMousePos] = useState<Position>({ x: 0, y: 0 });
  const [selectedElementIds, setSelectedElementIds] = useState<number[]>([]);
  const [lastClickedElementId, setLastClickedElementId] = useState<number | null>(null);
  
  // Focus canvas on mount
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.focus();
    }
  }, []);

  // Canvas drag handling
  const { isDragging, handleMouseDown } = useCanvasDrag({
    onDragMove: (position) => setViewport({ ...viewport, ...position }),
    onDragEnd: () => {
      // Clear selection when clicking on empty canvas
      setSelectedElement(null);
      setSelectedElementIds([]);
    }
  });

  // URL detection and smart clipboard functionality
  const detectUrlType = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();
      
      if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
        return 'YouTube';
      }
      if (domain.includes('tiktok.com')) {
        return 'TikTok';
      }
      if (domain.includes('instagram.com')) {
        return 'Instagram';
      }
      // For any other valid URL
      return 'Website';
    } catch {
      return null;
    }
  };

  const createElementFromUrl = useCallback(async (url: string, x: number, y: number) => {
    const platform = detectUrlType(url);
    if (!platform) return;

    const newElement = {
      id: generateUniqueId(),
      type: 'content' as const,
      x: x - 150,
      y: y - 100,
      width: 300,
      height: 350,
      platform: platform.toLowerCase() as Platform,
      title: `New ${platform} Content`,
      url: url,
      thumbnail: 'https://via.placeholder.com/300x200'
    };

    setElements(prev => [...prev, newElement]);
  }, [setElements]);

  // Handle zoom - works with Ctrl/Cmd key for better UX
  const handleWheel = (e: React.WheelEvent) => {
    // Only zoom when Ctrl/Cmd key is pressed, or when over canvas background/connections
    const target = e.target as HTMLElement;
    const isCanvasBackground = target.classList.contains('canvas-background') || target === canvasRef.current;
    const isConnectionLine = target.closest('svg') && !target.closest('.pointer-events-auto');
    const shouldZoom = e.ctrlKey || e.metaKey || isCanvasBackground || isConnectionLine;
    
    if (shouldZoom) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.25, Math.min(3, viewport.zoom * delta));
      setViewport({ ...viewport, zoom: newZoom });
    }
    // If over content elements without modifier key, allow normal scroll behavior
  };

  // Track mouse position for connection preview
  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({
      x: (e.clientX - viewport.x) / viewport.zoom,
      y: (e.clientY - viewport.y) / viewport.zoom
    });
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    const toolData = e.dataTransfer.getData('tool');
    if (!toolData) return;
    
    try {
      const tool = JSON.parse(toolData);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      // Calculate drop position relative to viewport
      const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
      const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;
      
      // Check if it's a social media platform that needs URL input
      const socialMediaPlatforms = ['instagram', 'tiktok', 'youtube'];
      if (tool.type === 'content' && socialMediaPlatforms.includes(tool.id) && onOpenSocialMediaModal) {
        onOpenSocialMediaModal(tool.platform);
        return; // Don't create element yet, modal will handle it
      }
      
      // Create new element for other types
      let newElement: CanvasElement;
      
      if (tool.type === 'chat') {
        const chatId = generateUniqueId();
        const welcomeMessage = {
          id: Date.now(),
          role: 'assistant' as const,
          content: "👋 Hello! I'm your AI assistant. I can help you analyze content, answer questions, and provide insights. \n\n**Here's how to get started:**\n- Connect content elements to me by dragging from their connection points\n- Ask me questions about the connected content\n- I'll provide analysis and insights based on what you share\n\nWhat would you like to explore today?"
        };
        
        const defaultConversation = {
          id: 'default-' + chatId,
          title: 'Welcome Chat',
          messages: [welcomeMessage],
          createdAt: new Date(),
          lastMessageAt: new Date()
        };
        
        newElement = {
          id: chatId,
          type: 'chat' as const,
          x: x - 400,
          y: y - 450,
          width: 800,
          height: 900,
          messages: defaultConversation.messages
        };
      } else if (tool.type === 'text') {
        newElement = {
          id: generateUniqueId(),
          type: 'text' as const,
          x: x - 200,
          y: y - 150,
          width: 400,
          height: 300,
          title: 'Text Info',
          content: '',
          lastModified: new Date()
        };
      } else {
        newElement = {
          id: generateUniqueId(),
          type: 'content' as const,
          x: x - 150,
          y: y - 100,
          width: 300,
          height: 350,
          platform: (tool.platform || 'unknown') as Platform,
          title: `New ${tool.label} Content`,
          url: 'https://example.com',
          thumbnail: 'https://via.placeholder.com/300x200'
        };
      }
      
      if (tool.type === 'chat') {
        console.log('💬 [Canvas] Creating AI Chat element from drag/drop:', { tool, newElement });
      }
      console.log('🛠️ [Canvas] Creating element from drag/drop:', { tool, newElement });
      setElements(prev => {
        const updated = [...prev, newElement];
        console.log('🛠️ [Canvas] Elements after drag/drop creation:', updated.map(e => ({ id: e.id, type: e.type, title: (e as any).title || 'N/A' })));
        return updated;
      });
    } catch (error) {
      console.error('Failed to parse tool data:', error);
    }
  };

  // Handle canvas background click
  const handleCanvasClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target === canvasRef.current || target.classList.contains('canvas-background')) {
      e.preventDefault();
      handleMouseDown(e, viewport);
    }
  };

  // Handle element updates
  const handleElementUpdate = useCallback((id: string | number, updates: Partial<CanvasElement>) => {
    console.log('🔧 [Canvas] handleElementUpdate called:', { id, idType: typeof id, updates });
    setElements(prev => {
      // Convert both sides to string for comparison to handle mixed ID types
      const updated = prev.map(el => String(el.id) === String(id) ? { ...el, ...updates } as CanvasElement : el);
      const elementFound = prev.some(el => String(el.id) === String(id));
      console.log('🔧 [Canvas] Element found:', elementFound, 'Elements after update:', updated.map(e => ({ id: e.id, idType: typeof e.id, type: e.type, title: (e as any).title || 'N/A' })));
      return updated;
    });
  }, [setElements]);

  // Handle element deletion (single)
  const handleElementDelete = useCallback(async (id: string | number) => {
    console.log('🗑️ [Canvas] handleElementDelete called:', { id, idType: typeof id });
    
    // Get project ID from URL
    const projectId = window.location.pathname.split('/canvas/')[1];
    
    // Find element to delete - convert to string for comparison
    const elementToDelete = elements.find(el => String(el.id) === String(id));
    
    // Clean up content data for ContentElements
    if (elementToDelete && elementToDelete.type === 'content' && (elementToDelete as any).metadata?.scrapeId) {
      try {
        console.log('[Canvas] Cleaning up content data for element:', id);
        await fetch('/api/content/cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scrapeId: (elementToDelete as any).metadata.scrapeId,
            projectId
          })
        });
      } catch (error) {
        console.error('[Canvas] Failed to cleanup content for element:', id, error);
      }
    }
    
    setElements(prev => {
      const beforeDelete = prev.map(e => ({ id: e.id, type: e.type, title: (e as any).title || 'N/A' }));
      const afterDelete = prev.filter(el => String(el.id) !== String(id));
      console.log('🗑️ [Canvas] Elements before delete filter:', beforeDelete);
      console.log('🗑️ [Canvas] Elements after delete filter:', afterDelete.map(e => ({ id: e.id, type: e.type, title: (e as any).title || 'N/A' })));
      console.log('🗑️ [Canvas] Filter removed', beforeDelete.length - afterDelete.length, 'elements');
      return afterDelete;
    });
    setConnections(prev => {
      const beforeConnFilter = prev.length;
      const afterConnFilter = prev.filter(conn => String(conn.from) !== String(id) && String(conn.to) !== String(id));
      console.log('🗑️ [Canvas] Connections filter - before:', beforeConnFilter, 'after:', afterConnFilter.length);
      return afterConnFilter;
    });
    setSelectedElementIds(prev => {
      const beforeSelFilter = prev.length;
      const afterSelFilter = prev.filter(selId => String(selId) !== String(id));
      console.log('🗑️ [Canvas] Selected IDs filter - before:', beforeSelFilter, 'after:', afterSelFilter.length);
      return afterSelFilter;
    });
    if (selectedElement && String(selectedElement.id) === String(id)) {
      setSelectedElement(null);
    }
  }, [elements, setElements, setConnections, selectedElement, setSelectedElement]);

  // Handle multiple element deletion
  const handleMultipleElementDelete = useCallback(async (ids: number[]) => {
    console.log('🗑️ [Canvas] handleMultipleElementDelete called:', { ids });
    
    // Get project ID from URL
    const projectId = window.location.pathname.split('/canvas/')[1];
    
    // Clean up content data for ContentElements
    const elementsToDelete = elements.filter(el => ids.some(id => String(id) === String(el.id)));
    const cleanupPromises = elementsToDelete
      .filter(el => el.type === 'content' && (el as any).metadata?.scrapeId)
      .map(async (element) => {
        try {
          console.log('[Canvas] Cleaning up content data for element:', element.id);
          await fetch('/api/content/cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scrapeId: (element as any).metadata.scrapeId,
              projectId
            })
          });
        } catch (error) {
          console.error('[Canvas] Failed to cleanup content for element:', element.id, error);
        }
      });
    
    // Wait for all cleanups to complete (but don't block on errors)
    if (cleanupPromises.length > 0) {
      await Promise.allSettled(cleanupPromises);
    }
    
    setElements(prev => {
      const beforeDelete = prev.map(e => ({ id: e.id, type: e.type, title: (e as any).title || 'N/A' }));
      const afterDelete = prev.filter(el => !ids.some(id => String(id) === String(el.id)));
      console.log('🗑️ [Canvas] Elements before multiple delete filter:', beforeDelete);
      console.log('🗑️ [Canvas] Elements after multiple delete filter:', afterDelete.map(e => ({ id: e.id, type: e.type, title: (e as any).title || 'N/A' })));
      console.log('🗑️ [Canvas] Multiple delete filter removed', beforeDelete.length - afterDelete.length, 'elements');
      return afterDelete;
    });
    setConnections(prev => {
      const beforeConnFilter = prev.length;
      const afterConnFilter = prev.filter(conn => 
        !ids.some(id => String(id) === String(conn.from)) && !ids.some(id => String(id) === String(conn.to))
      );
      console.log('🗑️ [Canvas] Multiple delete connections filter - before:', beforeConnFilter, 'after:', afterConnFilter.length);
      return afterConnFilter;
    });
    setSelectedElementIds([]);
    setSelectedElement(null);
  }, [elements, setElements, setConnections, setSelectedElement]);

  // Handle element selection with multi-select support
  const handleElementSelect = useCallback((element: CanvasElement, event?: React.MouseEvent) => {
    console.log('🎯 [Canvas] Element selected:', { elementId: element.id, type: element.type });
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isCtrlCmd = isMac ? event?.metaKey : event?.ctrlKey;
    const isShift = event?.shiftKey;

    if (isCtrlCmd) {
      // Toggle selection - ensure we're working with current state
      const currentlySelected = selectedElementIds.includes(element.id);
      
      if (currentlySelected) {
        // Remove from selection
        const newSelection = selectedElementIds.filter(id => id !== element.id);
        setSelectedElementIds(newSelection);
        
        // Update selectedElement if we're deselecting the current one
        if (selectedElement?.id === element.id) {
          const remaining = elements.find(el => newSelection.includes(el.id));
          setSelectedElement(remaining || null);
        }
      } else {
        // Add to selection
        const newSelection = [...selectedElementIds, element.id];
        setSelectedElementIds(newSelection);
        setSelectedElement(element);
      }
      
      setLastClickedElementId(element.id);
      
      // Log for debugging
      console.log('Multi-select toggle:', {
        elementId: element.id,
        wasSelected: currentlySelected,
        selectedCount: currentlySelected ? selectedElementIds.length - 1 : selectedElementIds.length + 1,
        currentSelectedIds: selectedElementIds
      });
    } else if (isShift && lastClickedElementId !== null) {
      // Range selection
      const currentIndex = elements.findIndex(el => el.id === element.id);
      const lastIndex = elements.findIndex(el => el.id === lastClickedElementId);
      const start = Math.min(currentIndex, lastIndex);
      const end = Math.max(currentIndex, lastIndex);
      const rangeIds = elements.slice(start, end + 1).map(el => el.id);
      setSelectedElementIds(rangeIds);
      setSelectedElement(element);
    } else {
      // Single selection
      setSelectedElementIds([element.id]);
      setSelectedElement(element);
      setLastClickedElementId(element.id);
    }
  }, [elements, lastClickedElementId, selectedElement, selectedElementIds, setSelectedElement]);

  // Handle re-analysis
  const handleReanalysis = useCallback((element: CanvasElement) => {
    // Reset analysis state to trigger re-analysis
    const updates = {
      analysis: undefined,
      metadata: {
        ...(element as any).metadata,
        isAnalyzing: false,
        isAnalyzed: false,
        analysisError: undefined
      }
    } as any;
    handleElementUpdate(element.id, updates);
  }, [handleElementUpdate]);

  // Smart paste functionality
  const handleSmartPaste = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const urlType = detectUrlType(clipboardText);
      
      if (urlType) {
        // Get canvas center position or mouse position
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const centerX = (rect.width / 2 - viewport.x) / viewport.zoom;
        const centerY = (rect.height / 2 - viewport.y) / viewport.zoom;
        
        await createElementFromUrl(clipboardText, centerX, centerY);
      }
    } catch (error) {
      console.warn('Could not access clipboard:', error);
    }
  }, [viewport, createElementFromUrl]);

  // Convert elements to the format expected by keyboard shortcuts
  const elementsRecord = useMemo(() => {
    const record = elements.reduce((acc, el) => {
      acc[el.id.toString()] = el as any;
      return acc;
    }, {} as Record<string, any>);
    console.log('🗂️ [Canvas] Elements record for keyboard shortcuts:', {
      elementCount: elements.length,
      recordKeys: Object.keys(record),
      selectedIdsAsStrings: selectedElementIds.map(id => id.toString())
    });
    return record;
  }, [elements, selectedElementIds]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    selectedElementIds: selectedElementIds.map(id => id.toString()),
    elements: elementsRecord,
    enabled: true,
    onDelete: (elementIds: string[]) => {
      console.log('🔥 [Canvas] Keyboard delete triggered:', { elementIds, selectedElementIds });
      const ids = elementIds.map(id => parseInt(id)).filter(id => !isNaN(id));
      console.log('🔥 [Canvas] Parsed IDs for deletion:', ids);
      if (ids.length > 0) {
        handleMultipleElementDelete(ids);
      }
    },
    onPaste: handleSmartPaste,
    onSelectAll: () => {
      setSelectedElementIds(elements.map(el => el.id));
    }
  });

  // Handle connection creation
  const handleConnectionStart = useCallback((elementId: string | number) => {
    if (connecting) {
      // Complete connection
      if (String(connecting) !== String(elementId)) {
        const newConnection: Connection = {
          id: generateUniqueId(),
          from: connecting,
          to: elementId
        };
        setConnections(prev => [...prev, newConnection]);
      }
      setConnecting(null);
    } else {
      // Start connection
      setConnecting(elementId);
    }
  }, [connecting, setConnections, setConnecting]);

  // Handle connection deletion
  const handleConnectionDelete = useCallback((connectionId: number) => {
    setConnections(prev => prev.filter(c => c.id !== connectionId));
  }, [setConnections]);

  // Fit to screen functionality
  const handleFitToScreen = useCallback(() => {
    if (elements.length === 0) return;
    
    const padding = 50;
    const minX = Math.min(...elements.map(el => el.x));
    const minY = Math.min(...elements.map(el => el.y));
    const maxX = Math.max(...elements.map(el => el.x + el.width));
    const maxY = Math.max(...elements.map(el => el.y + el.height));
    
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const availableWidth = rect.width - (padding * 2);
    const availableHeight = rect.height - (padding * 2);
    
    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    const newX = rect.width / 2 - centerX * newZoom;
    const newY = rect.height / 2 - centerY * newZoom;
    
    setViewport({ x: newX, y: newY, zoom: newZoom });
  }, [elements]);

  // Reset zoom to 100%
  const handleResetZoom = useCallback(() => {
    setViewport({ ...viewport, zoom: 1 });
  }, [viewport, setViewport]);

  // Connection preview path
  const connectionPreview = useMemo(() => {
    if (!connecting) return null;
    
    const fromElement = elements.find(el => String(el.id) === String(connecting));
    if (!fromElement) return null;
    
    const fromX = fromElement.x + fromElement.width + 24;
    const fromY = fromElement.y + fromElement.height / 2;
    const toX = mousePos.x;
    const toY = mousePos.y;
    
    const distance = Math.abs(toX - fromX);
    const controlPointOffset = Math.min(distance * 0.5, 100);
    
    return `M ${fromX} ${fromY} C ${fromX + controlPointOffset} ${fromY}, ${toX - controlPointOffset} ${toY}, ${toX} ${toY}`;
  }, [connecting, elements, mousePos]);

  return (
    <div 
      ref={canvasRef}
      className="flex-1 bg-gray-50 relative overflow-hidden"
      data-canvas="true"
      tabIndex={0}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onFocus={(e) => {
        // Ensure canvas can receive keyboard events
        e.currentTarget.focus();
      }}
    >
      {/* Canvas Background - Draggable Area */}
      <div 
        className={`absolute inset-0 canvas-background ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleCanvasClick}
        style={{
          // Keep dots visible until very low zoom levels
          opacity: viewport.zoom < 0.25 ? 0 : viewport.zoom < 0.4 ? (viewport.zoom - 0.25) * 6.67 : 1,
          // Use consistent dot appearance
          backgroundImage: viewport.zoom < 0.25 
            ? 'none'
            : `radial-gradient(circle, #d4d4d8 1px, transparent 1px)`,
          // Scale grid size with zoom, with larger spacing when zoomed out
          backgroundSize: viewport.zoom < 0.5 
            ? '40px 40px'  // Fixed larger grid when zoomed out
            : `${20 * viewport.zoom}px ${20 * viewport.zoom}px`, // Scale with zoom when zoomed in
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          backgroundColor: '#fafafa',
          transition: 'opacity 0.15s ease-out'
        }}
      />
      
      {/* Canvas Elements */}
      <div 
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0'
        }}
        className="absolute inset-0 pointer-events-none"
      >
        {/* Connection Lines SVG */}
        <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e8bff" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#1e8bff" stopOpacity="1" />
              <stop offset="100%" stopColor="#1e8bff" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          
          {/* Render connection lines */}
          {connections.map(connection => (
            <ConnectionLine
              key={connection.id}
              connection={connection}
              elements={elements}
              onDelete={handleConnectionDelete}
            />
          ))}
          
          {/* Connection Preview */}
          {connectionPreview && (
            <g>
              <path
                d={connectionPreview}
                stroke="#1e8bff"
                strokeWidth="2"
                fill="none"
                strokeDasharray="5 3"
                strokeOpacity="0.5"
                className="pointer-events-none"
              />
              <circle
                cx={mousePos.x}
                cy={mousePos.y}
                r="8"
                fill="#1e8bff"
                fillOpacity="0.5"
                className="pointer-events-none connection-dot"
              />
            </g>
          )}
        </svg>

        
        {/* Render Elements */}
        {elements.map((element) => {
          const uniqueKey = `${element.type}-${element.id}-${element.x || 0}-${element.y || 0}`;
          
          if (element.type === 'content') {
            return (
              <ContentElement
                key={`content-${element.id}`}
                element={element}
                selected={selectedElementIds.includes(element.id)}
                connecting={connecting}
                connections={connections}
                onSelect={(el, event) => handleElementSelect(el, event)}
                onUpdate={handleElementUpdate}
                onDelete={handleElementDelete}
                onConnectionStart={handleConnectionStart}
                onOpenAnalysisPanel={onOpenAnalysisPanel}
                onReanalyze={handleReanalysis}
              />
            );
          } else if (element.type === 'chat') {
            return (
              <ChatElement
                key={`chat-${element.id}`}
                element={element}
                selected={selectedElementIds.includes(element.id)}
                connecting={connecting}
                connections={connections}
                allElements={elements}
                onSelect={(el, event) => handleElementSelect(el, event)}
                onUpdate={handleElementUpdate}
                onDelete={handleElementDelete}
                onConnectionStart={handleConnectionStart}
              />
            );
          } else if (element.type === 'text') {
            return (
              <TextComponent
                key={`text-${element.id}`}
                element={element}
                selected={selectedElementIds.includes(element.id)}
                connecting={connecting}
                connections={connections}
                onSelect={handleElementSelect}
                onUpdate={handleElementUpdate}
                onDelete={handleElementDelete}
                onConnectionStart={handleConnectionStart}
              />
            );
          }
          
          // Fallback for any other element types
          return null;
        })}
      </div>
      
      


      {/* Bottom-Right Canvas Controls */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        {/* Fit to Screen and Reset Zoom buttons */}
        <div className="bg-white rounded-lg shadow-lg p-1 flex gap-1">
          <button 
            onClick={handleFitToScreen}
            className="px-2 py-1 hover:bg-gray-100 rounded text-gray-700 text-xs font-medium outline-none focus:outline-none"
            title="Fit to Screen"
          >
            Fit to Screen
          </button>
          <button 
            onClick={handleResetZoom}
            className="px-2 py-1 hover:bg-gray-100 rounded text-gray-700 text-xs font-medium outline-none focus:outline-none"
            title="Reset Zoom"
          >
            Reset Zoom
          </button>
        </div>
        
        {/* Zoom percentage and +/- controls */}
        <div className="bg-white rounded-lg shadow-lg p-1 flex gap-1 items-center">
          <span className="px-2 text-sm text-gray-700">{Math.round(viewport.zoom * 100)}%</span>
          <button 
            onClick={() => setViewport({ ...viewport, zoom: Math.min(3, viewport.zoom * 1.2) })}
            className="p-1 hover:bg-gray-100 rounded text-gray-700 outline-none focus:outline-none"
            title="Zoom In"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button 
            onClick={() => setViewport({ ...viewport, zoom: Math.max(0.25, viewport.zoom * 0.8) })}
            className="p-1 hover:bg-gray-100 rounded text-gray-700 outline-none focus:outline-none"
            title="Zoom Out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        </div>
      </div>

    </div>
  );
};

CanvasComponent.displayName = 'Canvas';

export const Canvas = React.memo(CanvasComponent);

