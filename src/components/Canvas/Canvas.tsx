import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { CanvasElement, Connection, Viewport, Position, Platform } from '@/types';
import { ContentElement as ContentElementType } from '@/types';
import { useCanvasDrag } from '@/hooks/useCanvasDrag';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ConnectionLine } from './ConnectionLine';
import { ContentElement } from './ContentElement';
import { ChatElement } from './ChatElement';
import { useCanvasStore } from '@/store/canvasStore';

// Generate truly unique numeric IDs for canvas elements
let idCounter = 0;
const generateUniqueId = () => {
  // Use timestamp + counter to ensure uniqueness even for rapid successive calls
  const timestamp = Date.now();
  idCounter = (idCounter + 1) % 10000; // Reset counter after 10000 to prevent overflow
  return timestamp * 10000 + idCounter;
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
    onDragMove: (position) => setViewport(prev => ({ ...prev, ...position })),
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
      setViewport(prev => ({ ...prev, zoom: newZoom }));
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
      
      // Create new element
      const newElement: CanvasElement = tool.type === 'chat' ? {
        id: generateUniqueId(),
        type: 'chat' as const,
        x: x - 400,
        y: y - 450,
        width: 800,
        height: 900,
        messages: []
      } : {
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
  const handleElementUpdate = useCallback((id: number, updates: Partial<CanvasElement>) => {
    console.log('🔧 [Canvas] handleElementUpdate called:', { id, updates });
    setElements(prev => {
      const updated = prev.map(el => el.id === id ? { ...el, ...updates } as CanvasElement : el);
      console.log('🔧 [Canvas] Elements after update:', updated.map(e => ({ id: e.id, type: e.type, title: (e as any).title || 'N/A' })));
      return updated;
    });
  }, [setElements]);

  // Handle element deletion (single)
  const handleElementDelete = useCallback((id: number) => {
    console.log('🗑️ [Canvas] handleElementDelete called:', { id });
    setElements(prev => {
      const beforeDelete = prev.map(e => ({ id: e.id, type: e.type, title: (e as any).title || 'N/A' }));
      const afterDelete = prev.filter(el => el.id !== id);
      console.log('🗑️ [Canvas] Elements before delete filter:', beforeDelete);
      console.log('🗑️ [Canvas] Elements after delete filter:', afterDelete.map(e => ({ id: e.id, type: e.type, title: (e as any).title || 'N/A' })));
      console.log('🗑️ [Canvas] Filter removed', beforeDelete.length - afterDelete.length, 'elements');
      return afterDelete;
    });
    setConnections(prev => {
      const beforeConnFilter = prev.length;
      const afterConnFilter = prev.filter(conn => conn.from !== id && conn.to !== id);
      console.log('🗑️ [Canvas] Connections filter - before:', beforeConnFilter, 'after:', afterConnFilter.length);
      return afterConnFilter;
    });
    setSelectedElementIds(prev => {
      const beforeSelFilter = prev.length;
      const afterSelFilter = prev.filter(selId => selId !== id);
      console.log('🗑️ [Canvas] Selected IDs filter - before:', beforeSelFilter, 'after:', afterSelFilter.length);
      return afterSelFilter;
    });
    if (selectedElement?.id === id) {
      setSelectedElement(null);
    }
  }, [setElements, setConnections, selectedElement, setSelectedElement]);

  // Handle multiple element deletion
  const handleMultipleElementDelete = useCallback((ids: number[]) => {
    console.log('🗑️ [Canvas] handleMultipleElementDelete called:', { ids });
    setElements(prev => {
      const beforeDelete = prev.map(e => ({ id: e.id, type: e.type, title: (e as any).title || 'N/A' }));
      const afterDelete = prev.filter(el => !ids.includes(el.id));
      console.log('🗑️ [Canvas] Elements before multiple delete filter:', beforeDelete);
      console.log('🗑️ [Canvas] Elements after multiple delete filter:', afterDelete.map(e => ({ id: e.id, type: e.type, title: (e as any).title || 'N/A' })));
      console.log('🗑️ [Canvas] Multiple delete filter removed', beforeDelete.length - afterDelete.length, 'elements');
      return afterDelete;
    });
    setConnections(prev => {
      const beforeConnFilter = prev.length;
      const afterConnFilter = prev.filter(conn => 
        !ids.includes(conn.from) && !ids.includes(conn.to)
      );
      console.log('🗑️ [Canvas] Multiple delete connections filter - before:', beforeConnFilter, 'after:', afterConnFilter.length);
      return afterConnFilter;
    });
    setSelectedElementIds([]);
    setSelectedElement(null);
  }, [setElements, setConnections, setSelectedElement]);

  // Handle element selection with multi-select support
  const handleElementSelect = useCallback((element: CanvasElement, event?: React.MouseEvent) => {
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
    return elements.reduce((acc, el) => {
      acc[el.id.toString()] = el as any;
      return acc;
    }, {} as Record<string, any>);
  }, [elements]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    selectedElementIds: selectedElementIds.map(id => id.toString()),
    elements: elementsRecord,
    enabled: true,
    onDelete: (elementIds: string[]) => {
      const ids = elementIds.map(id => parseInt(id));
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
  const handleConnectionStart = useCallback((elementId: number) => {
    if (connecting) {
      // Complete connection
      if (connecting !== elementId) {
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
    setViewport(prev => ({ ...prev, zoom: 1 }));
  }, []);

  // Connection preview path
  const connectionPreview = useMemo(() => {
    if (!connecting) return null;
    
    const fromElement = elements.find(el => el.id === connecting);
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
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
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
                stroke="#8b5cf6"
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
                fill="#8b5cf6"
                fillOpacity="0.5"
                className="pointer-events-none connection-dot"
              />
            </g>
          )}
        </svg>

        
        {/* Render Elements */}
        {elements.map(element => {
          if (element.type === 'content') {
            return (
              <ContentElement
                key={element.id}
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
                key={element.id}
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
          }
          return null;
        })}
      </div>
      
      {/* Top-Right Canvas Controls */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 flex gap-2">
        <button 
          onClick={() => {
            if (selectedElementIds.length > 0) {
              handleMultipleElementDelete(selectedElementIds);
            }
          }}
          className={`px-3 py-2 hover:bg-gray-100 rounded text-xs font-medium outline-none focus:outline-none ${
            selectedElementIds.length > 0 ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          title="Delete Selected"
          disabled={selectedElementIds.length === 0}
        >
          Delete ({selectedElementIds.length})
        </button>
      </div>
      
      {/* Debug Info - Selection State */}
      <div className="absolute top-4 left-4 bg-black/80 text-white rounded-lg shadow-lg p-2 text-xs font-mono">
        <div>Selected IDs: [{selectedElementIds.join(', ')}]</div>
        <div>Count: {selectedElementIds.length}</div>
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
            onClick={() => setViewport(prev => ({ ...prev, zoom: Math.min(3, prev.zoom * 1.2) }))}
            className="p-1 hover:bg-gray-100 rounded text-gray-700 outline-none focus:outline-none"
            title="Zoom In"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button 
            onClick={() => setViewport(prev => ({ ...prev, zoom: Math.max(0.25, prev.zoom * 0.8) }))}
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

