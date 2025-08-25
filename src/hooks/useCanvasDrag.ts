import { useState, useRef, useCallback, useEffect } from 'react';
import { Position } from '@/types';

interface UseCanvasDragProps {
  onDragMove: (position: Position) => void;
  onDragEnd?: () => void;
  isSpacePressed?: boolean;
}

/**
 * Custom hook for handling canvas dragging functionality (Miro-style)
 * Optimized with requestAnimationFrame for smooth 60fps updates
 */
export const useCanvasDrag = ({ onDragMove, onDragEnd, isSpacePressed = false }: UseCanvasDragProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const lastPositionRef = useRef<Position>({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent, currentPosition: Position) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - currentPosition.x,
      y: e.clientY - currentPosition.y
    });
    // Reset last position on drag start
    lastPositionRef.current = currentPosition;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Schedule update on next animation frame for smooth 60fps
    animationFrameRef.current = requestAnimationFrame(() => {
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      
      // Only update if position actually changed
      if (newPosition.x !== lastPositionRef.current.x || newPosition.y !== lastPositionRef.current.y) {
        onDragMove(newPosition);
        lastPositionRef.current = newPosition;
      }
    });
  }, [isDragging, dragStart, onDragMove]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      // Clean up any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setIsDragging(false);
      onDragEnd?.();
    }
  }, [isDragging, onDragEnd]);

  useEffect(() => {
    if (isDragging) {
      // Use passive event listeners for better scroll performance
      const options = { passive: true };
      document.addEventListener('mousemove', handleMouseMove, options);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        // Clean up animation frame on unmount
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    isDragging,
    handleMouseDown
  };
};