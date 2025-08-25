import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { CanvasElement, Connection, Viewport, Position, Platform } from '@/types';
import { ContentElement as ContentElementType } from '@/types';
import { useCanvasDrag } from '@/hooks/useCanvasDrag';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useCanvasAlignment } from '@/hooks/useCanvasAlignment';
import { useViewportOptimization, useRenderQuality } from '@/hooks/useViewportOptimization';
import { ConnectionLine } from './ConnectionLine';
import { ContentElement } from './ContentElement';
import { ChatElement } from './ChatElement';
import { TextComponent } from './TextComponent';
import { AlignmentGuides } from './AlignmentGuides';
import { useCanvasStore } from '@/store/canvasStore';
import { 
  createTextElement, 
  createChatElement, 
  createContentElement,
  simpleToComplexElement,
  complexToSimpleElement
} from '@/utils/typeAdapters';
import { throttle } from '@/utils/performance';
import { useDarkMode, darkModeColors } from '@/contexts/DarkModeContext';
import CreditCounter from '../CreditCounter/CreditCounter';
import { DarkModeToggle } from '../DarkModeToggle';

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
  connecting: string | number | null;
  setConnecting: React.Dispatch<React.SetStateAction<string | number | null>>;
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
  const { isDarkMode } = useDarkMode();
  const [mousePos, setMousePos] = useState<Position>({ x: 0, y: 0 });
  const [selectedElementIds, setSelectedElementIds] = useState<number[]>([]);
  const [lastClickedElementId, setLastClickedElementId] = useState<number | null>(null);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [isResizingElement, setIsResizingElement] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  
  // Alignment system - enabled when dragging or resizing
  const { checkAlignment, clearGuides, activeGuides } = useCanvasAlignment({
    elements,
    snapThreshold: 10,
    enabled: isDraggingElement || isResizingElement
  });

  // Canvas drag handling with state
  const [isCanvasDragging, setIsCanvasDragging] = useState(false);

  // Viewport optimization hooks
  const visibleElements = useViewportOptimization(
    elements,
    viewport,
    canvasSize.width,
    canvasSize.height,
    200 // Extra padding
  );

  const renderQuality = useRenderQuality(viewport, isCanvasDragging || isDraggingElement);
  
  // Track canvas size for viewport optimization
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Focus canvas on mount and handle keyboard events
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.focus();
    }
    
    // Reset viewport if it's too far off screen
    if (Math.abs(viewport.x) > 5000 || Math.abs(viewport.y) > 5000) {
      console.log('[Canvas] Resetting viewport - was too far off screen');
      setViewport({ x: 0, y: 0, zoom: 1 });
    }
    
    // Handle keyboard events
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && connecting) {
        console.log('[Canvas] Cancelling connection');
        setConnecting(null);
      }
    };
    
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [connecting, setConnecting]);

  // Canvas drag handling
  const { isDragging: isDraggingCanvas, handleMouseDown } = useCanvasDrag({
    onDragMove: (position) => setViewport({ ...viewport, ...position }),
    onDragEnd: () => {
      setIsCanvasDragging(false);
      // Clear selection when clicking on empty canvas
      setSelectedElement(null);
      setSelectedElementIds([]);
    }
  });
  
  // Update isCanvasDragging when isDraggingCanvas changes
  useEffect(() => {
    setIsCanvasDragging(isDraggingCanvas);
  }, [isDraggingCanvas]);

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
      const newZoom = Math.max(0.25, Math.min(1, viewport.zoom * delta)); // Max 200% (1 * 200% = 200%)
      setViewport({ ...viewport, zoom: newZoom });
    }
    // If over content elements without modifier key, allow normal scroll behavior
  };

  // Track mouse position for connection preview
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos({
        x: (e.clientX - rect.left - viewport.x) / viewport.zoom,
        y: (e.clientY - rect.top - viewport.y) / viewport.zoom
      });
    }
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Get viewport center position
  const getViewportCenter = () => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 100, y: 100 };
    
    // Calculate the center of the visible viewport in canvas coordinates
    const centerX = (rect.width / 2 - viewport.x) / viewport.zoom;
    const centerY = (rect.height / 2 - viewport.y) / viewport.zoom;
    
    console.log('[Canvas] Viewport center calculation:', {
      rectWidth: rect.width,
      rectHeight: rect.height,
      viewportX: viewport.x,
      viewportY: viewport.y,
      viewportZoom: viewport.zoom,
      centerX,
      centerY
    });
    
    // Ensure elements are created in a visible area
    return { 
      x: isFinite(centerX) ? centerX : 100, 
      y: isFinite(centerY) ? centerY : 100 
    };
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    const toolData = e.dataTransfer.getData('tool');
    if (!toolData) return;
    
    try {
      const tool = JSON.parse(toolData);
      
      // Use viewport center instead of drop position
      const center = getViewportCenter();
      const x = center.x;
      const y = center.y;
      
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
          x: x - 425,
          y: y - 310,
          width: 850,
          height: 620,
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

  // Create throttled position update function for better performance at high zoom
  const throttledPositionUpdate = useMemo(
    () => throttle((id: string | number, position: { x?: number; y?: number }) => {
      setElements(prevElements => 
        prevElements.map(el => 
          String(el.id) === String(id) 
            ? { ...el, ...position }
            : el
        )
      );
    }, 16), // 16ms = ~60fps
    [setElements]
  );

  // Handle element updates with alignment support
  const handleElementUpdate = useCallback((id: string | number, updates: Partial<CanvasElement>) => {
    console.log('🔧 [Canvas] handleElementUpdate called:', { id, idType: typeof id, updates });
    
    const element = elements.find(el => String(el.id) === String(id));
    if (!element) return;
    
    // Check if this is a position update (dragging)
    if ('x' in updates || 'y' in updates) {
      // Set dragging state to true when position updates happen
      setIsDraggingElement(true);
      
      // Check alignment with other elements
      const alignmentResult = checkAlignment({
        id,
        x: updates.x ?? element.x,
        y: updates.y ?? element.y,
        width: element.width,
        height: element.height
      });
      
      // Apply snapped positions if available
      if (alignmentResult.snappedX !== undefined) {
        updates.x = alignmentResult.snappedX;
      }
      if (alignmentResult.snappedY !== undefined) {
        updates.y = alignmentResult.snappedY;
      }
      
      // Use throttled update for position changes during drag
      if (isDraggingElement && viewport.zoom > 0.75) {
        throttledPositionUpdate(id, { x: updates.x, y: updates.y });
        return;
      }
    }
    
    // Check if this is a resize update
    if ('width' in updates || 'height' in updates) {
      // Set resizing state to true when size updates happen
      setIsResizingElement(true);
      
      // Check alignment with other elements using new dimensions
      const alignmentResult = checkAlignment({
        id,
        x: element.x,
        y: element.y,
        width: updates.width ?? element.width,
        height: updates.height ?? element.height
      });
      
      // For resize, we might want to snap the dimensions
      // This creates alignment when edges align during resize
    }
    
    setElements(prev => {
      // Convert both sides to string for comparison to handle mixed ID types
      const updated = prev.map(el => String(el.id) === String(id) ? { ...el, ...updates } as CanvasElement : el);
      const elementFound = prev.some(el => String(el.id) === String(id));
      console.log('🔧 [Canvas] Element found:', elementFound, 'Elements after update:', updated.map(e => ({ id: e.id, idType: typeof e.id, type: e.type, title: (e as any).title || 'N/A' })));
      return updated;
    });
  }, [setElements, elements, checkAlignment]);

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
  const handleMultipleElementDelete = useCallback(async (ids: (string | number)[]) => {
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
      const currentlySelected = selectedElementIds.some(id => String(id) === String(element.id));
      
      if (currentlySelected) {
        // Remove from selection
        const newSelection = selectedElementIds.filter(id => String(id) !== String(element.id));
        setSelectedElementIds(newSelection);
        
        // Update selectedElement if we're deselecting the current one
        if (selectedElement && String(selectedElement.id) === String(element.id)) {
          const remaining = elements.find(el => newSelection.some(selId => String(selId) === String(el.id)));
          setSelectedElement(remaining || null);
        }
      } else {
        // Add to selection - convert element.id to number if it's numeric
        const numericId = typeof element.id === 'string' && !isNaN(Number(element.id)) ? Number(element.id) : element.id;
        const newSelection = [...selectedElementIds, numericId as number];
        setSelectedElementIds(newSelection);
        setSelectedElement(element);
      }
      
      setLastClickedElementId(typeof element.id === 'number' ? element.id : Number(element.id));
      
      // Log for debugging
      console.log('Multi-select toggle:', {
        elementId: element.id,
        wasSelected: currentlySelected,
        selectedCount: currentlySelected ? selectedElementIds.length - 1 : selectedElementIds.length + 1,
        currentSelectedIds: selectedElementIds
      });
    } else if (isShift && lastClickedElementId !== null) {
      // Range selection
      const currentIndex = elements.findIndex(el => String(el.id) === String(element.id));
      const lastIndex = elements.findIndex(el => String(el.id) === String(lastClickedElementId));
      const start = Math.min(currentIndex, lastIndex);
      const end = Math.max(currentIndex, lastIndex);
      const rangeIds = elements.slice(start, end + 1).map(el => typeof el.id === 'number' ? el.id : Number(el.id));
      setSelectedElementIds(rangeIds);
      setSelectedElement(element);
    } else {
      // Single selection
      const numericId = typeof element.id === 'string' && !isNaN(Number(element.id)) ? Number(element.id) : element.id;
      setSelectedElementIds([numericId as number]);
      setSelectedElement(element);
      setLastClickedElementId(numericId as number);
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
      const ids = elementIds.map(id => {
        const parsed = parseInt(id);
        return !isNaN(parsed) ? parsed : id;
      });
      console.log('🔥 [Canvas] Parsed IDs for deletion:', ids);
      if (ids.length > 0) {
        handleMultipleElementDelete(ids);
      }
    },
    onPaste: handleSmartPaste,
    onSelectAll: () => {
      setSelectedElementIds(elements.map(el => typeof el.id === 'number' ? el.id : Number(el.id)));
    }
  });

  // Handle connection creation
  const handleConnectionStart = useCallback((elementId: string | number) => {
    console.log('[Canvas] handleConnectionStart called:', { 
      elementId, 
      elementIdType: typeof elementId,
      connecting, 
      connectingType: typeof connecting,
      elements: elements.map(e => ({ id: e.id, type: e.type, idType: typeof e.id }))
    });
    
    if (connecting) {
      // Complete connection
      if (String(connecting) !== String(elementId)) {
        const newConnection: Connection = {
          id: generateUniqueId(),
          from: connecting,
          to: elementId
        };
        console.log('[Canvas] Creating connection:', {
          newConnection,
          fromElement: elements.find(e => String(e.id) === String(connecting)),
          toElement: elements.find(e => String(e.id) === String(elementId))
        });
        setConnections(prev => [...prev, newConnection]);
      }
      setConnecting(null);
    } else {
      // Start connection - preserve the original ID type
      console.log('[Canvas] Starting connection from:', elementId);
      setConnecting(elementId);
    }
  }, [connecting, setConnections, setConnecting, elements]);

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
    const newZoom = Math.min(scaleX, scaleY, 0.5); // Don't zoom in beyond our new 100% (0.5)
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    const newX = rect.width / 2 - centerX * newZoom;
    const newY = rect.height / 2 - centerY * newZoom;
    
    setViewport({ x: newX, y: newY, zoom: newZoom });
  }, [elements]);

  // Reset zoom to 100% (which is 0.5 in our recalibrated system)
  const handleResetZoom = useCallback(() => {
    setViewport({ x: 0, y: 0, zoom: 0.5 });
  }, [setViewport]);

  // Connection preview path
  const connectionPreview = useMemo(() => {
    if (!connecting) return null;
    
    const fromElement = elements.find(el => String(el.id) === String(connecting));
    if (!fromElement) return null;
    
    // Calculate connection point position based on element type
    let fromX, fromY;
    if (fromElement.type === 'chat') {
      // Chat elements have connection point on the left
      fromX = fromElement.x - 8;
      fromY = fromElement.y + fromElement.height / 2;
    } else {
      // Content and text elements have connection point on the right
      fromX = fromElement.x + fromElement.width + 8;
      fromY = fromElement.y + fromElement.height / 2;
    }
    
    const toX = mousePos.x;
    const toY = mousePos.y;
    
    const distance = Math.abs(toX - fromX);
    const controlPointOffset = Math.min(distance * 0.5, 100);
    
    return `M ${fromX} ${fromY} C ${fromX + controlPointOffset} ${fromY}, ${toX - controlPointOffset} ${toY}, ${toX} ${toY}`;
  }, [connecting, elements, mousePos]);

  return (
    <div 
      ref={canvasRef}
      className={`flex-1 relative overflow-hidden transition-colors duration-200 ${
        connecting ? 'cursor-crosshair' : ''
      }`}
      style={{ backgroundColor: isDarkMode ? darkModeColors.dark : darkModeColors.light }}
      data-canvas="true"
      tabIndex={0}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseDown={(e) => {
        // Prevent default for middle mouse button
        if (e.button === 1) {
          e.preventDefault();
        }
      }}
      onFocus={(e) => {
        // Ensure canvas can receive keyboard events without scrolling
        e.currentTarget.focus({ preventScroll: true });
      }}
      onContextMenu={(e) => {
        if (connecting) {
          e.preventDefault();
          console.log('[Canvas] Right-click cancelling connection');
          setConnecting(null);
        }
      }}
    >
      {/* Canvas Background - Draggable Area */}
      <div 
        className={`absolute inset-0 canvas-background ${
          connecting !== null ? 'cursor-crosshair' : 
          isCanvasDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleCanvasClick}
        style={{
          // Figma-style multi-level grid system
          ...(() => {
            const baseGrid = 8; // Base grid matching what was at 140%
            let gridSize = baseGrid;
            let dotOpacity = 1;
            let dotSize = 1;
            
            // Recalibrated zoom levels - 0.5 is now our "100%" reference
            if (viewport.zoom < 0.25) {
              // Very zoomed out (50% in UI)
              gridSize = 32;
              dotOpacity = 0.5;
              dotSize = 0.8;
            } else if (viewport.zoom < 0.4) {
              // Zoomed out (60-80% in UI)
              gridSize = 16;
              dotOpacity = 0.8;
              dotSize = 1;
            } else if (viewport.zoom < 0.6) {
              // Normal range (80-120% in UI) - this is our sweet spot
              gridSize = 8; // Same as what was at 140%
              dotOpacity = 1;
              dotSize = 1.2;
            } else if (viewport.zoom < 0.8) {
              // Slightly zoomed in (120-160% in UI)
              gridSize = 6;
              dotOpacity = 1;
              dotSize = 1;
            } else {
              // Zoomed in (160-200% in UI)
              gridSize = 4;
              dotOpacity = 0.9;
              dotSize = 0.8;
            }
            
            const scaledGrid = gridSize / viewport.zoom;
            
            return {
              backgroundImage: `radial-gradient(circle, ${
                isDarkMode 
                  ? `rgba(255, 255, 255, ${0.15 * dotOpacity})` 
                  : `rgba(0, 0, 0, ${0.15 * dotOpacity})`
              } ${dotSize}px, transparent ${dotSize}px)`,
              backgroundSize: `${scaledGrid}px ${scaledGrid}px`,
              backgroundPosition: `${(viewport.x % scaledGrid)}px ${(viewport.y % scaledGrid)}px`,
              backgroundColor: isDarkMode ? darkModeColors.dark : darkModeColors.light,
              // Performance optimizations - no transitions during drag
              transition: isCanvasDragging ? 'none' : 'background-color 0.2s ease-out',
              // GPU acceleration
              willChange: isCanvasDragging ? 'background-position' : 'auto',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)', // Force GPU acceleration
              // Disable expensive effects when dragging or at high zoom
              filter: (isCanvasDragging || viewport.zoom > 1.5) ? 'none' : undefined,
              imageRendering: viewport.zoom > 1.5 ? 'pixelated' : 'auto' // Sharper dots at high zoom
            };
          })()
        }}
      />
      
      {/* Alignment Guides */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
        <AlignmentGuides guides={activeGuides} viewport={viewport} />
      </div>
      
      {/* Canvas Elements */}
      <div 
        style={{
          transform: `translate(${isFinite(viewport.x) ? viewport.x : 0}px, ${isFinite(viewport.y) ? viewport.y : 0}px) scale(${Math.max(0.1, viewport.zoom)})`,
          transformOrigin: '0 0',
          zIndex: 10, // Ensure elements and connections are above guides
          willChange: renderQuality.willChange,
          backfaceVisibility: 'hidden', // Prevent flicker
          perspective: 1000, // Enable hardware acceleration
          imageRendering: renderQuality.imageRendering as React.CSSProperties['imageRendering'],
          // GPU optimization for high zoom levels
          ...(viewport.zoom > 0.75 ? {
            transform3d: 'translateZ(0)',
            WebkitTransform3d: 'translateZ(0)',
            contain: 'layout style paint',
            pointerEvents: isDraggingElement ? 'none' : 'auto'
          } : {}),
          // Use large fixed dimensions to allow elements to be placed anywhere
          position: 'absolute',
          width: '20000px',
          height: '20000px',
          left: '0',
          top: '0'
        }}
        className={`pointer-events-none ${viewport.zoom > 0.75 ? 'canvas-high-zoom' : ''} ${isDraggingElement ? 'dragging' : ''}`}
      >
        
        {/* Connection Lines SVG */}
        <svg className="absolute pointer-events-none" style={{ 
          width: '20000px', 
          height: '20000px', 
          overflow: 'visible',
          left: '0',
          top: '0'
        }}>
          <defs>
            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c96442" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#c96442" stopOpacity="1" />
              <stop offset="100%" stopColor="#c96442" stopOpacity="0.3" />
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
              {/* Thicker background line for visibility */}
              <path
                d={connectionPreview}
                stroke="#c96442"
                strokeWidth="4"
                fill="none"
                strokeOpacity="0.2"
                className="pointer-events-none"
              />
              {/* Main connection line */}
              <path
                d={connectionPreview}
                stroke="#c96442"
                strokeWidth="2"
                fill="none"
                strokeDasharray="8 4"
                strokeOpacity="0.8"
                className="pointer-events-none animate-pulse"
              />
              {/* Cursor indicator */}
              <circle
                cx={mousePos.x}
                cy={mousePos.y}
                r="12"
                fill="#c96442"
                fillOpacity="0.3"
                stroke="#c96442"
                strokeWidth="2"
                className="pointer-events-none animate-pulse"
              />
              <circle
                cx={mousePos.x}
                cy={mousePos.y}
                r="4"
                fill="#c96442"
                className="pointer-events-none"
              />
            </g>
          )}
        </svg>

        
        {/* Render Elements - Only visible ones for performance */}
        {visibleElements.map((element) => {
          const uniqueKey = `${element.type}-${element.id}-${element.x || 0}-${element.y || 0}`;
          
          if (element.type === 'content') {
            return (
              <ContentElement
                key={`content-${element.id}`}
                element={element}
                selected={selectedElementIds.some(id => String(id) === String(element.id))}
                connecting={connecting}
                connections={connections}
                onSelect={(el, event) => handleElementSelect(el, event)}
                onUpdate={handleElementUpdate}
                onDelete={handleElementDelete}
                onConnectionStart={handleConnectionStart}
                onOpenAnalysisPanel={onOpenAnalysisPanel}
                onReanalyze={handleReanalysis}
                onDragEnd={() => {
                  setIsDraggingElement(false);
                  clearGuides();
                }}
                onResizeStart={() => {
                  setIsResizingElement(true);
                }}
                onResizeEnd={() => {
                  setIsResizingElement(false);
                  clearGuides();
                }}
              />
            );
          } else if (element.type === 'chat') {
            return (
              <ChatElement
                key={`chat-${element.id}`}
                element={element}
                selected={selectedElementIds.some(id => String(id) === String(element.id))}
                connecting={connecting}
                connections={connections}
                allElements={elements}
                onSelect={(el, event) => handleElementSelect(el, event)}
                onUpdate={handleElementUpdate}
                onDelete={handleElementDelete}
                onConnectionStart={handleConnectionStart}
                onDragEnd={() => {
                  setIsDraggingElement(false);
                  clearGuides();
                }}
                onResizeStart={() => {
                  setIsResizingElement(true);
                }}
                onResizeEnd={() => {
                  setIsResizingElement(false);
                  clearGuides();
                }}
              />
            );
          } else if (element.type === 'text') {
            return (
              <TextComponent
                key={`text-${element.id}`}
                element={element}
                selected={selectedElementIds.some(id => String(id) === String(element.id))}
                connecting={connecting}
                connections={connections}
                onSelect={handleElementSelect}
                onUpdate={handleElementUpdate}
                onDelete={handleElementDelete}
                onConnectionStart={handleConnectionStart}
                onDragEnd={() => {
                  setIsDraggingElement(false);
                  clearGuides();
                }}
                onResizeStart={() => {
                  setIsResizingElement(true);
                }}
                onResizeEnd={() => {
                  setIsResizingElement(false);
                  clearGuides();
                }}
              />
            );
          }
          
          // Fallback for any other element types
          return null;
        })}
      </div>
      
      {/* Connection Mode Indicator */}
      {connecting !== null && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Click another element to connect or press ESC to cancel</span>
        </div>
      )}

      {/* Top-Right Controls - Credit Counter and Dark Mode Toggle */}
      <div className={`fixed top-4 right-4 h-12 rounded-lg shadow-lg z-50 flex items-center px-4 gap-3 transition-colors duration-200`}
        style={{
          backgroundColor: isDarkMode ? '#202a37' : '#ffffff'
        }}>
        <CreditCounter />
        <div className={`h-6 w-px ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
        <DarkModeToggle />
      </div>


      {/* Bottom-Right Canvas Controls */}
      <div className="fixed bottom-4 right-4 flex gap-2 z-50">
        {/* Fit to Screen and Reset Zoom buttons */}
        <div className={`rounded-lg shadow-lg p-1 flex gap-1 transition-colors duration-200`}
          style={{
            backgroundColor: isDarkMode ? '#202a37' : '#ffffff'
          }}>
          <button 
            onClick={handleFitToScreen}
            className={`px-2 py-1 rounded text-xs font-medium outline-none focus:outline-none transition-colors ${
              isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
            }`}
            title="Fit to Screen"
          >
            Fit to Screen
          </button>
          <button 
            onClick={handleResetZoom}
            className={`px-2 py-1 rounded text-xs font-medium outline-none focus:outline-none transition-colors ${
              isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
            }`}
            title="Reset View"
          >
            Reset View
          </button>
        </div>
        
        {/* Zoom percentage and +/- controls */}
        <div className={`rounded-lg shadow-lg p-1 flex gap-1 items-center transition-colors duration-200`}
          style={{
            backgroundColor: isDarkMode ? '#202a37' : '#ffffff'
          }}>
          <span className={`px-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {Math.round(viewport.zoom * 200)}%
          </span>
          <button 
            onClick={() => setViewport({ ...viewport, zoom: Math.min(1, viewport.zoom * 1.2) })}
            className={`p-1 rounded outline-none focus:outline-none transition-colors ${
              isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
            }`}
            title="Zoom In"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button 
            onClick={() => setViewport({ ...viewport, zoom: Math.max(0.25, viewport.zoom * 0.8) })}
            className={`p-1 rounded outline-none focus:outline-none transition-colors ${
              isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
            }`}
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

