import React from 'react';

interface ConnectionPointProps {
  position: 'left' | 'right' | 'top' | 'bottom';
  isVisible: boolean;
  onClick: (e: React.MouseEvent) => void;
}

/**
 * Connection point component that appears on element edges
 */
export const ConnectionPoint: React.FC<ConnectionPointProps> = React.memo(({
  position,
  isVisible,
  onClick
}) => {
  const positionClasses = {
    left: '-left-8 top-1/2 -translate-y-1/2',
    right: '-right-8 top-1/2 -translate-y-1/2',
    top: 'left-1/2 -top-8 -translate-x-1/2',
    bottom: 'left-1/2 -bottom-8 -translate-x-1/2'
  };

  return (
    <div 
      className={`absolute ${positionClasses[position]} w-4 h-4 bg-[#1e8bff] rounded-full cursor-pointer hover:bg-[#1a7ae5] hover:scale-110 transition-all shadow-lg flex items-center justify-center z-20 opacity-100`}
      onClick={onClick}
      style={{ boxShadow: '0 2px 6px rgba(30, 139, 255, 0.4)' }}
    >
      <div className="w-1.5 h-1.5 bg-white rounded-full" />
    </div>
  );
});