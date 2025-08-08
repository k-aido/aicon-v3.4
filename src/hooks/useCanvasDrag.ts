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
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - currentPosition.x,
      y: e.clientY - currentPosition.y
    });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    onDragMove({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
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