import { useState, useRef, useCallback, useEffect } from 'react';
import { Position } from '@/types';
import { throttle } from '@/utils/performance';

interface UseOptimizedElementDragProps {
  elementId: string | number;
  initialPosition: Position;
  onUpdate: (id: string | number, position: Position) => void;
  onSelect: (event?: React.MouseEvent) => void;
  onDragEnd?: () => void;
  viewport: { zoom: number };
}

/**
 * Optimized hook for element dragging with performance improvements for high zoom levels
 * Uses CSS transforms and throttled updates for smooth 60fps performance
 */
export const useOptimizedElementDrag = ({
  elementId,
  initialPosition,
  onUpdate,
  onSelect,
  onDragEnd,
  viewport
}: UseOptimizedElementDragProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localPosition, setLocalPosition] = useState<Position>(initialPosition);
  
  // Refs for drag state that don't trigger re-renders
  const dragState = useRef({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    currentX: 0,
    currentY: 0
  });
  
  const elementRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create throttled update function based on zoom level
  const throttledUpdate = useCallback(
    throttle((id: string | number, position: Position) => {
      onUpdate(id, position);
    }, viewport.zoom > 0.75 ? 32 : 16), // Lower frequency at high zoom
    [onUpdate, viewport.zoom]
  );

  // Update local position when element position changes externally
  useEffect(() => {
    setLocalPosition(initialPosition);
    if (!isDragging && elementRef.current) {
      // Apply transform directly to DOM when not dragging
      elementRef.current.style.transform = `translate(${initialPosition.x}px, ${initialPosition.y}px)`;
    }
  }, [initialPosition.x, initialPosition.y, isDragging]);

  // Animation frame update function
  const updatePosition = useCallback(() => {
    if (elementRef.current && isDragging) {
      // Apply transform directly to DOM for smooth movement
      elementRef.current.style.transform = `translate(${dragState.current.currentX}px, ${dragState.current.currentY}px)`;
      
      // At high zoom levels, use will-change for better performance
      if (viewport.zoom > 0.75) {
        elementRef.current.style.willChange = 'transform';
      }
    }
  }, [isDragging, viewport.zoom]);

  // Global mouse move handler with optimization
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    // Calculate new position
    const newX = dragState.current.initialX + (e.clientX - dragState.current.startX);
    const newY = dragState.current.initialY + (e.clientY - dragState.current.startY);
    
    // Update drag state
    dragState.current.currentX = newX;
    dragState.current.currentY = newY;
    
    // Update local position state for reactive updates
    setLocalPosition({ x: newX, y: newY });
    
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Schedule DOM update
    animationFrameRef.current = requestAnimationFrame(updatePosition);
    
    // Use throttled update for position changes at high zoom
    if (viewport.zoom > 0.75) {
      throttledUpdate(elementId, { x: newX, y: newY });
    } else {
      // Direct update at lower zoom levels
      onUpdate(elementId, { x: newX, y: newY });
    }
  }, [isDragging, updatePosition, elementId, onUpdate, throttledUpdate, viewport.zoom]);

  // Global mouse up handler
  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Cancel any pending animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Clear any pending timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Reset will-change
    if (elementRef.current) {
      elementRef.current.style.willChange = 'auto';
    }
    
    // Update React state with final position
    const finalPosition = {
      x: dragState.current.currentX,
      y: dragState.current.currentY
    };
    
    setLocalPosition(finalPosition);
    onUpdate(elementId, finalPosition);
    
    // Remove global dragging class
    document.body.classList.remove('dragging');
    
    // Call onDragEnd if provided
    if (onDragEnd) {
      onDragEnd();
    }
  }, [isDragging, elementId, onUpdate, onDragEnd]);

  // Mouse down handler
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Check if the target is an interactive element that should not trigger drag
    const target = e.target as HTMLElement;
    
    // Direct interactive elements
    if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'SELECT') {
      return;
    }
    
    // Check for data-no-drag but only on the direct element
    if (target.hasAttribute('data-no-drag')) {
      return;
    }
    
    // Check if clicking inside a button or other interactive element
    if (target.closest('button, input, textarea, select, [role="button"]')) {
      return;
    }
    
    e.stopPropagation();
    e.preventDefault();
    
    onSelect(e);
    setIsDragging(true);
    
    // Initialize drag state
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: localPosition.x,
      initialY: localPosition.y,
      currentX: localPosition.x,
      currentY: localPosition.y
    };
    
    // Add global dragging class for cursor
    document.body.classList.add('dragging');
    
    // Set pointer-events for performance
    if (elementRef.current) {
      elementRef.current.style.pointerEvents = 'none';
    }
  }, [onSelect, localPosition]);

  // Set up and clean up global event listeners
  useEffect(() => {
    if (isDragging) {
      // Add passive listeners for better performance
      const options = { passive: true };
      
      // Add listeners to window for global tracking
      window.addEventListener('mousemove', handleMouseMove, options);
      window.addEventListener('mouseup', handleMouseUp);
      
      // Also listen for mouse leave on document
      const handleMouseLeave = (e: MouseEvent) => {
        // Only trigger if mouse actually leaves the window
        if (e.clientY <= 0 || e.clientX <= 0 || 
            e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
          handleMouseUp();
        }
      };
      
      document.addEventListener('mouseleave', handleMouseLeave);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('mouseleave', handleMouseLeave);
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        // Reset pointer-events
        if (elementRef.current) {
          elementRef.current.style.pointerEvents = 'auto';
        }
        
        // Ensure dragging class is removed
        document.body.classList.remove('dragging');
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Store element ref callback
  const setElementRef = useCallback((el: HTMLDivElement | null) => {
    elementRef.current = el;
    
    // Apply initial transform
    if (el) {
      el.style.transform = `translate(${localPosition.x}px, ${localPosition.y}px)`;
    }
  }, [localPosition]);

  return {
    isDragging,
    localPosition,
    handleMouseDown,
    setElementRef
  };
};