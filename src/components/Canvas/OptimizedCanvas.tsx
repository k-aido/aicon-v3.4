import React, { useState, useRef, useMemo, useCallback, useEffect, memo } from 'react';
import { CanvasElement, Connection, Viewport, Position } from '@/types';
import { ContentElement as ContentElementType } from '@/types';
import { useCanvasDrag } from '@/hooks/useCanvasDrag';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useCanvasVirtualization } from '@/hooks/useCanvasVirtualization';
import { ConnectionLine } from './ConnectionLine';
import { ContentElement } from './ContentElement';
import { ChatElement } from './ChatElement';
import { debounce } from '@/utils/debounce';

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
}

// Memoized element component wrapper
const MemoizedCanvasElement = memo<{
  element: CanvasElement;
  isSelected: boolean;
  isConnecting: boolean;
  connecting: number | null;
  connections: Connection[];
  allElements: CanvasElement[];
  onSelect: (element: CanvasElement) => void;
  onPositionChange: (id: number, position: Position) => void;
  onConnect: (id: number) => void;
  onDelete: (id: number) => void;
  onUpdate: (id: number, updates: Partial<CanvasElement>) => void;
  onOpenAnalysisPanel?: (content: ContentElementType) => void;
}>(({
  element,
  isSelected,
  isConnecting,
  connecting,
  connections,
  allElements,
  onSelect,
  onPositionChange,
  onConnect,
  onDelete,
  onUpdate,
  onOpenAnalysisPanel
}) => {
  if (element.type === 'content') {
    return (
      <ContentElement
        element={element as ContentElementType}
        selected={isSelected}
        connecting={connecting}
        connections={connections}
        onSelect={(el) => onSelect(el)}
        onUpdate={(id, updates) => onUpdate(id, updates)}
        onDelete={(id) => onDelete(id)}
        onConnectionStart={(id) => onConnect(id)}
        onReanalyze={onOpenAnalysisPanel}
      />
    );
  } else if (element.type === 'chat') {
    return (
      <ChatElement
        element={element}
        selected={isSelected}
        connecting={connecting}
        connections={connections}
        allElements={allElements}
        onSelect={(el) => onSelect(el)}
        onUpdate={(id, updates) => onUpdate(id, updates)}
        onDelete={(id) => onDelete(id)}
        onConnectionStart={(id) => onConnect(id)}
      />
    );
  }
  
  return null;
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.element === nextProps.element &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isConnecting === nextProps.isConnecting
  );
});

MemoizedCanvasElement.displayName = 'MemoizedCanvasElement';

// Memoized connection line component
const MemoizedConnectionLine = memo(ConnectionLine);

/**
 * Optimized canvas component with virtualization and performance improvements
 */
