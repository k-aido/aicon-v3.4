import { useState, useRef, useCallback, useEffect } from 'react';
import { Position } from '@/types';

interface UseCanvasDragProps {
  onDragMove: (position: Position) => void;
  onDragEnd?: () => void;
}

/**
 * Custom hook for handling canvas dragging functionality
 */
export const useCanvasDrag = ({ onDragMove, onDragEnd }: UseCanvasDragProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent, currentPosition: Position) => {
    console.log('[useCanvasDrag] handleMouseDown called:', {
      clientX: e.clientX,
      clientY: e.clientY,
      currentPosition,
      dragStartWillBe: {
        x: e.clientX - currentPosition.x,
        y: e.clientY - currentPosition.y
      }
    });
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - currentPosition.x,
      y: e.clientY - currentPosition.y
    });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newPosition = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };
    console.log('[useCanvasDrag] Mouse move while dragging:', {
      clientX: e.clientX,
      clientY: e.clientY,
      dragStart,
      newPosition
    });
    onDragMove(newPosition);
  }, [isDragging, dragStart, onDragMove]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onDragEnd?.();
    }
  }, [isDragging, onDragEnd]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    isDragging,
    handleMouseDown
  };
};