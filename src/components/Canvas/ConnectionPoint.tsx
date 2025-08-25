import React, { useState } from 'react';
import { Plus } from 'lucide-react';

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
  const [isHovered, setIsHovered] = useState(false);
  
  const positionClasses = {
    left: '-left-8 top-1/2 -translate-y-1/2',
    right: '-right-8 top-1/2 -translate-y-1/2',
    top: 'left-1/2 -top-8 -translate-x-1/2',
    bottom: 'left-1/2 -bottom-8 -translate-x-1/2'
  };

  return (
    <div 
      data-connection-point="true"
      className={`absolute ${positionClasses[position]} w-6 h-6 rounded-full cursor-pointer transition-all flex items-center justify-center pointer-events-auto ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      } ${
        isHovered 
          ? 'bg-[#c96442] scale-110' 
          : 'bg-white border-2 border-[#c96442]'
      }`}
      style={{ 
        boxShadow: isHovered 
          ? '0 2px 8px rgba(201, 100, 66, 0.6)' 
          : '0 2px 4px rgba(201, 100, 66, 0.3)',
        zIndex: 50 
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
    >
      {isHovered && (
        <Plus className="w-3 h-3 text-white pointer-events-none" strokeWidth={3} />
      )}
    </div>
  );
});