const OptimizedCanvas: React.FC<CanvasProps> = ({ 
  elements, 
  setElements, 
  selectedElement, 
  setSelectedElement,
  connections,
  setConnections,
  connecting,
  setConnecting,
  onOpenAnalysisPanel
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [selectedElementIds, setSelectedElementIds] = useState<number[]>([]);

  // Convert elements array to object for virtualization
  const elementsMap = useMemo(() => {
    const map: Record<string, CanvasElement> = {};
    elements.forEach(el => {
      map[el.id.toString()] = el;
    });
    return map;
  }, [elements]);

  // Use virtualization hook
  const { visibleElements, visibleCount, totalElements } = useCanvasVirtualization({
    elements: elementsMap,
    viewport,
    containerWidth: containerSize.width,
    containerHeight: containerSize.height,
    buffer: 200 // Render 200px outside viewport
  });

  // Track container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Debounced viewport update for smooth panning
  const debouncedSetViewport = useMemo(
    () => debounce((position: { x: number; y: number }) => {
      setViewport(prev => ({ ...prev, ...position }));
    }, 16), // ~60fps
    []
  );

  // Canvas drag handling with debounced updates
  const { isDragging, handleMouseDown } = useCanvasDrag({
    onDragMove: useCallback((position) => {
      debouncedSetViewport(position);
    }, [debouncedSetViewport]),
    onDragEnd: useCallback(() => {
      setSelectedElement(null);
      setSelectedElementIds([]);
    }, [setSelectedElement])
  });

  // Memoized callbacks for element interactions
  const handleElementSelect = useCallback((element: CanvasElement) => {
    setSelectedElement(element);
    setSelectedElementIds([element.id]);
  }, [setSelectedElement]);

  const handleElementPositionChange = useCallback((id: number, position: Position) => {
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, x: position.x, y: position.y } : el
    ));
  }, [setElements]);

  const handleElementConnect = useCallback((id: number) => {
    if (connecting && connecting !== id) {
      const newConnection: Connection = {
        id: Date.now(),
        from: connecting,
        to: id
      };
      setConnections(prev => [...prev, newConnection]);
      setConnecting(null);
    } else {
      setConnecting(id);
    }
  }, [connecting, setConnections, setConnecting]);

  const handleElementDelete = useCallback((id: number) => {
    setElements(prev => prev.filter(el => el.id !== id));
    setConnections(prev => prev.filter(conn => conn.from !== id && conn.to !== id));
    if (selectedElement?.id === id) {
      setSelectedElement(null);
    }
  }, [setElements, setConnections, selectedElement, setSelectedElement]);

  const handleElementUpdate = useCallback((id: number, updates: Partial<CanvasElement>) => {
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, ...updates } as CanvasElement : el
    ));
  }, [setElements]);

  // Keyboard shortcuts with memoized actions
  const keyboardActions = useMemo(() => ({
    copy: () => {
      if (selectedElement) {
        navigator.clipboard.writeText(JSON.stringify(selectedElement));
      }
    },
    paste: async () => {
      try {
        const text = await navigator.clipboard.readText();
        const element = JSON.parse(text);
        if (element && element.type) {
          const newElement = {
            ...element,
            id: Date.now(),
            x: element.x + 50,
            y: element.y + 50
          };
          setElements(prev => [...prev, newElement]);
        }
      } catch (err) {
        console.error('Failed to paste:', err);
      }
    },
    delete: () => {
      if (selectedElement) {
        handleElementDelete(selectedElement.id);
      }
    },
    selectAll: () => {
      setSelectedElementIds(elements.map(el => el.id));
    }
  }), [selectedElement, setElements, elements, handleElementDelete]);

  useKeyboardShortcuts({
    selectedElementIds: selectedElementIds.map(id => id.toString()),
    elements: elementsMap as Record<string, any>,
    onCopy: keyboardActions.copy,
    onPaste: keyboardActions.paste,
    onDelete: keyboardActions.delete,
    onSelectAll: keyboardActions.selectAll
  });

  // Mouse wheel zoom with performance optimization
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(Math.max(0.1, viewport.zoom * delta), 5);
      
      // Zoom towards mouse position
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const dx = (x - viewport.x) * (1 - delta);
        const dy = (y - viewport.y) * (1 - delta);
        
        setViewport({
          x: viewport.x + dx,
          y: viewport.y + dy,
          zoom: newZoom
        });
      }
    }
  }, [viewport]);

  // Visible connections (only render connections for visible elements)
  const visibleConnections = useMemo(() => {
    const visibleIds = new Set(visibleElements.map(({ id }) => parseInt(id)));
    return connections.filter(conn => 
      visibleIds.has(conn.from) || visibleIds.has(conn.to)
    );
  }, [connections, visibleElements]);

  // Canvas click handler
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        setSelectedElement(null);
        setSelectedElementIds([]);
        setConnecting(null);
      }
    }
  }, [setSelectedElement, setConnecting]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 bg-gray-50 relative overflow-hidden"
      data-canvas="true"
      tabIndex={0}
      onWheel={handleWheel}
    >
      {/* Canvas Background */}
      <div 
        ref={canvasRef}
        className={`absolute inset-0 canvas-background ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            handleMouseDown(e, viewport);
          }
        }}
        onClick={handleCanvasClick}
        style={{
          opacity: viewport.zoom < 0.25 ? 0 : viewport.zoom < 0.4 ? (viewport.zoom - 0.25) * 6.67 : 1,
          backgroundImage: viewport.zoom < 0.25 
            ? 'none'
            : `radial-gradient(circle, #d4d4d8 1px, transparent 1px)`,
          backgroundSize: viewport.zoom < 0.5 
            ? '40px 40px'
            : `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          backgroundColor: '#fafafa',
          transition: 'opacity 0.15s ease-out'
        }}
      />
      
      {/* Canvas Elements Container */}
      <div 
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0'
        }}
        className="absolute inset-0 pointer-events-none"
      >
        {/* Connection Lines */}
        <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {visibleConnections.map(connection => (
            <MemoizedConnectionLine
              key={connection.id}
              connection={connection}
              elements={elements}
              onDelete={(connectionId) => {
                setConnections(prev => prev.filter(conn => conn.id !== connectionId));
              }}
            />
          ))}
        </svg>

        {/* Canvas Elements - Only render visible ones */}
        <div className="pointer-events-auto">
          {visibleElements.map(({ id, element }) => (
            <MemoizedCanvasElement
              key={id}
              element={element}
              isSelected={selectedElement?.id === element.id}
              isConnecting={connecting === element.id}
              connecting={connecting}
              connections={connections}
              allElements={elements}
              onSelect={handleElementSelect}
              onPositionChange={handleElementPositionChange}
              onConnect={handleElementConnect}
              onDelete={handleElementDelete}
              onUpdate={handleElementUpdate}
              onOpenAnalysisPanel={onOpenAnalysisPanel}
            />
          ))}
        </div>
      </div>

      {/* Performance Monitor (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white text-xs p-2 rounded">
          <div>Visible: {visibleCount}/{totalElements}</div>
          <div>Zoom: {(viewport.zoom * 100).toFixed(0)}%</div>
        </div>
      )}

      {/* Canvas Controls */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-2 flex gap-2">
        <button 
          onClick={() => setViewport(prev => ({ ...prev, zoom: Math.min(3, prev.zoom * 1.2) }))}
          className="p-2 hover:bg-gray-100 rounded text-gray-700"
        >
          +
        </button>
        <span className="p-2 text-sm text-gray-700">{Math.round(viewport.zoom * 100)}%</span>
        <button 
          onClick={() => setViewport(prev => ({ ...prev, zoom: Math.max(0.25, prev.zoom * 0.8) }))}
          className="p-2 hover:bg-gray-100 rounded text-gray-700"
        >
          -
        </button>
      </div>
    </div>
  );
};

export const Canvas = memo(OptimizedCanvas);