import React, { useEffect, useState } from 'react';

export const DebugOverlay: React.FC = () => {
  const [clickCount, setClickCount] = useState(0);
  const [lastClick, setLastClick] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isResizeHandle = target.closest('[data-resize-handle]') || 
                            target.classList.contains('resize-handle') ||
                            target.closest('.resize-handle');
      
      if (isResizeHandle) {
        console.log('🎯 DEBUG: Resize handle clicked!', {
          target,
          classList: target.classList.toString(),
          dataset: target.dataset
        });
      }
      
      setClickCount(prev => prev + 1);
      setLastClick({ x: e.pageX, y: e.pageY });
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return (
    <div className="fixed top-4 left-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs font-mono z-[9999]">
      <div>Click Count: {clickCount}</div>
      {lastClick && (
        <div>Last Click: ({lastClick.x}, {lastClick.y})</div>
      )}
      <div className="mt-2 text-yellow-300">
        Looking for resize handles...
      </div>
    </div>
  );
};