import { useState, useRef, useCallback, useEffect } from 'react';
import { Position } from '@/types';
import { throttle } from '@/utils/performance';

interface UseOptimizedCanvasDragProps {
  onDragMove: (position: Position) => void;
  onDragEnd?: () => void;
  throttleMs?: number;
}

/**
 * Optimized canvas drag hook with throttled updates
 */
export const useOptimizedCanvasDrag = ({ 
  onDragMove, 
  onDragEnd,
  throttleMs = 16 // ~60fps
}: UseOptimizedCanvasDragProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<Position>({ x: 0, y: 0 });
  const frameRef = useRef<number | undefined>(undefined);
  
  // Use requestAnimationFrame for smooth updates
  const rafUpdate = useCallback((position: Position) => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    
    frameRef.current = requestAnimationFrame(() => {
      onDragMove(position);
    });
  }, [onDragMove]);

  // Throttled drag handler for better performance
  const throttledDragMove = useRef(
    throttle((x: number, y: number) => {
      rafUpdate({ x, y });
    }, throttleMs)
  ).current;

  const handleMouseDown = useCallback((e: React.MouseEvent, currentPosition: Position) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - currentPosition.x,
      y: e.clientY - currentPosition.y
    };
    
    // Set cursor style globally
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    
    throttledDragMove(newX, newY);
  }, [isDragging, throttledDragMove]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      
      // Cancel any pending animation frame
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      
      // Reset cursor
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      onDragEnd?.();
    }
  }, [isDragging, onDragEnd]);

  // Effect for adding/removing event listeners
  useEffect(() => {
    if (isDragging) {
      // Use capture phase for better performance
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseup', handleMouseUp);
      
      // Prevent text selection during drag
      const preventSelection = (e: Event) => e.preventDefault();
      document.addEventListener('selectstart', preventSelection);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('selectstart', preventSelection);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return {
    isDragging,
    handleMouseDown
  };
};