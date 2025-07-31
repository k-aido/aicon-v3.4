import { useState, useRef, useCallback, useEffect } from 'react';
import { Position } from '@/types';

interface UseElementDragProps {
  elementId: number;
  initialPosition: Position;
  onUpdate: (id: number, position: Position) => void;
  onSelect: (event?: React.MouseEvent) => void;
}

/**
 * Custom hook for handling element dragging with smooth 60fps updates
 * Uses requestAnimationFrame and CSS transforms for optimal performance
 */
export const useElementDrag = ({
  elementId,
  initialPosition,
  onUpdate,
  onSelect
}: UseElementDragProps) => {
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
  const animationFrameRef = useRef<number>();

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
    }
  }, [isDragging]);

  // Global mouse move handler
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    // Calculate new position
    const newX = dragState.current.initialX + (e.clientX - dragState.current.startX);
    const newY = dragState.current.initialY + (e.clientY - dragState.current.startY);
    
    // Update drag state
    dragState.current.currentX = newX;
    dragState.current.currentY = newY;
    
    // Update local position state immediately for reactive updates
    setLocalPosition({ x: newX, y: newY });
    
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Schedule DOM update
    animationFrameRef.current = requestAnimationFrame(updatePosition);
    
    // Notify parent about position change during drag for real-time connection updates
    onUpdate(elementId, { x: newX, y: newY });
  }, [isDragging, updatePosition, elementId, onUpdate]);

  // Global mouse up handler
  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Cancel any pending animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
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
  }, [isDragging, elementId, onUpdate]);

  // Mouse down handler
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
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
  }, [onSelect, localPosition]);

  // Set up and clean up global event listeners
  useEffect(() => {
    if (isDragging) {
      // Add listeners to window for global tracking
      window.addEventListener('mousemove', handleMouseMove);
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
        
        // Ensure dragging class is removed
        document.body.classList.remove('dragging');
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Store element ref callback
  const setElementRef = useCallback((el: HTMLDivElement | null) => {
    elementRef.current = el;
  }, []);

  return {
    isDragging,
    localPosition,
    handleMouseDown,
    setElementRef
  };
};