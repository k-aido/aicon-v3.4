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
      data-connection-point="true"
      className={`absolute ${positionClasses[position]} w-5 h-5 bg-[#E1622B] rounded-full cursor-pointer hover:bg-[#c93d14] hover:scale-125 transition-all shadow-lg flex items-center justify-center pointer-events-auto ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{ 
        boxShadow: '0 2px 6px rgba(225, 98, 43, 0.4)',
        zIndex: 50 
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
    >
      <div className="w-2 h-2 bg-white rounded-full pointer-events-none" />
    </div>
  );
});