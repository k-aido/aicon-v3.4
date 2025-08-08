import React, { useState, useRef } from 'react';

export default function TestResize() {
  const [size, setSize] = useState({ width: 300, height: 200 });
  const elementRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const startResize = (e: React.MouseEvent) => {
    console.log('🔴 RESIZE CLICKED!', {
      target: e.target,
      currentTarget: e.currentTarget,
      pageX: e.pageX,
      pageY: e.pageY
    });
    
    // Flash red background to show click registered
    const handle = e.currentTarget as HTMLElement;
    handle.style.backgroundColor = '#ef4444';
    setTimeout(() => {
      handle.style.backgroundColor = '';
    }, 100);
    
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    
    const startX = e.pageX;
    const startY = e.pageY;
    const startWidth = size.width;
    const startHeight = size.height;

    const doDrag = (e: MouseEvent) => {
      if (!isResizing.current) return;
      
      const deltaX = e.pageX - startX;
      const deltaY = e.pageY - startY;
      
      const newWidth = startWidth + deltaX;
      const newHeight = startHeight + deltaY;
      
      console.log('🟡 DRAGGING:', { 
        deltaX, 
        deltaY, 
        newWidth, 
        newHeight,
        pageX: e.pageX,
        pageY: e.pageY
      });
      
      setSize({
        width: Math.max(100, newWidth),
        height: Math.max(100, newHeight)
      });
    };

    const stopDrag = () => {
      console.log('🟢 RESIZE STOPPED!', {
        finalWidth: size.width,
        finalHeight: size.height
      });
      isResizing.current = false;
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
    document.body.style.cursor = 'se-resize';
  };

  return (
    <div
      ref={elementRef}
      className="relative bg-white border-4 border-red-500 shadow-2xl"
      style={{ 
        width: size.width, 
        height: size.height,
        zIndex: 10000
      }}
    >
      <div className="p-4">
        <div className="font-bold text-red-600">TEST RESIZE BOX</div>
        <div className="text-lg font-mono text-gray-700">
          {size.width} x {size.height}
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Click and drag the red square in bottom-right corner
        </div>
      </div>
      <div
        className="absolute bottom-0 right-0 w-10 h-10 bg-red-500 cursor-se-resize hover:bg-red-600 active:bg-red-700 border-2 border-white"
        onMouseDown={startResize}
        style={{ 
          zIndex: 10001,
          boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
        }}
        title="Drag to resize"
      >
        <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="white">
          <path d="M21,15 L15,21 M21,10 L10,21 M21,5 L5,21" stroke="white" strokeWidth="2"/>
        </svg>
      </div>
    </div>
  );
}