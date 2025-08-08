// @ts-nocheck
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { CanvasElement, Connection, Viewport, Position } from '@/types';
import { ContentElement as ContentElementType } from '@/types';
import { useCanvasDrag } from '@/hooks/useCanvasDrag';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { EnhancedContentElement } from './EnhancedContentElement';
import { ChatElement } from './ChatElement';
import { EnhancedConnectionLine } from './EnhancedConnectionLine';
import { CanvasToolbar } from './CanvasToolbar';
import { SelectionBox } from './SelectionBox';
import { 
  ZoomIn, ZoomOut, Maximize, Grid, Move,
  MousePointer2, Square, Hand
} from 'lucide-react';

interface EnhancedCanvasProps {
  elements: CanvasElement[];
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
  selectedElement: CanvasElement | null;
  setSelectedElement: React.Dispatch<React.SetStateAction<CanvasElement | null>>;
  connections: Connection[];
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  connecting: number | null;
  setConnecting: React.Dispatch<React.SetStateAction<number | null>>;
  onOpenAnalysisPanel?: (content: ContentElementType) => void;
  onReanalyzeContent?: (elementId: number) => void;
}

type CanvasMode = 'select' | 'pan' | 'connect';

export const EnhancedCanvas: React.FC<EnhancedCanvasProps> = ({ 
  elements, 
  setElements, 
  selectedElement, 
  setSelectedElement,
  connections,
  setConnections,
  connecting,
  setConnecting,
  onOpenAnalysisPanel,
  onReanalyzeContent
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 0.5 });
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('select');
  const [selectedElementIds, setSelectedElementIds] = useState<number[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Position | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Position | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Position | null>(null);

  // Focus canvas on mount for keyboard shortcuts
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.focus();
    }
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom * 1.2, 3)
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom / 1.2, 0.1)
    }));
  }, []);

  const resetZoom = useCallback(() => {
    setViewport({ x: 0, y: 0, zoom: 0.5 });
  }, []);

  const fitToContent = useCallback(() => {
    if (elements.length === 0) return;

    const padding = 100;
    const minX = Math.min(...elements.map(el => el.x)) - padding;
    const minY = Math.min(...elements.map(el => el.y)) - padding;
    const maxX = Math.max(...elements.map(el => el.x + el.width)) + padding;
    const maxY = Math.max(...elements.map(el => el.y + el.height)) + padding;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    if (canvasRef.current) {
      const canvasWidth = canvasRef.current.clientWidth;
      const canvasHeight = canvasRef.current.clientHeight;
      
      const scaleX = canvasWidth / contentWidth;
      const scaleY = canvasHeight / contentHeight;
      const scale = Math.min(scaleX, scaleY, 1);
      
      setViewport({
        x: -minX * scale + (canvasWidth - contentWidth * scale) / 2,
        y: -minY * scale + (canvasHeight - contentHeight * scale) / 2,
        zoom: scale
      });
    }
  }, [elements]);

  // Pan functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (canvasMode === 'pan' || (e.button === 1)) { // Middle mouse button or pan mode
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      return;
    }

    if (canvasMode === 'select') {
      // Start selection box
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
        const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;
        setSelectionStart({ x, y });
        setSelectionEnd({ x, y });
        setIsSelecting(true);
      }
    }
  }, [canvasMode, viewport]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && panStart) {
      setViewport(prev => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      }));
      return;
    }

    if (isSelecting && selectionStart) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
        const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;
        setSelectionEnd({ x, y });
      }
    }
  }, [isPanning, panStart, isSelecting, selectionStart, viewport]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
    }

    if (isSelecting && selectionStart && selectionEnd) {
      // Find elements within selection box
      const minX = Math.min(selectionStart.x, selectionEnd.x);
      const maxX = Math.max(selectionStart.x, selectionEnd.x);
      const minY = Math.min(selectionStart.y, selectionEnd.y);
      const maxY = Math.max(selectionStart.y, selectionEnd.y);

      const selectedIds = elements
        .filter(el => 
          el.x < maxX && el.x + el.width > minX &&
          el.y < maxY && el.y + el.height > minY
        )
        .map(el => el.id);

      setSelectedElementIds(selectedIds);
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  }, [isPanning, isSelecting, selectionStart, selectionEnd, elements]);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const rect = canvasRef.current?.getBoundingClientRect();
      
      if (rect) {
        const centerX = e.clientX - rect.left;
        const centerY = e.clientY - rect.top;
        
        setViewport(prev => {
          const newZoom = Math.max(0.1, Math.min(3, prev.zoom * delta));
          const zoomRatio = newZoom / prev.zoom;
          
          return {
            x: centerX - (centerX - prev.x) * zoomRatio,
            y: centerY - (centerY - prev.y) * zoomRatio,
            zoom: newZoom
          };
        });
      }
    }
  }, []);

  // Element actions
  const handleElementSelect = useCallback((element: CanvasElement, event?: React.MouseEvent) => {
    if (event?.ctrlKey || event?.metaKey) {
      // Multi-select
      setSelectedElementIds(prev => 
        prev.includes(element.id) 
          ? prev.filter(id => id !== element.id)
          : [...prev, element.id]
      );
    } else {
      setSelectedElement(element);
      setSelectedElementIds([element.id]);
    }
  }, [setSelectedElement]);

  const handleElementUpdate = useCallback((id: number, updates: Partial<CanvasElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  }, [setElements]);

  const handleElementDelete = useCallback((id: number) => {
    setElements(prev => prev.filter(el => el.id !== id));
    setConnections(prev => prev.filter(conn => conn.from !== id && conn.to !== id));
    setSelectedElementIds(prev => prev.filter(elId => elId !== id));
    if (selectedElement?.id === id) {
      setSelectedElement(null);
    }
  }, [setElements, setConnections, selectedElement, setSelectedElement]);

  const handleConnectionStart = useCallback((elementId: number) => {
    setConnecting(elementId);
    setCanvasMode('connect');
  }, [setConnecting]);

  const handleElementDuplicate = useCallback((element: CanvasElement) => {
    const newElement = {
      ...element,
      id: Math.max(...elements.map(el => el.id)) + 1,
      x: element.x + 20,
      y: element.y + 20
    };
    setElements(prev => [...prev, newElement]);
  }, [elements, setElements]);

  const handleElementShare = useCallback((element: CanvasElement) => {
    if (navigator.share) {
      navigator.share({
        title: element.title || 'Content',
        url: element.url
      });
    } else {
      navigator.clipboard.writeText(element.url || '');
    }
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onDelete: () => {
      selectedElementIds.forEach(id => handleElementDelete(id));
    },
    onSelectAll: () => {
      setSelectedElementIds(elements.map(el => el.id));
    },
    onEscape: () => {
      setSelectedElementIds([]);
      setSelectedElement(null);
      setConnecting(null);
      setCanvasMode('select');
    }
  });

  // Grid pattern
  const gridPattern = useMemo(() => {
    const gridSize = 20 * viewport.zoom;
    return {
      backgroundImage: showGrid ? `
        radial-gradient(circle, #e5e7eb 1px, transparent 1px)
      ` : 'none',
      backgroundSize: `${gridSize}px ${gridSize}px`,
      backgroundPosition: `${viewport.x % gridSize}px ${viewport.y % gridSize}px`
    };
  }, [viewport, showGrid]);

  return (
    <div className="relative w-full h-full bg-gray-50 overflow-hidden">
      {/* Canvas Toolbar */}
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex items-center gap-2">
          <button
            onClick={() => setCanvasMode('select')}
            className={`p-2 rounded ${canvasMode === 'select' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
            title="Select (V)"
          >
            <MousePointer2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCanvasMode('pan')}
            className={`p-2 rounded ${canvasMode === 'pan' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
            title="Pan (H)"
          >
            <Hand className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-200"></div>
          <button
            onClick={zoomIn}
            className="p-2 hover:bg-gray-100 rounded"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={zoomOut}
            className="p-2 hover:bg-gray-100 rounded"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={fitToContent}
            className="p-2 hover:bg-gray-100 rounded"
            title="Fit to Content"
          >
            <Maximize className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-200"></div>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded ${showGrid ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
            title="Toggle Grid"
          >
            <Grid className="w-4 h-4" />
          </button>
          <div className="px-2 text-xs text-gray-500 min-w-[60px]">
            {Math.round(viewport.zoom * 100)}%
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`w-full h-full relative ${
          canvasMode === 'pan' || isPanning ? 'cursor-grab' : 
          canvasMode === 'connect' ? 'cursor-crosshair' : 
          'cursor-default'
        }`}
        style={gridPattern}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        tabIndex={0}
      >
        {/* Canvas content container */}
        <div
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%'
          }}
        >
          {/* Connection Lines */}
          {connections.map(connection => (
            <EnhancedConnectionLine
              key={connection.id}
              connection={connection}
              elements={elements}
              onDelete={(id) => setConnections(prev => prev.filter(c => c.id !== id))}
            />
          ))}

          {/* Elements */}
          {elements.map(element => {
            if (element.type === 'content') {
              return (
                <EnhancedContentElement
                  key={element.id}
                  element={element}
                  selected={selectedElementIds.includes(element.id)}
                  connecting={connecting}
                  connections={connections}
                  onSelect={handleElementSelect}
                  onUpdate={handleElementUpdate}
                  onDelete={handleElementDelete}
                  onConnectionStart={handleConnectionStart}
                  onOpenAnalysisPanel={onOpenAnalysisPanel}
                  onReanalyze={(el) => onReanalyzeContent?.(el.id)}
                  onDuplicate={handleElementDuplicate}
                  onShare={handleElementShare}
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
                  onSelect={handleElementSelect}
                  onUpdate={handleElementUpdate}
                  onDelete={handleElementDelete}
                  onConnectionStart={handleConnectionStart}
                />
              );
            }
            return null;
          })}

          {/* Selection Box */}
          {isSelecting && selectionStart && selectionEnd && (
            <SelectionBox
              start={selectionStart}
              end={selectionEnd}
            />
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="absolute bottom-4 right-4 z-20">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span>{elements.length} elements</span>
            <span>{connections.length} connections</span>
            {selectedElementIds.length > 0 && (
              <span>{selectedElementIds.length} selected</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};