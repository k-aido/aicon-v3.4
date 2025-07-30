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
}

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
  className = ''
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const resizeRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartSize({ width, height });
    
    document.body.style.cursor = 'se-resize';
    document.body.style.userSelect = 'none';
  }, [width, height]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startPos.x;
    const deltaY = e.clientY - startPos.y;
    
    let newWidth = startSize.width + deltaX;
    let newHeight = startSize.height + deltaY;
    
    // Apply constraints
    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth || window.innerWidth));
    newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight || window.innerHeight));
    
    onResize(newWidth, newHeight);
  }, [isResizing, startPos, startSize, minWidth, minHeight, maxWidth, maxHeight, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
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

  return (
    <div
      ref={resizeRef}
      className={`relative ${className}`}
      style={{ width, height }}
    >
      {children}
      
      {/* Resize Handle */}
      {showHandle && (
        <div
          data-resize-handle
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 hover:opacity-100 transition-opacity"
          onMouseDown={handleMouseDown}
          style={{
            background: 'linear-gradient(-45deg, transparent 30%, #8b5cf6 30%, #8b5cf6 70%, transparent 70%)',
            borderRadius: '0 0 4px 0'
          }}
        />
      )}
    </div>
  );
};