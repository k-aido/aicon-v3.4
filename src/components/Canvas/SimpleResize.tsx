import React, { useState, useRef, useCallback, useEffect } from 'react';

interface SimpleResizeProps {
  children: React.ReactNode;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  onResize: (width: number, height: number) => void;
  showHandle?: boolean;
  className?: string;
  maintainAspectRatio?: boolean;
}

type ResizeDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const SimpleResize: React.FC<SimpleResizeProps> = ({
  children,
  width,
  height,
  minWidth = 100,
  minHeight = 100,
  maxWidth,
  maxHeight,
  onResize,
  showHandle = false,
  className = '',
  maintainAspectRatio = false
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const initialAspectRatio = useRef(width / height);
  const resizeRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((direction: ResizeDirection) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeDirection(direction);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartSize({ width, height });
    initialAspectRatio.current = width / height;
    
    // Set appropriate cursor based on direction
    const cursorMap: Record<ResizeDirection, string> = {
      'nw': 'nw-resize',
      'n': 'n-resize',
      'ne': 'ne-resize',
      'e': 'e-resize',
      'se': 'se-resize',
      's': 's-resize',
      'sw': 'sw-resize',
      'w': 'w-resize'
    };
    
    document.body.style.cursor = cursorMap[direction];
    document.body.style.userSelect = 'none';
  }, [width, height]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeDirection) return;

    const deltaX = e.clientX - startPos.x;
    const deltaY = e.clientY - startPos.y;
    
    let newWidth = startSize.width;
    let newHeight = startSize.height;
    
    // Calculate new dimensions based on resize direction
    switch (resizeDirection) {
      case 'se':
        newWidth = startSize.width + deltaX;
        newHeight = startSize.height + deltaY;
        break;
      case 'e':
        newWidth = startSize.width + deltaX;
        break;
      case 's':
        newHeight = startSize.height + deltaY;
        break;
      case 'sw':
        newWidth = startSize.width - deltaX;
        newHeight = startSize.height + deltaY;
        break;
      case 'w':
        newWidth = startSize.width - deltaX;
        break;
      case 'nw':
        newWidth = startSize.width - deltaX;
        newHeight = startSize.height - deltaY;
        break;
      case 'n':
        newHeight = startSize.height - deltaY;
        break;
      case 'ne':
        newWidth = startSize.width + deltaX;
        newHeight = startSize.height - deltaY;
        break;
    }
    
    // Maintain aspect ratio if shift key is pressed or maintainAspectRatio prop is true
    if (e.shiftKey || maintainAspectRatio) {
      const aspectRatio = initialAspectRatio.current;
      
      // For corner handles, maintain aspect ratio
      if (['nw', 'ne', 'sw', 'se'].includes(resizeDirection)) {
        // Determine which dimension changed more
        const widthChange = Math.abs(newWidth - startSize.width);
        const heightChange = Math.abs(newHeight - startSize.height);
        
        if (widthChange > heightChange) {
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = newHeight * aspectRatio;
        }
      }
    }
    
    // Apply constraints
    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth || window.innerWidth));
    newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight || window.innerHeight));
    
    onResize(newWidth, newHeight);
  }, [isResizing, resizeDirection, startPos, startSize, minWidth, minHeight, maxWidth, maxHeight, onResize, maintainAspectRatio]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    setResizeDirection(null);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleStyle = {
    position: 'absolute' as const,
    opacity: showHandle ? 1 : 0,
    transition: 'opacity 0.2s',
    background: '#1e8bff',
    borderRadius: '2px',
  };

  const cornerHandleStyle = {
    ...handleStyle,
    width: '8px',
    height: '8px',
  };

  const edgeHandleStyle = {
    ...handleStyle,
    background: 'transparent',
  };

  return (
    <div
      ref={resizeRef}
      className={`relative ${className}`}
      style={{ width, height }}
    >
      {children}
      
      {/* Resize Handles - All 8 directions */}
      {showHandle && (
        <>
          {/* Corner handles */}
          <div
            data-resize-handle
            className="hover:opacity-100"
            style={{
              ...cornerHandleStyle,
              top: -4,
              left: -4,
              cursor: 'nw-resize',
            }}
            onMouseDown={handleMouseDown('nw')}
          />
          <div
            data-resize-handle
            className="hover:opacity-100"
            style={{
              ...cornerHandleStyle,
              top: -4,
              right: -4,
              cursor: 'ne-resize',
            }}
            onMouseDown={handleMouseDown('ne')}
          />
          <div
            data-resize-handle
            className="hover:opacity-100"
            style={{
              ...cornerHandleStyle,
              bottom: -4,
              right: -4,
              cursor: 'se-resize',
              background: 'linear-gradient(-45deg, transparent 30%, #1e8bff 30%, #1e8bff 70%, transparent 70%)',
              width: '12px',
              height: '12px',
            }}
            onMouseDown={handleMouseDown('se')}
          />
          <div
            data-resize-handle
            className="hover:opacity-100"
            style={{
              ...cornerHandleStyle,
              bottom: -4,
              left: -4,
              cursor: 'sw-resize',
            }}
            onMouseDown={handleMouseDown('sw')}
          />
          
          {/* Edge handles */}
          <div
            data-resize-handle
            className="hover:bg-[#1e8bff]/20"
            style={{
              ...edgeHandleStyle,
              top: 0,
              left: '20%',
              right: '20%',
              height: '4px',
              cursor: 'n-resize',
            }}
            onMouseDown={handleMouseDown('n')}
          />
          <div
            data-resize-handle
            className="hover:bg-[#1e8bff]/20"
            style={{
              ...edgeHandleStyle,
              bottom: 0,
              left: '20%',
              right: '20%',
              height: '4px',
              cursor: 's-resize',
            }}
            onMouseDown={handleMouseDown('s')}
          />
          <div
            data-resize-handle
            className="hover:bg-[#1e8bff]/20"
            style={{
              ...edgeHandleStyle,
              left: 0,
              top: '20%',
              bottom: '20%',
              width: '4px',
              cursor: 'w-resize',
            }}
            onMouseDown={handleMouseDown('w')}
          />
          <div
            data-resize-handle
            className="hover:bg-[#1e8bff]/20"
            style={{
              ...edgeHandleStyle,
              right: 0,
              top: '20%',
              bottom: '20%',
              width: '4px',
              cursor: 'e-resize',
            }}
            onMouseDown={handleMouseDown('e')}
          />
        </>
      )}
    </div>
  );
};